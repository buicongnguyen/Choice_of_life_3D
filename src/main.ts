import "./style.css";
import "./conversation.css";
import { World, type Place } from "./world";
import { graphicsQuality, type GraphicsQuality } from "./graphics";
import { KiteGame } from "./kite-game";
import { chapters, people, text, kiteColours, resolveWho, personName, type Moment, type KiteGrade } from "./content";
import {
  SAVE_KEY,
  LEGACY_SAVE_KEY,
  act,
  canLeave,
  canTalk,
  chapterOf,
  freeTime,
  mainDone,
  momentsOf,
  newLife,
  parseLife,
  record,
  serialise,
  talkAction,
  visibleOptions,
  type Identity,
  type Life,
} from "./core";
import { activityUI, briefingUI, endingUI, esc, exploreUI, huntUI, journalUI, momentUI, pauseUI, playUI, responseUI, restartUI, titleUI, chips, statInfo, bondName, type BeatState } from "./ui";
import { beats, wordCount } from "./beats";
import { cue, blip, voicePitch, setAmbience, setEnabled, stopAmbience } from "./audio";
import { BONDS, STATS } from "./core";
import type { Effect } from "./content";

const ui = document.querySelector<HTMLElement>("#ui")!;
const host = document.querySelector<HTMLElement>("#world")!;
const announcer = document.querySelector<HTMLElement>("#announcer")!;
type Panel = "none" | "moment" | "response" | "activity" | "briefing" | "explore" | "journal" | "pause" | "restart";

// ---------------------------------------------------------------------------
// persistent state
// ---------------------------------------------------------------------------
let saved: Life | null = null,
  storageIssue = false,
  invalidSave = false,
  legacy = false;
try {
  const raw = localStorage.getItem(SAVE_KEY);
  saved = parseLife(raw);
  invalidSave = !!raw && !saved;
  legacy = !!localStorage.getItem(LEGACY_SAVE_KEY);
} catch {
  storageIssue = true;
}
let identity: Identity = saved?.identity ?? { name: "You", skin: 1, hair: 3, colour: 1 };
let state: Life = saved ?? newLife(identity);
let mode: "title" | "play" | "ending" = "title";
let panel: Panel = "none";
let activeMoment: Moment | null = null;
let focusId: string | null = null;
let response = { title: "", text: "", effect: {}, note: "", who: undefined as string | undefined };
let journalTab = "people";
/** The beat shown in the open dialog, reply or chapter intro. */
let beat: BeatState = { list: [{ text: "" }], index: 0 };
let briefingReopened = false;
let beatShownAt = 0;
let beatKey = "";
let blipTimers: number[] = [];
let makeOpen = !saved && innerWidth > 760;
let padPointer: number | null = null;
let loading = true,
  loadError = "",
  ready = false,
  busy = false,
  notice = "",
  firstBriefing = true;
let sound = false,
  largeText = false,
  closeups = true,
  pace = "normal",
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches,
  kiteAssist = false;
const phone = matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) <= 900;
let graphics: GraphicsQuality = graphicsQuality(undefined, phone);
try {
  const stored = JSON.parse(localStorage.getItem("choice-of-life-settings") ?? "{}");
  sound = stored.sound === true;
  largeText = stored.largeText === true;
  closeups = stored.closeups !== false;
  kiteAssist = stored.kiteAssist === true;
  graphics = graphicsQuality(stored.graphics, phone);
  pace = ["gentle", "normal", "brisk"].includes(stored.pace) ? stored.pace : "normal";
  reduced = typeof stored.reduced === "boolean" ? stored.reduced : reduced;
  const draft = stored.setupDraft;
  if (!saved && draft && typeof draft.name === "string") identity = { ...identity, ...draft };
} catch {}

let world: World;
try {
  world = new World(host, graphics);
} catch {
  ui.innerHTML = '<main class="error"><h1>Your browser could not open the 3D world.</h1><p>Try an up-to-date browser with hardware acceleration enabled.</p><button onclick="location.reload()">Try again</button></main>';
  throw new Error("WebGL unavailable");
}

