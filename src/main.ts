import './mobile-game-init.mjs';
import "./style.css";
import "./conversation.css";
import "./features.css";
import "./design.css";
import "./runner.css";
import { World, playerLook, type Place } from "./world";
import { planRun, bodyOf, runAction, type RunEvent, type Theme } from "./runner-core";
import { graphicsQuality, type GraphicsQuality } from "./graphics";
import { KiteGame } from "./kite-game";
import { reloadAfterSaving } from "./persistence";
import { chapters, people, text, kiteColours, resolveWho, personName, type Moment, type KiteGrade } from "./content";
import { u, pickLang, lang, type Lang, type UIKey } from "./i18n";
import { applyOverlay, type Overlay } from "./localize";
import {
  SAVE_KEY,
  LEGACY_SAVE_KEY,
  act,
  bondOf,
  canLeave,
  canRun,
  castOf,
  mainMoment,
  optionOpen,
  canTalk,
  chapterOf,
  freeTime,
  mainDone,
  momentsOf,
  newLife,
  parseLife,
  record,
  validIdentity,
  serialise,
  talkAction,
  visibleOptions,
  type Identity,
  type Life,
} from "./core";
import { runUI, activityUI, albumUI, briefingUI, customiseUI, endingUI, esc, settingsUI, exploreUI, huntUI, journalUI, momentUI, pauseUI, playUI, responseUI, restartUI, titleUI, chips, statInfo, bondName, type BeatState } from "./ui";
import { beats, wordCount } from "./beats";
import { askingMood, replyMood } from "./moods";
import { cue, blip, voicePitch, setAmbience, setEnabled, stopAmbience, setMusic, setMusicOn } from "./audio";
import { ALBUM_KEY, emptyAlbum, keepLife, noteChoices, parseAlbum, type Album } from "./album";
import { isPattern, kiteLook, paintKite, unlocked } from "./kite-art";
import { canShareFiles, saveCard, shareCard } from "./card";
import { TOWN_LINES } from "./town";
import { BONDS, STATS } from "./core";
import type { Effect } from "./content";

const ui = document.querySelector<HTMLElement>("#ui")!;
const host = document.querySelector<HTMLElement>("#world")!;
const announcer = document.querySelector<HTMLElement>("#announcer")!;
type Panel = "none" | "run" | "moment" | "response" | "activity" | "briefing" | "explore" | "journal" | "pause" | "restart" | "album" | "customise" | "settings";

// ---------------------------------------------------------------------------
// language first: saves replay their story text, so the words must be in place before
// anything is read
// ---------------------------------------------------------------------------
const SETTINGS_KEY = "choice-of-life-settings";
let stored: Record<string, unknown> = {};
try {
  stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") ?? {};
} catch {}
const LANG_PACKS: Record<Exclude<Lang, "en">, () => Promise<{ default: Overlay }>> = {
  vi: () => import("./lang/vi"),
  ko: () => import("./lang/ko"),
};
const wanted = pickLang(stored.lang);
if (wanted !== "en") {
  try {
    applyOverlay((await LANG_PACKS[wanted]()).default);
  } catch (err) {
    console.error(err);
  }
}
document.documentElement.lang = lang;
document.title = u("page.title");
document.querySelector("#world")?.setAttribute("aria-label", u("page.world"));

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
/** Where Settings returns to (it opens from the title and from Pause). */
let settingsFrom: Panel = "none";
/** A locked kite pattern the player asked about (its unlock hint shows in the workshop). */
let kiteHint = "";
let padPointer: number | null = null;
let loading = true,
  loadError = "",
  ready = false,
  busy = false,
  notice = "",
  firstBriefing = true;
let sound = false,
  music = true,
  largeText = false,
  closeups = true,
  pace = "normal",
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches,
  kiteAssist = false;
