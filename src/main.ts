import "./style.css";
import "./story.css";
import { World, type Place } from "./world";
import { chapters, careerFor, type Scores } from "./content";
import {
  activity,
  record,
  conversation,
  canChoose,
  guestNames,
  guestLines,
  objectives,
} from "./journey";
import {
  activityPanel,
  briefingPanel,
  responsePanel,
  keepsakeCards,
  chapterTimeline,
} from "./story-ui";
import {
  newLife,
  parseLife,
  choose,
  discover,
  hazard,
  advance,
  chapterDone,
  resolved,
  biography,
  SAVE_KEY,
  scoreKeys,
  perform,
  undoActivity,
  assistActivity,
  meet,
  type Life,
  type Identity,
} from "./core";

const ui = document.querySelector<HTMLElement>("#ui")!;
const host = document.querySelector<HTMLElement>("#world")!;
const announcer = document.querySelector<HTMLElement>("#announcer")!;
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const icons = { health: "♥", happiness: "✦", money: "●" };
const names = { health: "Health", happiness: "Happiness", money: "Money" };
let saved: Life | null = null,
  storageIssue = false,
  invalidSave = false;
try {
  const raw = localStorage.getItem(SAVE_KEY);
  saved = parseLife(raw);
  invalidSave = !!raw && !saved;
} catch {
  storageIssue = true;
}
let identity: Identity = saved?.identity ?? {
  gender: "female",
  skin: 0,
  name: "You",
};
let state: Life = saved ?? newLife(identity);
let mode: "title" | "play" | "ending" = "title";
type Panel =
  | "none"
  | "choice"
  | "journal"
  | "explore"
  | "pause"
  | "restart"
  | "activity"
  | "briefing"
  | "response";
let panel: Panel = "none";
let focusedPlace: string | null = null;
let response = { title: "", text: "", effect: {} as Partial<Scores>, note: "" };
let largeText = false,
  closeups = true;
let activeEncounter = 0,
  loading = true,
  loadError = "",
  notice = "",
  ready = false,
  busy = false,
  pace = "gentle";