// ---------------------------------------------------------------------------
// small services
// ---------------------------------------------------------------------------
function prefs(extra: Record<string, unknown> = {}) {
  try {
    localStorage.setItem("choice-of-life-settings", JSON.stringify({ sound, reduced, pace, largeText, closeups, graphics, kiteAssist, ...extra }));
  } catch {}
  world.reducedMotion = reduced;
  setEnabled(sound);
  world.speed = pace === "gentle" ? 2.3 : pace === "normal" ? 2.9 : 3.6;
  document.body.classList.toggle("reduced", reduced);
  document.body.classList.toggle("large-text", largeText);
  document.body.dataset.graphics = graphics;
}
prefs();

const saveText = () => (storageIssue ? "Saving unavailable · keep this tab open" : "● Saved");
function save(updatePosition = true) {
  if (mode === "title") return;
  if (updatePosition && !loading) state.position = { x: world.playerPosition.x, z: world.playerPosition.z };
  try {
    localStorage.setItem(SAVE_KEY, serialise(state));
    saved = state;
    storageIssue = false;
  } catch {
    storageIssue = true;
  }
  const el = ui.querySelector("#save-status");
  if (el) el.textContent = saveText();
}

let toastTimer = 0;
function toast(message: string, ms = 5200) {
  notice = message;
  announcer.textContent = message.replace(/<[^>]+>/g, "");
  const el = ui.querySelector("#toast");
  if (el) {
    el.innerHTML = message;
    el.classList.remove("show");
    void (el as HTMLElement).offsetWidth;
    el.classList.add("show");
  }
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    notice = "";
    ui.querySelector("#toast")?.classList.remove("show");
  }, ms);
}

/** Apply an action; returns true if the rules accepted it. */
function perform(action: string) {
  const next = act(state, action);
  if (next === state) return false;
  state = next;
  if (action === "next") {
    // A new chapter starts at its own spawn; the next scene isn't built yet, so don't refresh it.
    save(false);
  } else {
    world.update(state);
    save();
  }
  return true;
}

// ---------------------------------------------------------------------------
// rendering
// ---------------------------------------------------------------------------
let kite: KiteGame | null = null;
let renderedPanel: Panel = "none";
let returnFocus: string | undefined;

function panelUI() {
  if (panel === "moment" && activeMoment) return momentUI(state, activeMoment, beat);
  if (panel === "response") return responseUI(response.title, beat, response.text, response.effect, state, response.note, response.who);
  if (panel === "activity") return activityUI(state, { active: !!kite, assist: kiteAssist });
  if (panel === "briefing") return briefingUI(state, firstBriefing && state.chapter === 0, beat, briefingReopened);
  if (panel === "explore") return exploreUI(world.places());
  if (panel === "journal") return journalUI(state, journalTab);
  if (panel === "pause") return pauseUI({ storage: storageIssue, graphics, largeText, reduced, sound, closeups });
  if (panel === "restart") return restartUI();
  return "";
}