const phone = matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) <= 900;
/** Touch screens get the stick and no keyboard help. */
const touchUI = matchMedia("(pointer: coarse)").matches;
document.body.classList.toggle("touch", touchUI);
let graphics: GraphicsQuality = graphicsQuality(undefined, phone);
let album: Album = emptyAlbum();
try {
  album = parseAlbum(localStorage.getItem(ALBUM_KEY));
} catch {}
function saveAlbum() {
  try {
    localStorage.setItem(ALBUM_KEY, JSON.stringify(album));
  } catch {}
}
try {
  sound = stored.sound === true;
  music = stored.music !== false;
  largeText = stored.largeText === true;
  closeups = stored.closeups !== false;
  kiteAssist = stored.kiteAssist === true;
  graphics = graphicsQuality(stored.graphics as string | undefined, phone);
  pace = typeof stored.pace === "string" && ["gentle", "normal", "brisk"].includes(stored.pace) ? stored.pace : "normal";
  reduced = typeof stored.reduced === "boolean" ? stored.reduced : reduced;
  const draft = stored.setupDraft as Partial<Identity> | undefined;
  const drafted = { ...identity, ...draft };
  if (!saved && draft && validIdentity(drafted)) identity = drafted;
} catch {}

let world: World;
try {
  world = new World(host, graphics);
} catch {
  ui.innerHTML = `<main class="error"><h1>${u("cover.webgl")}</h1><p>${u("cover.webglHelp")}</p><button onclick="location.reload()">${u("title.retry")}</button></main>`;
  throw new Error("WebGL unavailable");
}

// ---------------------------------------------------------------------------
// small services
// ---------------------------------------------------------------------------
function prefs(extra: Record<string, unknown> = {}) {
  let persisted = true;
  try {
    // Keep the title's unsaved name/look draft unless this call replaces it.
    const setupDraft = "setupDraft" in extra ? extra.setupDraft : mode === "title" && !saved ? identity : undefined;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ sound, music, reduced, pace, largeText, closeups, graphics, kiteAssist, lang, ...extra, setupDraft }));
  } catch {
    persisted = false;
  }
  world.reducedMotion = reduced;
  setEnabled(sound);
  setMusicOn(music);
  world.speed = pace === "gentle" ? 2.3 : pace === "normal" ? 2.9 : 3.6;
  document.body.classList.toggle("reduced", reduced);
  document.body.classList.toggle("large-text", largeText);
  document.body.dataset.graphics = graphics;
  return persisted;
}
prefs();

const saveText = () => (storageIssue ? u("hud.saveUnavailable") : u("hud.saved"));
function save(updatePosition = true) {
  // Returning to the title must not hide a previous failed progress save.
  if (mode === "title") return !storageIssue;
  if (updatePosition && !loading && world.shownChapter === state.chapter) state.position = { x: world.playerPosition.x, z: world.playerPosition.z };
  try {
    localStorage.setItem(SAVE_KEY, serialise(state));
    saved = state;
    storageIssue = false;
  } catch {
    storageIssue = true;
  }
  if (noteChoices(album, state)) saveAlbum();
  const el = ui.querySelector("#save-status");
  if (el) el.textContent = saveText();
  return !storageIssue;
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
  if (panel === "briefing") return briefingUI(state, firstBriefing && state.chapter === 0, beat, briefingReopened, !briefingReopened && canRun(state) && !mainDone(state));
  if (panel === "run") return runHudUI();
  if (panel === "explore") return exploreUI(world.places(), chapterOf(state).free > 50);
  if (panel === "journal") return journalUI(state, journalTab, album, kiteHint);
  if (panel === "pause") return pauseUI({ storage: storageIssue, touch: touchUI });
  if (panel === "customise") return customiseUI(identity);
  if (panel === "settings") return settingsUI({ lang, graphics, pace, largeText, closeups, reduced, sound, music, version: __GAME_VERSION__ });
  if (panel === "restart") return restartUI();
  if (panel === "album") return albumUI(album);
  return "";
}