let sound = false,
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
try {
  const prefs = JSON.parse(
    localStorage.getItem("choice-of-life-3d-settings") ?? "{}",
  );
  sound = prefs.sound === true;
  largeText = prefs.largeText === true;
  closeups = prefs.closeups !== false;
  reduced = typeof prefs.reduced === "boolean" ? prefs.reduced : reduced;
  pace = ["gentle", "normal", "brisk"].includes(prefs.pace)
    ? prefs.pace
    : "gentle";
} catch {}
let audio: AudioContext | undefined;
let toastTimer = 0;
let world: World;
let padPointer: number | null = null;
let renderedPanel: Panel = "none";
let returnAction: string | undefined;
try {
  world = new World(host);
} catch {
  ui.innerHTML =
    '<main class="error-screen"><h1>Your browser could not open the 3D world.</h1><p>Try an up-to-date browser with hardware acceleration enabled.</p><button onclick="location.reload()">Try again</button></main>';
  throw new Error("WebGL unavailable");
}
function cue(kind = "soft") {
  if (!sound) return;
  try {
    audio ??= new AudioContext();
    void audio.resume();
    const t = audio.currentTime;
    [0, 1, 2].forEach((i) => {
      const oscillator = audio!.createOscillator(),
        gain = audio!.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value =
        (kind === "choice" ? 392 : kind === "hazard" ? 196 : 523.25) *
        [1, 1.25, 1.5][i];
      gain.gain.setValueAtTime(0, t + i * 0.07);
      gain.gain.linearRampToValueAtTime(0.025, t + i * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.07 + 0.35);
      oscillator.connect(gain);
      gain.connect(audio!.destination);
      oscillator.start(t + i * 0.07);
      oscillator.stop(t + i * 0.07 + 0.36);
    });
  } catch {}
}
function prefs() {
  try {
    localStorage.setItem(
      "choice-of-life-3d-settings",
      JSON.stringify({ sound, reduced, pace, largeText, closeups }),
    );
  } catch {}
  world.reducedMotion = reduced;
  world.closeups = closeups;
  world.speed = pace === "gentle" ? 2.35 : pace === "normal" ? 3 : 3.8;
  document.body.classList.toggle("reduced", reduced);
  document.body.classList.toggle("large-text", largeText);
}
prefs();
function save(updatePosition = true) {
  if (mode === "title") return;
  // A chapter load still displays the previous room; keep the new safe spawn.
  if (updatePosition && !loading)
    state.position = { x: world.playerPosition.x, z: world.playerPosition.z };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    saved = structuredClone(state);
    storageIssue = false;
  } catch {
    storageIssue = true;
  }
  const status = ui.querySelector("#save-status");
  if (status)
    status.textContent = storageIssue
      ? "Saving unavailable · keep this tab open"
      : "● Saved on this device";
}
function toast(message: string) {
  notice = message;
  announcer.textContent = message;
  const el = document.querySelector("#toast");
  if (el) el.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    notice = "";
    const el = document.querySelector("#toast");
    if (el) el.textContent = "";
  }, 6000);
}
function delta(effect: Partial<Scores>) {
  return scoreKeys
    .filter((k) => effect[k])
    .map((k) => {
      const actual =
        Math.max(0, Math.min(100, state.scores[k] + effect[k]!)) -
        state.scores[k];
      return `<span class="delta ${k}">${icons[k]} ${actual === 0 ? `${names[k]} ${effect[k]! > 0 ? "full" : "at minimum"}` : `${actual > 0 ? "+" : ""}${actual} ${names[k]}`}</span>`;
    })
    .join("");
}
function stats() {
  return `<div class="scores" aria-label="Life outcomes">${scoreKeys.map((k) => `<div class="score ${k}"><span class="score-icon" aria-hidden="true">${icons[k]}</span><div><span class="stat-label">${names[k]}</span><strong>${state.scores[k]}</strong></div><span class="stat-track"><i style="width:${state.scores[k]}%"></i></span></div>`).join("")}</div>`;
}
function btn(action: string, label: string, cls = "quiet", extra = "") {
  return `<button type="button" class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
}
function title() {
  return `<main class="title-layout"><div class="brand"><span class="brand-icon">✦</span> A LITTLE WORLD OF CHOICES <span class="edition">3D EDITION</span></div>
 <section class="title-copy"><p class="eyebrow">A LITTLE WORLD. A WHOLE LIFE.</p><h1>Choice<br> of <em>Life.</em></h1><p class="title-description">The people you meet. <br>The paths you take. <br>The little things you leave behind.</p><div class="title-tags"><span>12 chapters</span><span>Your own story</span><span>At your pace</span></div>
 <div class="start-actions">${saved ? btn("continue", "Continue your story <span>↗</span>", "primary play-button", loading ? "disabled" : "") : ""}${btn("start", saved ? "Begin a new life" : "Play your story <span>↗</span>", saved ? "secondary" : "primary play-button", loading ? "disabled" : "")}</div>
 <p class="load-state" role="status">${loadError ? esc(loadError) : loading ? "Making a little room for you…" : saved ? `Saved at chapter ${saved.chapter + 1} · ${esc(chapters[saved.chapter].title)}` : "Move, explore, and make the next moment yours."}</p>${loadError ? btn("retry", "Retry loading", "secondary") : ""}
 <details class="personalise"><summary>Make it yours <span>＋</span></summary><div class="setup-fields"><label>Your name<input name="name" maxlength="24" value="${esc(identity.name === "You" ? "" : identity.name)}" placeholder="Your name" autocomplete="off"></label><label>Character<select name="gender"><option value="female" ${identity.gender === "female" ? "selected" : ""}>Female</option><option value="male" ${identity.gender === "male" ? "selected" : ""}>Male</option></select></label><label>Skin tone<select name="skin">${["Warm", "Light", "Brown", "Deep"].map((n, i) => `<option value="${i}" ${identity.skin === i ? "selected" : ""}>${n}</option>`).join("")}</select></label><label>Pace<select name="pace">${["gentle", "normal", "brisk"].map((n) => `<option ${pace === n ? "selected" : ""}>${n}</option>`).join("")}</select></label></div></details>
 ${invalidSave ? '<p class="warning">An older or damaged 3D save could not be read. It is kept until you choose to begin a new life.</p>' : ""}
 ${storageIssue ? '<p class="warning">Saving is unavailable in this browser. You can play, but keep this tab open to retain this session.</p>' : ""}
 </section><p class="scene-caption"><span>01 / THE BEGINNING</span>A room full of possibilities</p><footer class="title-footer"><span>Built from small, meaningful choices.</span><div>${btn("sound", sound ? "♫ Sound on" : "♫ Sound off")}${btn("motion", reduced ? "Gentle motion" : "Full motion")}</div></footer></main>`;
}
function playUI() {
  const ch = chapters[state.chapter],
    done = ch.encounters.filter((_, i) => resolved(state, i)).length;
  return `<header class="game-header"><div class="chapter-heading"><span class="eyebrow">CHAPTER ${String(state.chapter + 1).padStart(2, "0")} / 12 · AGE ${ch.age}</span><h1>${esc(ch.title)}</h1><p>${esc(ch.place)}</p></div>${stats()}</header>
 <div class="chapter-progress" aria-label="Chapter progress">${chapters.map((c, i) => `<i class="${i < state.chapter ? "past" : i === state.chapter ? "current" : ""}" title="${c.title}"></i>`).join("")}</div>
 <aside class="objective"><span class="objective-dot"></span><div><strong>${done === 2 ? "Leave when your chapter feels complete" : esc(objectives[state.chapter])}</strong><small>${
   done === 2
     ? "Follow the golden doorway when you are ready."
     : `Meet ${esc(
         ch.encounters
           .filter((_, i) => !resolved(state, i))
           .map((e) => e.person)
           .join(" & "),
       )}`
 }</small><small class="discovery-progress">${record(state).complete ? "✓ Keepsake earned" : "Optional: " + esc(activity(state).title)} · Money measures security</small></div></aside>
 <div id="toast" class="toast" role="status">${esc(notice)}</div>
 <div class="controls ${panel !== "none" ? "hidden" : ""}"><div class="dpad" aria-label="Movement controls"><button data-pad="0,-1" class="up" aria-label="Move up">↑</button><button data-pad="-1,0" class="left" aria-label="Move left">←</button><span class="pad-center">✦</span><button data-pad="1,0" class="right" aria-label="Move right">→</button><button data-pad="0,1" class="down" aria-label="Move down">↓</button></div><div class="move-help">WASD / arrows to move<br>or tap a place to walk there</div>${btn("interact", '<kbd>E</kbd> <span id="interact-label">Explore the room</span>', "interact", 'id="interact" disabled')}</div>
 <footer class="game-footer"><div>${btn("explore", "⌖ Explore")}${btn("briefing", "▧ Story")}${btn("journal", `▤ Keepsakes <span class="count">${state.memories.length}</span>`)}</div><span id="save-status">${storageIssue ? "Saving unavailable · keep this tab open" : "● Saved on this device"}</span><div>${btn("sound", sound ? "♫" : "♪", "icon-button", `aria-label="${sound ? "Mute sound" : "Enable sound"}"`)}${btn("pause", "Ⅱ", "icon-button", 'aria-label="Pause game"')}</div></footer>
 ${loading ? '<div class="loading-cover" role="status"><span class="loader"></span>Turning the page…</div>' : ""}${loadError ? `<div class="loading-cover"><p>${esc(loadError)}</p>${btn("retry", "Try again", "primary")}</div>` : ""}`;
}
function panelUI() {
  if (panel === "none") return "";
  if (panel === "activity") return activityPanel(state);
  if (panel === "briefing") return briefingPanel(state);
  if (panel === "response")
    return responsePanel(
      response.title,
      response.text,
      response.effect,
      response.note,
    );
  if (panel === "choice") {
    const enc = conversation(state, activeEncounter);
    return `<section class="dialogue" role="dialog" aria-modal="true" aria-labelledby="dialogue-title"><div class="dialogue-header"><span class="speaker-mark">${esc(enc.person.slice(0, 1))}</span><div><p class="eyebrow">${esc(enc.role)}</p><h2 id="dialogue-title" tabindex="-1">${esc(enc.person)}</h2></div>${btn("close", "×", "close", 'aria-label="Return to exploring"')}</div>${enc.context ? `<p class="context">${esc(enc.context(state.facts))}</p>` : ""}<p class="prompt">${esc(enc.prompt)}</p><div class="choices">${enc.options.map((o, i) => `<button class="choice" data-action="choose" data-index="${i}" ${canChoose(state, activeEncounter, i) ? "" : "disabled"}><span class="option-index">${i + 1}</span><span><strong>${esc(o.label)}</strong><small>${esc(o.hint)}</small><span class="deltas">${delta(o.effect)}</span></span><span class="option-arrow">↗</span></button>`).join("")}</div><p class="untimed">Take your time. The world will wait.</p></section>`;
  }
  let heading = "",
    content = "";
  if (panel === "explore") {
    heading = "Where will you go?";
    content = `<p>Choose a person or discovery. Your character will walk there and interact.</p><div class="place-list">${world
      .places()
      .map(
        (p) =>
          `<button data-action="travel" data-place="${p.id}"><span>${["person", "guest", "companion"].includes(p.kind) ? "☏" : p.kind === "exit" ? "↗" : "✦"}</span><span><strong>${esc(p.label)}</strong><small>${p.kind === "person" ? "A story moment" : p.kind === "guest" ? "Meet this person directly" : p.kind === "companion" ? "A familiar face" : p.kind === "activity" ? "Hands-on activity · optional" : p.kind === "exit" ? "Continue your life" : "An optional discovery"}</small></span><b>→</b></button>`,
      )
      .join("")}</div>`;
  } else if (panel === "journal") {
    heading = "Inside the blue tin";
    content = `<p>Objects from the things you actually did. Your shelf grows with each chapter.</p>${keepsakeCards(state)}<h3>Your written memories</h3><div class="memories">${
      [...state.memories]
        .reverse()
        .map(
          (m) =>
            `<article><span class="eyebrow">${esc(chapters[m.chapter].title)}</span><h3>${esc(m.title)}</h3><p>${esc(m.text)}</p></article>`,
        )
        .join("") || "<p>Your first page is waiting. Go and meet someone.</p>"
    }</div>`;
  } else if (panel === "restart") {
    heading = "Begin another story?";
    content = `<p>Your current 3D life will be replaced when you begin. You can read your memories before starting again.</p><div class="menu-actions">${btn("new-confirm", "Begin a new life", "primary")}${btn("cancel-restart", "Keep my current life", "secondary")}</div>`;
  } else {
    heading = "A moment to breathe";
    content = `<p>${storageIssue ? "Saving is unavailable. Keep this tab open to keep playing your current story." : "Your story is saved. Come back when you are ready."}</p><div class="menu-actions">${btn("close", "Return to your story", "primary")}${btn("text-size", largeText ? "Text: large" : "Text: comfortable", "secondary")}${btn("closeups", closeups ? "Conversation close-ups: on" : "Conversation close-ups: off", "secondary")}${btn("motion", reduced ? "Reduced motion: on" : "Reduced motion: off", "secondary")}${btn("sound", sound ? "Sound: on" : "Sound: off", "secondary")}${btn("title", "Save & return to title", "quiet")}</div><p class="help-copy">Move: WASD or arrows · Interact: E or Space · Pause: Esc<br>Touch: use the pad or tap a destination.<br>Explore offers an automatic walk to each story moment.</p>`;
  }
  return `<div class="modal-shade"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header><h2 id="modal-title" tabindex="-1">${heading}</h2>${btn("close", "×", "close", 'aria-label="Close panel"')}</header>${content}</section></div>`;
}
function endingUI() {
  const title =
    state.facts.gift === "knowledge"
      ? "A life that lit the way."
      : state.facts.gift === "opportunity"
        ? "A life that opened doors."
        : "A life that made room.";
  return `<main class="ending"><span class="eyebrow">TWELVE CHAPTERS. ONE VERY HUMAN STORY.</span><h1>${title}</h1><p class="ending-name">${esc(state.identity.name === "You" ? "Your story" : state.identity.name + "’s story")}</p>${stats()}<div class="biography">${biography(
    state,
  )
    .map((p) => `<p>${esc(p)}</p>`)
    .join(
      "",
    )}</div><h2 class="tin-heading">The things you made time for</h2>${keepsakeCards(state)}<details class="ending-chapters"><summary>Open your twelve-chapter story</summary>${chapterTimeline(state)}</details><p class="ending-note">There is no perfect score for a life. There are only the things that mattered to you.</p><div class="ending-actions">${btn("journal", "Read your memory book", "secondary")}${btn("start", "Begin another story ↗", "primary")}${btn("title", "Return to title")}</div></main>`;
}
function render(focus = false) {
  const focusedAction = (document.activeElement as HTMLElement | null)?.dataset
    .action;
  const opening = panel !== "none" && renderedPanel === "none";
  const closing = panel === "none" && renderedPanel !== "none";
  if (opening) returnAction = focusedAction;
  document.body.dataset.mode = mode;
  document.body.dataset.panel = panel;
  ui.innerHTML =
    `<div class="screen-ui" ${panel !== "none" ? "inert" : ""}>${mode === "title" ? title() : mode === "ending" ? endingUI() : playUI()}</div>` +
    panelUI();
  world.active =
    mode === "play" &&
    panel === "none" &&
    !loading &&
    !loadError &&
    !document.hidden;
  world.clearInput();
  world.focus(
    ["choice", "response", "activity"].includes(panel) ? focusedPlace : null,
  );
  padPointer = null;
  layoutObserver.disconnect();
  for (const element of ui.querySelectorAll(".game-header,.dialogue"))
    layoutObserver.observe(element);
  layoutWorld();
  if (mode === "play") nearby(world.nearest());
  if (focus || opening || closing || focusedAction) {
    const action = closing
      ? returnAction
      : !focus && !opening
        ? focusedAction
        : undefined;
    const button = action
      ? ui.querySelector<HTMLElement>(
          `[data-action="${CSS.escape(action)}"]:not(:disabled)`,
        )
      : null;
    const target =
      (button && !button.closest("[inert]") ? button : null) ??
      ui.querySelector<HTMLElement>('[role="dialog"] h2') ??
      ui.querySelector<HTMLElement>("h1");
    if (target?.matches("h1,h2")) target.setAttribute("tabindex", "-1");
    target?.focus({ preventScroll: true });
  }
  renderedPanel = panel;
}
function layoutWorld() {
  const dialog = ui.querySelector<HTMLElement>(".dialogue");
  const header = ui.querySelector<HTMLElement>(".game-header");
  if (mode === "play" && header) {
    const bottom = header.getBoundingClientRect().bottom;
    const progress = ui.querySelector<HTMLElement>(".chapter-progress");
    const objective = ui.querySelector<HTMLElement>(".objective");
    if (progress) progress.style.top = `${bottom + 8}px`;
    if (objective) objective.style.top = `${bottom + 24}px`;
  }
  if (mode === "play" && dialog && header) {
    const top = header.getBoundingClientRect().bottom + 8;
    dialog.style.setProperty(
      "--dialogue-limit",
      `${Math.max(100, innerHeight - top - 96)}px`,
    );
    host.style.top = `${top}px`;
    host.style.bottom = `${Math.max(0, innerHeight - dialog.getBoundingClientRect().top) + 8}px`;
  } else {
    host.style.removeProperty("top");
    host.style.removeProperty("bottom");
  }
}
const layoutObserver = new ResizeObserver(layoutWorld);
window.addEventListener("resize", layoutWorld);
function nearby(place?: Place) {
  const button = ui.querySelector<HTMLButtonElement>("#interact");
  if (button) {
    button.disabled = !place;
    const label = button.querySelector("#interact-label");
    if (label)
      label.textContent = place
        ? place.kind === "person"
          ? `Talk to ${place.label}`
          : place.kind === "exit"
            ? place.label
            : "Discover"
        : "Explore the room";
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
    toast(chapters[state.chapter].intro);
  } catch (err) {
    loading = false;
    loadError = "This room could not load. Your story is safe; try again.";
    console.error(err);
    render();
  }
}
async function begin() {
  state = newLife(identity);
  saved = null;
  invalidSave = false;
  panel = "none";
  mode = "play";
  await showChapter();
  cue("choice");
}
function interact(id: string) {
  if (mode !== "play" || panel !== "none" || loading || busy) return;
  const [kind, index] = id.split(":");
  const i = Number(index);
  focusedPlace = id;
  if (kind === "person") {
    if (resolved(state, i)) return;
    activeEncounter = i;
    panel = "choice";
    cue();
    render(true);
  } else if (kind === "activity") {
    if (record(state).complete) return;
    panel = "activity";
    render(true);
  } else if (kind === "guest" || kind === "companion") {
    if (kind === "guest") {
      state = meet(state, i);
      world.update(state);
      save();
    }
    response = {
      title: kind === "guest" ? guestNames[i] : state.facts.partner,
      text:
        kind === "guest"
          ? guestLines[i]
          : `${state.facts.partner} has kept a place for you. ${state.chapter === 8 ? "“Tell me which part of this week you need help with. We can make a plan together.”" : state.chapter >= 10 ? "“There is still time for another ordinary afternoon together.”" : "“I would like to hear about your day—not just the work you finished.”"}`,
      effect: {},
      note:
        kind === "guest"
          ? "You can return to Jamie after meeting someone. Friendship does not require a romantic commitment."
          : record(state, 7).complete
            ? "The picnic cloth from your first gathering is still folded by the door."
            : "Your chosen relationship continues beyond the neighbourhood gathering.",
    };
    panel = "response";
    render(true);
    world.acknowledge();
  } else if (kind === "discovery") {
    const next = discover(state, i);
    if (next === state) return;
    state = next;
    world.update(state);
    save();
    cue();
    render();
    const actual =
      state.memories[state.memories.length - 1].effect[scoreKeys[i]];
    toast(
      `${chapters[state.chapter].discoveries[i]} · ${actual ? `+${actual} ${names[scoreKeys[i]]}` : `${names[scoreKeys[i]]} already full; a memory kept.`}`,
    );
  } else if (kind === "exit" && chapterDone(state)) {
    state = advance(state);
    save(false);
    void showChapter();
  }
}
world.onInteract = interact;
world.onNearby = nearby;
world.onHazard = () => {
  const before = state.scores.health;
  const next = hazard(state);
  if (next !== state) {
    state = next;
    world.update(state);
    save();
    cue("hazard");
    const scores = ui.querySelector(".scores");
    if (scores) scores.outerHTML = stats();
    toast(
      `A little stumble · ${state.scores.health - before} Health. Watch for the purple puddle. It will not trouble you again this chapter.`,
    );
  }
};
world.onPosition = () => save();
ui.addEventListener("click", async (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>(
    "[data-action]",
  );
  if (!target || target.hasAttribute("disabled") || busy) return;
  const action = target.dataset.action;
  if (loading || target.closest("[inert]")) return;
  if (action === "start") {
    if (saved || invalidSave) {
      panel = "restart";
      render(true);
    } else await begin();
  }
  if (action === "new-confirm") await begin();
  if (action === "cancel-restart") {
    panel = "none";
    render();
  }
  if (action === "continue" && saved) {
    state = structuredClone(saved);
    panel = "none";
    mode = "play";
    await showChapter();
  }
  if (action === "retry") {
    if (!ready) void boot();
    else await showChapter();
  }
  if (action === "sound") {
    sound = !sound;
    prefs();
    cue();
    render();
  }
  if (action === "motion") {
    reduced = !reduced;
    prefs();
    render();
  }
  if (action === "text-size" || action === "closeups") {
    if (action === "text-size") largeText = !largeText;
    else closeups = !closeups;
    prefs();
    render();
  }
  if (action === "interact") world.interact();
  if (action === "close") {
    panel = "none";
    render();
  }
  if (
    action === "pause" ||
    action === "journal" ||
    action === "explore" ||
    action === "briefing"
  ) {
    panel = action;
    save();
    render(true);
  }
  if (action === "title") {
    save();
    mode = "title";
    panel = "none";
    render(true);
  }
  if (action === "choose") {
    busy = true;
    try {
      const next = choose(state, activeEncounter, Number(target.dataset.index));
      if (next !== state) {
        state = next;
        world.update(state);
        save();
        const memory = state.memories.at(-1)!;
        response = {
          title: conversation(state, activeEncounter).person,
          text: memory.text,
          effect: memory.effect,
          note: record(state).complete
            ? "Your keepsake is saved in the blue tin."
            : `There is still time for: ${activity(state).title}.`,
        };
        panel = "response";
        cue("choice");
        render();
        world.acknowledge();
      }
    } finally {
      busy = false;
    }
  }
  if (
    ["task-step", "task-undo", "task-assist"].includes(action ?? "") &&
    panel === "activity"
  ) {
    const next =
      action === "task-undo"
        ? undoActivity(state)
        : action === "task-assist"
          ? assistActivity(state)
          : perform(state, target.dataset.step!);
    if (next !== state) {
      state = next;
      world.update(state);
      save();
      cue();
      if (record(state).complete) {
        const memory = state.memories.at(-1)!;
        response = {
          title: memory.title,
          text: memory.text,
          effect: memory.effect,
          note: "A new keepsake has been added to your tin. Future chapters will remember this moment.",
        };
        panel = "response";
      }
      render(true);
      world.acknowledge();
    }
  }
  if (action === "travel") {
    const id = target.dataset.place!;
    panel = "none";
    render();
    if (!world.go(id))
      toast("That path is blocked. Try walking around the furniture.");
  }
});
ui.addEventListener("change", (event) => {
  const input = event.target as HTMLInputElement;
  if (input.name === "gender")
    identity = {
      ...identity,
      gender: input.value === "male" ? "male" : "female",
    };
  if (input.name === "skin")
    identity = { ...identity, skin: Number(input.value) };
  if (input.name === "name")
    identity = { ...identity, name: input.value.trim().slice(0, 24) || "You" };
  if (input.name === "pace") {
    pace = input.value;
    prefs();
  }
});
ui.addEventListener("pointerdown", (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>(
    "[data-pad]",
  );
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
const movement = new Set([
  "w",
  "a",
  "s",
  "d",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);
window.addEventListener("keydown", (event) => {
  if (
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    (event.target instanceof HTMLElement &&
      event.target.matches("input,select,textarea"))
  )
    return;
  if (event.key === "Tab" && panel !== "none") {
    const items = [
      ...ui.querySelectorAll<HTMLElement>(
        '[role="dialog"] button:not(:disabled),[role="dialog"] input:not(:disabled),[role="dialog"] select:not(:disabled)',
      ),
    ];
    const first = items[0],
      last = items[items.length - 1];
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        !items.includes(document.activeElement as HTMLElement))
    ) {
      event.preventDefault();
      last?.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last ||
        !items.includes(document.activeElement as HTMLElement))
    ) {
      event.preventDefault();
      first?.focus();
    }
    return;
  }
  if (event.key === "Escape" && mode !== "title") {
    event.preventDefault();
    panel = panel === "none" ? "pause" : "none";
    save();
    render(true);
    return;
  }
  if (mode !== "play" || panel !== "none" || loading) return;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (movement.has(key)) {
    event.preventDefault();
    world.key(key, true);
  }
  if (
    (key === "e" ||
      (event.key === " " && !(event.target instanceof HTMLButtonElement))) &&
    !event.repeat
  ) {
    event.preventDefault();
    world.interact();
  }
});
window.addEventListener("keyup", (event) =>
  world.key(
    event.key.length === 1 ? event.key.toLowerCase() : event.key,
    false,
  ),
);
function suspend() {
  world.clearInput();
  save();
  if (mode === "play" && panel === "none") {
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
    await world.show(newLife(identity));
    ready = true;
    loading = false;
    render();
  } catch (err) {
    loading = false;
    loadError =
      "The little world could not load. Check your connection and try again.";
    console.error(err);
    render();
  }
}
void boot();
// Read-only diagnostics make the production release reviewable without a gameplay cheat API.
Object.defineProperty(window, "lifeDiagnostics", {
  get: () => ({
    mode,
    panel,
    loading,
    chapter: state.chapter,
    complete: state.complete,
    choices: Object.keys(state.choices).length,
    discoveries: state.discoveries.length,
    activities: Object.values(state.activities).filter((r) => r.complete)
      .length,
    activitySteps: record(state).actions.length,
    meetings: [...state.meetings],
    render: world.diagnostics(),
  }),
});