function render(focus = false) {
  const focusedAction = (document.activeElement as HTMLElement | null)?.dataset?.action;
  const focusedValue = (document.activeElement as HTMLElement | null)?.dataset?.value;
  const opening = panel !== "none" && renderedPanel === "none";
  const closing = panel === "none" && renderedPanel !== "none";
  if (opening) returnFocus = focusedAction;
  document.body.dataset.mode = mode;
  document.body.dataset.panel = panel;
  const screen =
    mode === "title"
      ? titleUI({ saved, identity, loading, loadError, legacy, invalid: invalidSave, storage: storageIssue, pace, graphics, sound, reduced, makeOpen })
      : mode === "ending"
        ? endingUI(state)
        : playUI(state, { hunt: huntUI(state), notice, saveStatus: saveText() });
  const loadingCover = mode === "play" && loading ? '<div class="cover" role="status"><span class="spinner"></span>Turning the page…</div>' : "";
  const errorCover = mode === "play" && loadError ? `<div class="cover"><p>${esc(loadError)}</p><button class="primary" data-action="retry">Try again</button></div>` : "";
  ui.innerHTML = `<div class="screen" ${panel !== "none" ? "inert" : ""}>${screen}</div>${panelUI()}${loadingCover}${errorCover}`;
  if (notice && mode === "play") ui.querySelector("#toast")?.classList.add("show");
  world.active = mode === "play" && panel === "none" && !loading && !loadError && !document.hidden;
  world.clearInput();
  padPointer = null;
  world.focus(closeups && ["moment", "response", "activity"].includes(panel) ? focusId : null);
  world.hideMarkers = panel === "briefing";
  layoutWorld();
  if (mode === "play") nearby(world.nearest());
  if (panel === "activity") mountKite();
  else unmountKite();
  if (focus || opening || closing || focusedAction) {
    const action = closing ? returnFocus : !focus && !opening ? focusedAction : undefined;
    const same = action && focusedValue && action === focusedAction ? `[data-value="${CSS.escape(focusedValue)}"]` : "";
    const button = action ? (ui.querySelector<HTMLElement>(`[data-action="${CSS.escape(action)}"]${same}:not(:disabled)`) ?? ui.querySelector<HTMLElement>(`[data-action="${CSS.escape(action)}"]:not(:disabled)`)) : null;
    const target = (button && !button.closest("[inert]") ? button : null) ?? ui.querySelector<HTMLElement>('[role="dialog"] h2') ?? (mode !== "play" ? ui.querySelector<HTMLElement>("h1") : null);
    target?.focus({ preventScroll: true });
  }
  renderedPanel = panel;
  startBeat();
}

// ---------------------------------------------------------------------------
// beats: long text arrives a few lines at a time, with a soft voice while it appears
// ---------------------------------------------------------------------------
const WORD_MS = 34;
const beatPanels = ["moment", "response", "briefing"];
function setBeats(list: { text: string; memory?: boolean }[]) {
  beat = { list: list.length ? list : [{ text: "" }], index: 0 };
  beatKey = "";
}
const textBeats = (t: string) => beats(t).map((x) => ({ text: x }));
const lastBeat = () => beat.index >= beat.list.length - 1;
function speaker() {
  if (panel === "moment" && activeMoment) return personName(activeMoment.who, state);
  if (panel === "response") return response.who ? personName(response.who, state) : "narrator";
  return "narrator";
}
function stopBlips() {
  blipTimers.forEach((t) => clearTimeout(t));
  blipTimers = [];
}
function startBeat() {
  if (!beatPanels.includes(panel)) {
    stopBlips();
    beatKey = "";
    return;
  }
  const key = `${panel}:${beat.index}:${beat.list[beat.index]?.text}`;
  if (key === beatKey) return;
  beatKey = key;
  beatShownAt = performance.now();
  stopBlips();
  if (reduced || !sound || panel === "briefing") return;
  const pitch = voicePitch(speaker());
  const n = wordCount(beat.list[beat.index]?.text ?? "");
  for (let i = 0; i < n; i += 2) blipTimers.push(window.setTimeout(() => blip(pitch), i * WORD_MS));
}
function revealing() {
  if (reduced) return false;
  return performance.now() - beatShownAt < wordCount(beat.list[beat.index]?.text ?? "") * WORD_MS + 250;
}
function focusBeat() {
  const el =
    ui.querySelector<HTMLElement>('[role="dialog"] [data-action="choose"]:not(:disabled)') ??
    ui.querySelector<HTMLElement>('[role="dialog"] .beat:not(.last)') ??
    ui.querySelector<HTMLElement>('[role="dialog"] [data-action="close"].primary') ??
    ui.querySelector<HTMLElement>('[role="dialog"] h2');
  el?.focus({ preventScroll: true });
}
/** Click, Space or Enter: finish the line that is appearing, or move to the next one. */
function advanceBeat(all = false) {
  if (!all && revealing()) {
    ui.querySelector(".beat")?.classList.add("done");
    beatShownAt = 0;
    stopBlips();
    return;
  }
  if (lastBeat()) return;
  beat = { ...beat, index: all ? beat.list.length - 1 : beat.index + 1 };
  render();
  focusBeat();
}