function render(focus = false) {
  // a run fills the screen; closing a panel over it (pause, settings) returns to it
  if (panel === "none" && world.running && mode === "play") panel = "run";
  world.runPaused = panel !== "run" || loading;
  const focusedAction = (document.activeElement as HTMLElement | null)?.dataset?.action;
  const focusedValue = (document.activeElement as HTMLElement | null)?.dataset?.value;
  const opening = panel !== "none" && renderedPanel === "none";
  const closing = panel === "none" && renderedPanel !== "none";
  if (opening) returnFocus = focusedAction;
  document.body.dataset.mode = mode;
  document.body.dataset.panel = panel;
  const screen =
    mode === "title"
      ? titleUI({ saved, loading, loadError, legacy, invalid: invalidSave, storage: storageIssue, sound, album: album.lives.length })
      : mode === "ending"
        ? endingUI(state, { canShare: canShareFiles(), album: album.lives.length > 0 })
        : playUI(state, { hunt: huntUI(state), notice, saveStatus: saveText(), sound });
  const loadingCover = mode === "play" && loading ? `<div class="cover" role="status"><span class="spinner"></span>${u("cover.loading")}</div>` : "";
  const errorCover = mode === "play" && loadError ? `<div class="cover"><p>${esc(loadError)}</p><button class="primary" data-action="retry">${u("title.retry")}</button></div>` : "";
  ui.innerHTML = `<div class="screen" ${panel !== "none" ? "inert" : ""}>${screen}</div>${panelUI()}${loadingCover}${errorCover}`;
  if (notice && mode === "play") ui.querySelector("#toast")?.classList.add("show");
  world.active = mode === "play" && panel === "none" && !loading && !loadError && !document.hidden;
  world.clearInput();
  padPointer = null;
  world.focus(closeups && ["moment", "response", "activity"].includes(panel) ? focusId : null);
  world.hideMarkers = panel === "briefing";
  if (panel === "none") world.expression(null);
  layoutWorld();
  if (mode === "play") nearby(world.nearest());
  if (panel === "activity") mountKite();
  else unmountKite();
  world.updateKite(state);
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
  setMusic(!sound ? null : mode === "play" ? state.chapter : mode === "title" ? "title" : "end");
  if (!sound) return stopAmbience();
  if (mode === "play") setAmbience(chapterOf(state).env, chapterOf(state).scene);
  else if (mode === "title") setAmbience("festival", "pier");
  else setAmbience("dusk", "clifftop");
}

function layoutWorld() {
  // Whatever covers the bottom of the screen pushes the 3D subject up into the open space:
  // a dialog in play, the customise sheet or (on tall phones) the title card on the title.
  const cover =
    mode === "play"
      ? ui.querySelector<HTMLElement>(".dialog")
      : mode === "title"
        ? (ui.querySelector<HTMLElement>(".sheet.customise") ?? (innerWidth <= 760 && innerHeight > innerWidth && panel === "none" ? ui.querySelector<HTMLElement>(".title-card") : null))
        : null;
  // Layout boxes, not the on-screen rect: sheets and dialogs slide in, and the camera should
  // frame the space they will leave free, not the space they leave mid-animation.
  const r = cover ? { top: cover.offsetTop, left: cover.offsetLeft, height: cover.offsetHeight } : null;
  // A sheet that hugs the right edge (desktop, sideways phones) covers the right; one at the bottom covers the bottom.
  const side = !!r && r.left > innerWidth * 0.35 && r.height > innerHeight * 0.6;
  world.setInset(r && !side ? Math.max(0, innerHeight - r.top) : 0, r && side ? Math.max(0, innerWidth - r.left) : 0);
}
ui.addEventListener("animationend", layoutWorld);
new ResizeObserver(layoutWorld).observe(document.body);

function nearby(place?: Place) {
  const button = ui.querySelector<HTMLButtonElement>("#interact");
  if (!button) return;
  button.disabled = !place;
  const label = button.querySelector("#interact-label");
  if (!label) return;
  if (!place) label.textContent = u("hud.lookAround");
  else if (place.kind === "person") label.textContent = place.who === "you" ? u("act.flyLast") : place.status === "guest" ? u("act.meet", { name: place.label }) : u("act.talk", { name: place.label });
  else label.textContent = place.label;
}

