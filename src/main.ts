import "./style.css";
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
import { activityUI, briefingUI, endingUI, esc, exploreUI, huntUI, journalUI, momentUI, pauseUI, playUI, responseUI, restartUI, titleUI, chips } from "./ui";

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
let audio: AudioContext | undefined;
function cue(kind: "soft" | "choice" | "find" | "chapter" | "done" = "soft") {
  if (!sound) return;
  try {
    audio ??= new AudioContext();
    void audio.resume();
    const t = audio.currentTime;
    const notes = { soft: [523.25, 659.25], choice: [392, 493.88, 587.33], find: [783.99, 1046.5], chapter: [392, 523.25, 659.25, 783.99], done: [523.25, 659.25, 783.99, 1046.5] }[kind];
    notes.forEach((f, i) => {
      const o = audio!.createOscillator(),
        g = audio!.createGain();
      o.type = i % 2 ? "triangle" : "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t + i * 0.08);
      g.gain.linearRampToValueAtTime(0.035, t + i * 0.08 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.08 + 0.5);
      o.connect(g);
      g.connect(audio!.destination);
      o.start(t + i * 0.08);
      o.stop(t + i * 0.08 + 0.52);
    });
  } catch {}
}

function prefs(extra: Record<string, unknown> = {}) {
  try {
    localStorage.setItem("choice-of-life-settings", JSON.stringify({ sound, reduced, pace, largeText, closeups, graphics, kiteAssist, ...extra }));
  } catch {}
  world.reducedMotion = reduced;
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
  if (panel === "moment" && activeMoment) return momentUI(state, activeMoment);
  if (panel === "response") return responseUI(response.title, response.text, response.effect, state, response.note, response.who);
  if (panel === "activity") return activityUI(state, { active: !!kite, assist: kiteAssist });
  if (panel === "briefing") return briefingUI(state, firstBriefing && state.chapter === 0);
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
function openMoment(m: Moment, placeId: string) {
  activeMoment = m;
  focusId = placeId;
  panel = "moment";
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
      cue();
      render(true);
      return;
    }
    if (side) return openMoment(side, place.id);
    const waiting = mine.find((m) => m.kind === "side" && !Object.hasOwn(l.done, m.id));
    if (waiting && freeTime(l) === 0) {
      toast(`<b>${esc(personName(who, l))}</b> waves. You've no free time left in this chapter.`);
      return;
    }
    toast(`<b>${esc(personName(who, l))}:</b> ${esc(people[who]?.bark(l) ?? "")}`);
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
      return;
    }
    panel = "briefing";
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
    toast(`<b>${esc(d.name)}</b> — ${esc(d.line)} <span class="chips inline">${chips(m.effect, state)}</span>`);
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
    toast(`<b>Found: ${esc(item.name)}</b> — ${esc(item.line)}`);
    refreshHud();
  }
}

function activityResult() {
  const m = state.memories.at(-1)!;
  const a = chapterOf(state).activity;
  response = { title: a.keepsake, text: m.text, effect: m.effect, note: "A new keepsake is in your journal. Later chapters will remember it.", who: undefined };
  panel = "response";
  cue("done");
  render(true);
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
    cue("choice");
    if (m.id === "c12.last" && state.facts.final === "free") world.releaseKite();
    render(true);
    world.acknowledge();
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
    else if (panel === "none") panel = "briefing";
    render(true);
    save();
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
  panel = "briefing";
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
        panel = saved.complete ? "none" : "briefing";
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
    case "briefing":
      panel = action;
      save();
      render(true);
      break;
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
  if (panel === "moment" && /^[1-5]$/.test(event.key) && activeMoment) {
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