// ---------------------------------------------------------------------------
// juice: rewards float up from your character; small talk appears as speech bubbles
// ---------------------------------------------------------------------------
const pops = document.querySelector<HTMLElement>("#pops")!;
function popRewards(effect: Effect, who = "you") {
  const at = world.screenOf(who);
  if (!at) return;
  const items: { cls: string; label: string }[] = [];
  for (const k of STATS) if (effect[k]) items.push({ cls: `${k} ${effect[k]! < 0 ? "down" : ""}`, label: `${statInfo[k].icon} ${effect[k]! > 0 ? "+" : ""}${effect[k]}` });
  for (const b of BONDS) if (effect[b]) items.push({ cls: `bond ${effect[b]! < 0 ? "down" : ""}`, label: `${effect[b]! > 0 ? "❤" : "💔"} ${bondName(b, state)} ${effect[b]! > 0 ? "+" : ""}${effect[b]}` });
  items.forEach((it, i) => {
    const el = document.createElement("div");
    el.className = `pop ${it.cls}`;
    el.textContent = it.label;
    el.style.left = `${at.x}px`;
    el.style.top = `${at.y - i * 34}px`;
    el.style.animationDelay = `${i * 120}ms`;
    pops.append(el);
    setTimeout(() => el.remove(), 2400 + i * 120);
  });
  if (!reduced && BONDS.some((b) => (effect[b] ?? 0) > 0)) {
    cue("heart");
    for (let i = 0; i < 9; i++) {
      const h = document.createElement("div");
      h.className = "burst";
      h.textContent = "❤";
      const a = (i / 9) * Math.PI * 2;
      h.style.left = `${at.x}px`;
      h.style.top = `${at.y + 24}px`;
      h.style.setProperty("--dx", `${Math.cos(a) * (60 + Math.random() * 40)}px`);
      h.style.setProperty("--dy", `${Math.sin(a) * (40 + Math.random() * 30) - 40}px`);
      pops.append(h);
      setTimeout(() => h.remove(), 1300);
    }
  }
}
function bubble(who: string, html: string, ms = 4800) {
  pops.querySelectorAll(`.bubble[data-who="${CSS.escape(who)}"]`).forEach((b) => b.remove());
  const el = document.createElement("div");
  el.className = "bubble";
  el.dataset.who = who;
  el.innerHTML = html;
  pops.append(el);
  announcer.textContent = el.textContent ?? "";
  const until = performance.now() + ms;
  const follow = () => {
    const at = world.screenOf(who, 0.7);
    if (!el.isConnected) return;
    if (!at || performance.now() > until || mode !== "play") return el.remove();
    el.style.left = `${at.x}px`;
    el.style.top = `${at.y}px`;
    requestAnimationFrame(follow);
  };
  follow();
}
function ambience() {
  if (!sound) return stopAmbience();
  if (mode === "play") setAmbience(chapterOf(state).env, chapterOf(state).scene);
  else if (mode === "title") setAmbience("festival", "pier");
  else setAmbience("dusk", "clifftop");
}

function layoutWorld() {
  const dialog = ui.querySelector<HTMLElement>(".dialog");
  world.setInset(mode === "play" && dialog ? Math.max(0, innerHeight - dialog.getBoundingClientRect().top) : 0);
}
new ResizeObserver(layoutWorld).observe(document.body);

function nearby(place?: Place) {
  const button = ui.querySelector<HTMLButtonElement>("#interact");
  if (!button) return;
  button.disabled = !place;
  const label = button.querySelector("#interact-label");
  if (!label) return;
  if (!place) label.textContent = "Look around";
  else if (place.kind === "person") label.textContent = place.who === "you" ? "Fly the last kite" : place.status === "guest" ? `Meet ${place.label}` : `Talk to ${place.label}`;
  else label.textContent = place.label;
}