function refreshHud() {
  if (mode !== "play" || panel !== "none") return render();
  // Replace only the HUD pieces so a held key or a walking route survives.
  const fresh = document.createElement("div");
  fresh.innerHTML = playUI(state, { hunt: huntUI(state), notice, saveStatus: saveText(), sound });
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
  const look = kiteLook(state);
  const face = document.createElement("canvas");
  face.width = face.height = 128;
  paintKite(face.getContext("2d")!, 128, look.pattern, look.main, look.trim);
  kite = new KiteGame(canvas, {
    colour: `#${kiteColours[state.facts.kite ?? "red"].hex}`,
    face,
    wind: a.wind ?? 1,
    assist: kiteAssist,
    reduced,
    onProgress: (p) => {
      const t = ui.querySelector("#kite-time"),
        s = ui.querySelector("#kite-score");
      if (t) t.textContent = `${Math.ceil(p.left)}s`;
      if (s) s.textContent = u("actv.inBand", { n: Math.round(p.score * 100) });
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
  world.expression(placeId, askingMood(m.id));
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
      response = { title: personName(who, l), text: people[who].meet ?? people[who].bark(l), effect: {}, note: mainDone(l) ? u("note.guestAfter") : u("note.guestBefore"), who };
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
      bubble(who, u("toast.anotherTime"), 3000);
      toast(u("toast.noTime"));
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
      if (keepLife(album, state)) saveAlbum();
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
    toast(`<b>${u("toast.found", { name: esc(item.name) })}</b><br><small>${esc(item.line)}</small>`, 3600);
    refreshHud();
  }
}

function activityResult() {
  const m = state.memories.at(-1)!;
  const a = chapterOf(state).activity;
  focusId = a.who ? world.placeOf(a.who) : null;
  response = { title: a.keepsake, text: m.text, effect: m.effect, note: u("note.keepsake"), who: undefined };
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
          ? u("note.lastGate")
          : free > 0 && chapterOf(state).free < 50
            ? free === 1
              ? u("note.gateFree1")
              : u("note.gateFree", { n: free })
            : u("note.gate")
        : chapterOf(state).free > 50
          ? u("note.everyone")
          : free > 0
            ? free === 1
              ? u("note.hourLeft")
              : u("note.hoursLeft", { n: free })
            : mainDone(state)
              ? u("note.lastHourGate")
              : u("note.lastHourMain");
    response = { title: text(m.title, before), text: mem.detail, effect: mem.effect, note, who: m.who };
    panel = "response";
    setBeats(textBeats(response.text));
    cue("choice");
    if (m.id === "c12.last" && state.facts.final === "free") world.releaseKite();
    world.expression(focusId, replyMood(mem.effect));
    render(true);
    world.acknowledge();
    popRewards(mem.effect);
  } finally {
    busy = false;
  }
}

// ---------------------------------------------------------------------------
// the Life Run (docs/LIFE_RUN_PLAN.md)
// ---------------------------------------------------------------------------
const RUN_KEYS: Record<string, "left" | "right" | "jump" | "slide" | "go"> = {
  ArrowLeft: "left",
  a: "left",
  ArrowRight: "right",
  d: "right",
  ArrowUp: "jump",
  w: "jump",
  " ": "jump",
  ArrowDown: "slide",
  s: "slide",
  Enter: "go",
};
const THEMES: Record<string, Theme> = { pier: "pier", storm: "pier", nursery: "garden", gardens: "garden", cottage: "garden", clifftop: "garden" };
let runFrame = 0;
let crossEnter = false;
const runPhase = () => world.diagnostics().run?.phase ?? "";
const runGates = () =>
  visibleOptions(state, mainMoment(state)).map(([o, i]) => ({ index: i, label: text(o.label, state), open: optionOpen(state, o), why: o.need?.why }));

function runHudUI() {
  const r = world.diagnostics().run;
  return runUI(state, { phase: r?.phase ?? "run", coins: r?.coins ?? 0, sparks: r?.sparks ?? 0, hearts: r?.hearts ?? 0, stumbles: r?.stumbles ?? 0, gate: r?.gate ?? 0, touch: touchUI, gates: runGates(), enter: crossEnter });
}

async function startRun() {
  if (!canRun(state) || mainDone(state) || busy || world.running) return;
  const ch = chapterOf(state);
  // the people you love are out on the street: run past them for a high-five
  const friends = castOf(state)
    .map(([w]) => w)
    .filter((w) => bondOf(w, state))
    .slice(0, 2);
  const body = bodyOf(playerLook(state.identity, state.chapter, state).kind);
  const plan = planRun({
    seed: state.chapter * 7919 + state.log.length * 31 + 7,
    theme: THEMES[ch.scene] ?? "town",
    body,
    level: state.chapter < 3 ? 0 : state.chapter < 7 ? 1 : 2,
    friends,
    gates: runGates(),
  });
  firstBriefing = false;
  loading = true;
  panel = "run";
  render();
  try {
    await world.startRun(state, plan, friends, onRun);
  } catch (err) {
    console.error(err);
    loading = false;
    panel = "none";
    render(true);
    return;
  }
  loading = false;
  panel = "run";
  render(true);
  cue("chapter");
  cancelAnimationFrame(runFrame);
  const tick = () => {
    const r = world.diagnostics().run;
    if (!r) return;
    const bar = ui.querySelector<HTMLElement>("#run-bar");
    if (bar) bar.style.width = `${Math.min(100, (r.d / r.stop) * 100).toFixed(1)}%`;
    runFrame = requestAnimationFrame(tick);
  };
  runFrame = requestAnimationFrame(tick);
}

let calloutTimer = 0;
function callout(html: string, kind = "") {
  const el = ui.querySelector<HTMLElement>("#run-callout");
  if (!el) return;
  el.innerHTML = html;
  el.dataset.kind = kind;
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
  clearTimeout(calloutTimer);
  calloutTimer = window.setTimeout(() => el.classList.remove("show"), 1400);
}

function onRun(e: RunEvent) {
  const r = world.diagnostics().run;
  const set = (id: string, v: number) => {
    const el = ui.querySelector(`#${id}`);
    const chip = el?.parentElement;
    if (!el || !chip) return;
    el.textContent = String(v);
    chip.classList.remove("bump");
    void chip.offsetWidth;
    chip.classList.add("bump");
  };
  if (e.type === "coin" && r) set("run-coins", r.coins);
  if (e.type === "spark" && r) set("run-sparks", r.sparks);
  if (e.type === "heart" && r) {
    set("run-hearts", r.hearts);
    cue("heart");
  }
  if (e.type === "kite") {
    callout(esc(u("run.kite")), "kite");
    cue("find");
  }
  if (e.type === "hit") {
    callout(esc(u("run.stumble")), "hit");
    ui.querySelectorAll("#run-pips i").forEach((i, k) => i.classList.toggle("used", k < e.stumbles));
    cue("soft");
  }
  if (e.type === "winded") callout(esc(u("run.winded")), "hit");
  if (e.type === "highfive") {
    callout(esc(u("run.highfive", { name: personName(e.who, state) })), "friend");
    cue("heart");
  }
  if (e.type === "crossroads") {
    cue("choice");
    crossEnter = true;
    render(true);
    crossEnter = false;
  }
  if (e.type === "lane" && r?.phase === "crossroads") render();
  if (e.type === "shut") {
    const g = runGates()[e.gate];
    callout(esc(u("run.shut", { why: g?.why ?? "" })), "hit");
  }
  if (e.type === "done") void finishRun(e.choice);
}

async function finishRun(choice: number) {
  const result = world.runResult();
  cancelAnimationFrame(runFrame);
  world.endRun();
  panel = "none";
  loading = true;
  render();
  try {
    await world.show(state);
  } catch (err) {
    console.error(err);
    loadError = u("cover.chapterError");
  }
  loading = false;
  mode = "play";
  const main = mainMoment(state);
  activeMoment = main;
  focusId = world.placeOf(resolveWho(main.who, state)) ?? null;
  choose(choice);
  if (!mainDone(state)) {
    // the gate couldn't be taken after all: ask in person instead of leaving you with nothing open
    openMoment(main, focusId ?? "");
    return;
  }
  const haul = result && perform(runAction(result)) ? state.memories.at(-1) : undefined;
  if (haul?.id.startsWith("r:") && result) {
    toast(`<b>${esc(haul.title)}</b> <span class="chips inline">${chips(haul.effect, state)}</span><br><small>${esc(u("run.haul", { coins: result.coins, sparks: result.sparks, hearts: result.hearts }))}</small>`, 4200);
    popRewards(haul.effect);
  }
  ambience();
}

async function showChapter() {
  loading = true;
  loadError = "";
  render();
  try {
    await world.show(state);
    loading = false;
    mode = state.complete ? "ending" : "play";
    if (state.complete) {
      panel = "none";
      if (keepLife(album, state)) saveAlbum();
    }
    else if (panel === "none") openBriefing();
    render(true);
    save();
    ambience();
  } catch (err) {
    loading = false;
    loadError = u("cover.chapterError");
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
world.onChatter = (who) => bubble(who, esc(u(`town.${Math.floor(Math.random() * TOWN_LINES)}` as UIKey)), 3600);

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
    case "customise":
      panel = "customise";
      world.setTitleView("avatar");
      render(true);
      break;
    case "settings":
      settingsFrom = panel === "pause" ? "pause" : "none";
      panel = "settings";
      render(true);
      break;
    case "toggle": {
      const key = target.dataset.key;
      if (key === "sound") sound = !sound;
      else if (key === "music") music = !music;
      else if (key === "closeups") closeups = !closeups;
      else if (key === "reduced") reduced = !reduced;
      else break;
      prefs();
      if (key === "sound" || key === "music") {
        cue();
        ambience();
      }
      render();
      ui.querySelector<HTMLElement>(`[data-action="toggle"][data-key="${key}"]`)?.focus();
      break;
    }
    case "set": {
      const key = target.dataset.key,
        value = target.dataset.value ?? "";
      if (key === "lang") {
        const next = pickLang(value);
        if (next !== lang) reloadingSetting({ lang: next });
      } else if (key === "graphics") {
        const next = graphicsQuality(value, phone);
        if (next !== graphics) reloadingSetting({ graphics: next });
      } else if (key === "pace" && ["gentle", "normal", "brisk"].includes(value)) {
        pace = value;
        prefs();
        render();
      } else if (key === "text") {
        largeText = value === "large";
        prefs();
        render();
      }
      ui.querySelector<HTMLElement>(`[data-action="set"][data-key="${key}"][data-value="${CSS.escape(value)}"]`)?.focus();
      break;
    }
    case "kite-open":
      journalTab = "kite";
      kiteHint = "";
      panel = "journal";
      save();
      render(true);
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
      if (panel === "customise") world.setTitleView("wide");
      panel = panel === "settings" ? settingsFrom : "none";
      settingsFrom = "none";
      activeMoment = null;
      kiteHint = "";
      render(panel !== "none");
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
    case "beat-back":
      if (beat.index > 0) {
        beat = { ...beat, index: beat.index - 1 };
        render();
        focusBeat();
      }
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
      loadError = "";
      render(true);
      ambience();
      void world.showTitle(identity, saved ? kiteLook(saved) : undefined);
      break;
    case "choose":
      choose(Number(target.dataset.index));
      break;
    case "run":
      void startRun();
      break;
    case "gate": {
      // a tapped card: face that gate, and a second tap runs through it
      const i = Number(target.dataset.gate);
      const r = world.diagnostics().run;
      if (!r || !Number.isInteger(i)) break;
      if (i === r.gate) world.runInput("go", i);
      else for (let k = 0; k < 6 && (world.diagnostics().run?.gate ?? i) !== i; k++) world.runInput(i < world.diagnostics().run!.gate ? "left" : "right");
      break;
    }
    case "run-go":
      world.runInput("go");
      break;
    case "task-start":
      if (perform("start")) {
        const a = chapterOf(state).activity;
        cue();
        if (a.kind === "hunt") {
          panel = "none";
          render();
          toast(u("toast.follow", { title: `<b>${esc(text(a.title, state))}</b>` }));
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
      if (!world.go(id)) toast(u("toast.blocked"));
      break;
    }
    case "music":
      music = !music;
      prefs();
      ambience();
      render();
      break;
    case "album":
      panel = "album";
      render(true);
      break;
    case "album-clear":
      if (confirm(u("album.clearConfirm"))) {
        album = emptyAlbum();
        saveAlbum();
        panel = "none";
        render(true);
      }
      break;
    case "kite-pattern": {
      const p = target.dataset.value ?? "";
      if (isPattern(p) && !unlocked(state, p)) {
        // A locked pattern explains how to earn it instead of doing nothing.
        kiteHint = p;
        cue();
        render();
        ui.querySelector<HTMLElement>(`[data-action="kite-pattern"][data-value="${p}"]`)?.focus();
        break;
      }
      kiteHint = "";
      if (isPattern(p) && state.style.pattern !== p) {
        state = { ...state, style: { ...state.style, pattern: p } };
        cue("find");
        save(false);
        render();
      }
      break;
    }
    case "kite-trim": {
      const t = Number(target.dataset.value);
      if (Number.isInteger(t) && t >= 0 && t < 6 && state.style.trim !== t) {
        state = { ...state, style: { ...state.style, trim: t } };
        cue();
        save(false);
        render();
      }
      break;
    }
    case "card-save":
    case "card-share": {
      busy = true;
      try {
        const ok = action === "card-save" ? await saveCard(state) : await shareCard(state);
        if (ok) cue("done");
      } finally {
        busy = false;
      }
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

/** Language and graphics reload the page, and only once the life and the new setting are safe. */
function reloadingSetting(extra: Record<string, unknown>) {
  ui.querySelector("[data-reload-error]")?.remove();
  if (reloadAfterSaving(save, () => prefs({ ...extra, setupDraft: mode === "title" ? identity : undefined }), () => location.reload())) return;
  prefs(); // put the stored settings back as they were
  const warning = document.createElement("p");
  warning.className = "note warn";
  warning.dataset.reloadError = "";
  warning.setAttribute("role", "alert");
  warning.textContent = u("settings.reloadBlocked");
  ui.querySelector(".sheet-body")?.prepend(warning);
}
ui.addEventListener("input", (event) => {
  const input = event.target as HTMLInputElement;
  if (input.name === "name") {
    identity = { ...identity, name: input.value.trim().slice(0, 24) || "You" };
    prefs({ setupDraft: identity });
  }
});

// The thumb stick: press anywhere on it and drag; the knob follows your thumb, up to its rim.
function steer(stick: HTMLElement, event: PointerEvent) {
  const r = stick.getBoundingClientRect();
  const max = r.width / 2;
  let dx = event.clientX - (r.left + max),
    dy = event.clientY - (r.top + max);
  const len = Math.hypot(dx, dy);
  if (len > max) {
    dx = (dx / len) * max;
    dy = (dy / len) * max;
  }
  stick.style.setProperty("--kx", `${dx}px`);
  stick.style.setProperty("--ky", `${dy}px`);
  const dead = len < max * 0.18;
  world.pad(dead ? 0 : dx / max, dead ? 0 : dy / max);
}
ui.addEventListener("pointerdown", (event) => {
  const stick = (event.target as HTMLElement).closest<HTMLElement>("[data-stick]");
  if (!stick || !world.active || padPointer !== null) return;
  event.preventDefault();
  padPointer = event.pointerId;
  stick.setPointerCapture(event.pointerId);
  stick.classList.add("held");
  steer(stick, event);
});
ui.addEventListener("pointermove", (event) => {
  if (event.pointerId !== padPointer) return;
  const stick = ui.querySelector<HTMLElement>("[data-stick]");
  if (stick) steer(stick, event);
});
for (const ev of ["pointerup", "pointercancel", "lostpointercapture"] as const)
  ui.addEventListener(ev, (event) => {
    if (event.pointerId !== padPointer) return;
    padPointer = null;
    const stick = ui.querySelector<HTMLElement>("[data-stick]");
    stick?.classList.remove("held");
    stick?.style.setProperty("--kx", "0px");
    stick?.style.setProperty("--ky", "0px");
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
  if (event.key === "Escape" && (panel === "settings" || panel === "customise" || (mode !== "play" && panel !== "none"))) {
    event.preventDefault();
    if (panel === "customise") world.setTitleView("wide");
    panel = panel === "settings" ? settingsFrom : "none";
    settingsFrom = "none";
    render(true);
    return;
  }
  if (event.key === "Escape" && mode === "play") {
    event.preventDefault();
    if (panel === "activity" && kite) return;
    panel = panel === "none" || panel === "run" ? "pause" : "none";
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
  if (panel === "run" && !loading) {
    const k = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    // Enter/Space on a focused button (a gate card, Pause) presses that button
    if ((k === " " || k === "Enter") && event.target instanceof HTMLButtonElement) return;
    if (/^[1-5]$/.test(k) && runPhase() === "crossroads") {
      event.preventDefault();
      world.runInput("go", Number(k) - 1);
      return;
    }
    const cmd = RUN_KEYS[k];
    if (cmd && !event.repeat) {
      event.preventDefault();
      world.runInput(cmd);
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
  kite?.pause();
  save();
  if (mode === "play" && (panel === "none" || panel === "run") && !loading) {
    panel = "pause";
    render();
  }
}
window.addEventListener("blur", suspend);
window.addEventListener('pagehide', suspend);
window.addEventListener('mobile-game-interruption', suspend);
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
    await world.showTitle(identity, saved ? kiteLook(saved) : undefined);
    ready = true;
    loading = false;
    render();
    ambience();
  } catch (err) {
    loading = false;
    loadError = u("cover.bootError");
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
    lang,
    style: { ...state.style },
    album: { lives: album.lives.length, endings: [...new Set(album.lives.map((x) => x.ending))], choices: Object.keys(album.choices).length },
    render: world.diagnostics(),
  }),
});