function refreshHud() {
  if (mode !== "play" || panel !== "none") return render();
  // Replace only the HUD pieces so a held key or a walking route survives.
  const fresh = document.createElement("div");
  fresh.innerHTML = playUI(state, { hunt: huntUI(state), notice, saveStatus: saveText() });
  for (const sel of [".stats", ".quest", ".hunt", ".hud-bottom"]) {
    const now = ui.querySelector(sel),
      next = fresh.querySelector(sel);
    if (now && next) now.replaceWith(next);
    else if (!now && next) ui.querySelector(".screen")?.insertBefore(next, ui.querySelector("#toast"));
    else if (now && !next) now.remove();
  }
  nearby(world.nearest());
}

// ---------------------------------------------------------------------------
// kite game
// ---------------------------------------------------------------------------
function mountKite() {
  const canvas = ui.querySelector<HTMLCanvasElement>("#kite-canvas");
  if (!canvas || kite) return;
  const a = chapterOf(state).activity;
  kite = new KiteGame(canvas, {
    colour: `#${kiteColours[state.facts.kite ?? "red"].hex}`,
    wind: a.wind ?? 1,
    assist: kiteAssist,
    reduced,
    onProgress: (p) => {
      const t = ui.querySelector("#kite-time"),
        s = ui.querySelector("#kite-score");
      if (t) t.textContent = `${Math.ceil(p.left)}s`;
      if (s) s.textContent = `In the band: ${Math.round(p.score * 100)}%`;
    },
    onDone: (g) => finishKite(g),
  });
}
function unmountKite() {
  kite?.dispose();
  kite = null;
}
function finishKite(grade: KiteGrade) {
  unmountKite();
  if (!perform(`kite:${grade}`)) return;
  activityResult();
}

// ---------------------------------------------------------------------------
// the story flow
// ---------------------------------------------------------------------------
function openBriefing(reopened = false) {
  panel = "briefing";
  briefingReopened = reopened;
  setBeats(textBeats(text(chapterOf(state).intro, state)));
}

function openMoment(m: Moment, placeId: string) {
  activeMoment = m;
  focusId = placeId;
  panel = "moment";
  const ctx = m.context?.(state);
  setBeats([...textBeats(text(m.prompt, state)), ...(ctx ? [{ text: ctx, memory: true }] : [])]);
  cue();
  render(true);
}

function interact(place: Place) {
  if (mode !== "play" || panel !== "none" || loading || busy) return;
  const l = state;
  if (place.kind === "person" && place.who) {
    const who = place.who;
    const mine = momentsOf(l).filter((m) => (m.who === "you" ? who === "you" : resolveWho(m.who, l) === who));
    const main = mine.find((m) => m.kind === "main" && canTalk(l, m));
    const side = mine.find((m) => m.kind === "side" && canTalk(l, m));
    const guests = chapterOf(l).guests ?? [];
    if (main) return openMoment(main, place.id);
    if (guests.includes(who) && !l.meetings.includes(who)) {
      perform(`meet:${who}`);
      response = { title: personName(who, l), text: people[who].meet ?? people[who].bark(l), effect: {}, note: mainDone(l) ? "Friendship is a good beginning, whatever you decided on the roof." : "Go back to Rowan whenever you're ready to talk about it.", who };
      focusId = place.id;
      panel = "response";
      setBeats(textBeats(response.text));
      cue();
      render(true);
      return;
    }
    if (side) return openMoment(side, place.id);
    const waiting = mine.find((m) => m.kind === "side" && !Object.hasOwn(l.done, m.id));
    if (waiting && freeTime(l) === 0) {
      bubble(who, "👋 <small>Another time?</small>", 3000);
      toast("You've no free time left in this chapter.");
      return;
    }
    bubble(who, esc(people[who]?.bark(l) ?? ""));
    return;
  }
  if (place.kind === "activity") {
    focusId = place.id;
    panel = "activity";
    render(true);
    return;
  }
  if (place.kind === "exit" && canLeave(l)) {
    const last = l.chapter === chapters.length - 1;
    perform("next");
    cue("chapter");
    if (last || state.complete) {
      mode = "ending";
      panel = "none";
      save(false);
      render(true);
      ambience();
      return;
    }
    openBriefing();
    firstBriefing = false;
    void showChapter();
  }
}

function collect(place: Place) {
  if (mode !== "play" || panel !== "none" || loading || busy) return;
  if (place.kind === "discovery") {
    if (!perform(`find:${place.index}`)) return;
    const d = chapterOf(state).finds[place.index];
    const m = state.memories.at(-1)!;
    cue("find");
    toast(`<b>${esc(d.name)}</b> <span class="chips inline">${chips(m.effect, state)}</span><br><small>${esc(d.line)}</small>`, 3600);
    popRewards(m.effect);
    refreshHud();
  } else if (place.kind === "hunt") {
    if (!perform(`hunt:${place.index}`)) return;
    const a = chapterOf(state).activity;
    const item = a.items![place.index];
    cue("find");
    if (record(state).complete) {
      activityResult();
      return;
    }
    toast(`<b>Found: ${esc(item.name)}</b><br><small>${esc(item.line)}</small>`, 3600);
    refreshHud();
  }
}

function activityResult() {
  const m = state.memories.at(-1)!;
  const a = chapterOf(state).activity;
  response = { title: a.keepsake, text: m.text, effect: m.effect, note: "A new keepsake is in your journal.", who: undefined };
  panel = "response";
  setBeats(textBeats(response.text));
  cue("done");
  render(true);
  popRewards(m.effect);
}

function choose(index: number) {
  const m = activeMoment;
  if (!m || busy) return;
  busy = true;
  try {
    const before = state;
    if (!perform(talkAction(m.id, index))) return;
    const mem = state.memories.at(-1)!;
    const free = freeTime(state);
    const note =
      m.kind === "main"
        ? state.chapter === chapters.length - 1
          ? "Walk to the golden gate when you're ready to see your story."
          : free > 0 && chapterOf(state).free < 50
            ? `The golden gate is open. You still have ${free} hour${free === 1 ? "" : "s"} of free time.`
            : "The golden gate is open."
        : chapterOf(state).free > 50
          ? "There's time today for everyone who came."
          : free > 0
          ? `${free} hour${free === 1 ? "" : "s"} of free time left.`
          : mainDone(state)
            ? "That was the last of your free time. The golden gate is open."
            : "That was the last of your free time. The main story is still waiting.";
    response = { title: text(m.title, before), text: mem.detail, effect: mem.effect, note, who: m.who };
    panel = "response";
    setBeats(textBeats(response.text));
    cue("choice");
    if (m.id === "c12.last" && state.facts.final === "free") world.releaseKite();
    render(true);
    world.acknowledge();
    popRewards(mem.effect);
  } finally {
    busy = false;
  }
}

async function showChapter() {
  loading = true;
  loadError = "";
  render();
  try {
    await world.show(state);
    loading = false;
    mode = state.complete ? "ending" : "play";
    if (state.complete) panel = "none";
    else if (panel === "none") openBriefing();
    render(true);
    save();
    ambience();
  } catch (err) {
    loading = false;
    loadError = "This chapter could not load. Your life is safe — try again.";
    console.error(err);
    render();
  }
}

async function begin() {
  state = newLife(identity);
  saved = null;
  invalidSave = false;
  openBriefing();
  firstBriefing = true;
  mode = "play";
  await showChapter();
  cue("chapter");
}

// ---------------------------------------------------------------------------
// events
// ---------------------------------------------------------------------------
world.onInteract = interact;
world.onCollect = collect;
world.onNearby = nearby;
world.onPosition = () => save();

ui.addEventListener("click", async (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
  if (!target || target.hasAttribute("disabled") || busy) return;
  if (target.closest("[inert]")) return;
  const action = target.dataset.action!;
  if (loading && !["retry", "sound", "motion"].includes(action)) return;
  switch (action) {
    case "start":
      if (saved || invalidSave) {
        panel = "restart";
        render(true);
      } else await begin();
      break;
    case "new-confirm":
      await begin();
      break;
    case "continue":
      if (saved) {
        state = saved;
        if (saved.complete) panel = "none";
        else openBriefing();
        firstBriefing = false;
        mode = "play";
        await showChapter();
      }
      break;
    case "retry":
      if (!ready) void boot();
      else await showChapter();
      break;
    case "hair":
    case "skin":
    case "colour":
      identity = { ...identity, [action]: Number(target.dataset.value) };
      prefs({ setupDraft: identity });
      void world.dressTitle(identity);
      render();
      break;
    case "sound":
      sound = !sound;
      prefs();
      cue();
      ambience();
      if (mode === "play" && panel === "none") refreshHud();
      else render();
      break;
    case "motion":
      reduced = !reduced;
      prefs();
      render();
      break;
    case "text-size":
      largeText = !largeText;
      prefs();
      render();
      break;
    case "closeups":
      closeups = !closeups;
      prefs();
      render();
      break;
    case "interact":
      world.interact();
      break;
    case "close":
      panel = mode === "play" || panel !== "restart" ? "none" : "none";
      activeMoment = null;
      render();
      break;
    case "pause":
    case "journal":
    case "explore":
      panel = action;
      save();
      render(true);
      break;
    case "briefing":
      openBriefing(true);
      save();
      render(true);
      break;
    case "beat":
      advanceBeat();
      break;
    case "beat-all":
      advanceBeat(true);
      break;
    case "beat-go": {
      const i = Number(target.dataset.value);
      if (Number.isInteger(i) && i >= 0 && i < beat.list.length && i !== beat.index) {
        beat = { ...beat, index: i };
        render();
        focusBeat();
      }
      break;
    }
    case "tab":
      journalTab = target.dataset.tab ?? "people";
      render();
      ui.querySelector<HTMLElement>(`[data-tab="${journalTab}"]`)?.focus();
      break;
    case "title":
      save();
      mode = "title";
      panel = "none";
      render(true);
      ambience();
      void world.showTitle(identity);
      break;
    case "choose":
      choose(Number(target.dataset.index));
      break;
    case "task-start":
      if (perform("start")) {
        const a = chapterOf(state).activity;
        cue();
        if (a.kind === "hunt") {
          panel = "none";
          render();
          toast(`<b>${esc(text(a.title, state))}</b> — follow the golden beams.`);
        } else render(true);
      }
      break;
    case "task-plan":
      if (perform(`plan:${target.dataset.step}`)) render(true);
      break;
    case "task-undo":
      if (perform("unplan")) render(true);
      break;
    case "task-commit":
      if (perform("commit")) activityResult();
      break;
    case "kite-skip":
      finishKite("steady");
      break;
    case "kite-assist":
      kiteAssist = !kiteAssist;
      prefs();
      unmountKite();
      render();
      break;
    case "travel": {
      const id = target.dataset.place!;
      panel = "none";
      render();
      if (!world.go(id)) toast("That path is blocked. Try walking around.");
      break;
    }
  }
});

ui.addEventListener("pointerdown", (e) => {
  const t = (e.target as HTMLElement).closest<HTMLElement>('[data-action="kite-hold"]');
  if (t && kite) {
    e.preventDefault();
    kite.hold(true);
    const up = () => {
      kite?.hold(false);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }
});

ui.addEventListener("change", (event) => {
  const input = event.target as HTMLInputElement;
  if (input.name === "graphics") {
    const next = graphicsQuality(input.value, phone);
    if (next === graphics) return;
    save();
    graphics = next;
    prefs({ setupDraft: mode === "title" ? identity : undefined });
    location.reload();
    return;
  }
  if (input.name === "pace") {
    pace = input.value;
    prefs();
  }
});
// Remember whether "Make it yours" is open so re-rendering the title never collapses it.
ui.addEventListener(
  "toggle",
  (event) => {
    const d = event.target as HTMLDetailsElement;
    if (d.classList?.contains("make")) makeOpen = d.open;
  },
  true,
);
ui.addEventListener("input", (event) => {
  const input = event.target as HTMLInputElement;
  if (input.name === "name") {
    identity = { ...identity, name: input.value.trim().slice(0, 24) || "You" };
    prefs({ setupDraft: identity });
  }
});

ui.addEventListener("pointerdown", (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("[data-pad]");
  if (!target || !world.active || padPointer !== null) return;
  event.preventDefault();
  padPointer = event.pointerId;
  const [x, y] = target.dataset.pad!.split(",").map(Number);
  target.setPointerCapture(event.pointerId);
  world.pad(x, y);
});
for (const ev of ["pointerup", "pointercancel", "lostpointercapture"] as const)
  ui.addEventListener(ev, (event) => {
    if (event.pointerId !== padPointer) return;
    padPointer = null;
    world.pad(0, 0);
  });

const movement = new Set(["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
window.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target instanceof HTMLElement && event.target.matches("input,select,textarea")) return;
  if (event.key === "Tab" && panel !== "none") {
    const items = [...ui.querySelectorAll<HTMLElement>('[role="dialog"] button:not(:disabled),[role="dialog"] select,[role="dialog"] summary,[role="dialog"] input')];
    const first = items[0],
      last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || !items.includes(document.activeElement as HTMLElement))) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !items.includes(document.activeElement as HTMLElement))) {
      event.preventDefault();
      first?.focus();
    }
    return;
  }
  if (event.key === "Escape" && mode === "play") {
    event.preventDefault();
    if (panel === "activity" && kite) return;
    panel = panel === "none" ? "pause" : "none";
    activeMoment = null;
    save();
    render(true);
    return;
  }
  if (beatPanels.includes(panel) && (event.key === " " || event.key === "Enter") && !event.repeat) {
    const el = document.activeElement as HTMLElement | null;
    const onOtherButton = el?.matches("button,summary,select,input") && !el.matches(".beat");
    if (!onOtherButton && (!lastBeat() || revealing())) {
      event.preventDefault();
      advanceBeat();
      return;
    }
  }
  if (panel === "moment" && /^[1-5]$/.test(event.key) && activeMoment) {
    if (!lastBeat()) advanceBeat(true);
    const opts = visibleOptions(state, activeMoment);
    const pick = opts[Number(event.key) - 1];
    if (pick) {
      event.preventDefault();
      const b = ui.querySelector<HTMLButtonElement>(`[data-action="choose"][data-index="${pick[1]}"]`);
      if (b && !b.disabled) choose(pick[1]);
    }
    return;
  }
  if (mode !== "play" || panel !== "none" || loading) return;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (movement.has(key)) {
    event.preventDefault();
    world.key(key, true);
  }
  if (key === "j" && !event.repeat) {
    panel = "journal";
    render(true);
  }
  if ((key === "e" || (event.key === " " && !(event.target instanceof HTMLButtonElement))) && !event.repeat) {
    event.preventDefault();
    world.interact();
  }
});
window.addEventListener("keyup", (event) => world.key(event.key.length === 1 ? event.key.toLowerCase() : event.key, false));

function suspend() {
  world.clearInput();
  save();
  if (mode === "play" && panel === "none" && !loading) {
    panel = "pause";
    render();
  }
}
window.addEventListener("blur", suspend);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) suspend();
});
window.addEventListener("pagehide", () => save());

async function boot() {
  loading = true;
  loadError = "";
  render();
  try {
    await world.init();
    await world.showTitle(identity);
    ready = true;
    loading = false;
    render();
    ambience();
  } catch (err) {
    loading = false;
    loadError = "Kitehaven could not load. Check your connection and try again.";
    console.error(err);
    render();
  }
}
void boot();

// Read-only diagnostics for the release checks; there is no cheat API.
Object.defineProperty(window, "lifeDiagnostics", {
  get: () => ({
    mode,
    panel,
    loading,
    chapter: state.chapter,
    complete: state.complete,
    free: freeTime(state),
    used: state.used,
    done: Object.keys(state.done).length,
    found: state.found.length,
    memories: state.memories.length,
    activity: record(state),
    facts: { ...state.facts },
    bonds: { ...state.bonds },
    stats: { ...state.stats },
    moment: activeMoment?.id ?? null,
    render: world.diagnostics(),
  }),
});
