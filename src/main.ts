import "./style.css";
import { World, type Place } from "./world";
import { chapters, careerFor, type Scores } from "./content";
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
let panel: "none" | "choice" | "journal" | "explore" | "pause" | "restart" =
  "none";
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
  reduced = prefs.reduced ?? reduced;
  pace = ["gentle", "normal", "brisk"].includes(prefs.pace)
    ? prefs.pace
    : "gentle";
} catch {}
let audio: AudioContext | undefined;
let toastTimer = 0;
let world: World;
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
      JSON.stringify({ sound, reduced, pace }),
    );
  } catch {}
  world.reducedMotion = reduced;
  world.speed = pace === "gentle" ? 2.35 : pace === "normal" ? 3 : 3.8;
  document.body.classList.toggle("reduced", reduced);
}
prefs();
function save(updatePosition = true) {
  if (mode === "title") return;
  if (updatePosition)
    state.position = { x: world.playerPosition.x, z: world.playerPosition.z };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    saved = structuredClone(state);
    storageIssue = false;
  } catch {
    storageIssue = true;
  }
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
      return `<span class="delta ${k}">${icons[k]} ${actual === 0 ? `${names[k]} full` : `${actual > 0 ? "+" : ""}${actual} ${names[k]}`}</span>`;
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
 </section><p class="scene-caption"><span>01 / THE BEGINNING</span>A room full of possibilities</p><footer class="title-footer"><span>Built from small, meaningful choices.</span><div>${btn("sound", sound ? "♫ Sound on" : "♫ Sound off")}${btn("motion", reduced ? "Gentle motion" : "Full motion")}</div></footer></main>`;
}
function playUI() {
  const ch = chapters[state.chapter],
    done = ch.encounters.filter((_, i) => resolved(state, i)).length;
  return `<header class="game-header"><div class="chapter-heading"><span class="eyebrow">CHAPTER ${String(state.chapter + 1).padStart(2, "0")} / 12 · AGE ${ch.age}</span><h1>${esc(ch.title)}</h1><p>${esc(ch.place)}</p></div>${stats()}</header>
 <div class="chapter-progress" aria-label="Chapter progress">${chapters.map((c, i) => `<i class="${i < state.chapter ? "past" : i === state.chapter ? "current" : ""}" title="${c.title}"></i>`).join("")}</div>
 <aside class="objective"><span class="objective-dot"></span><div><strong>${done === 2 ? "A new chapter is waiting" : "A little time for people"}</strong><small>${
   done === 2
     ? "Follow the golden doorway when you are ready."
     : `Meet ${esc(
         ch.encounters
           .filter((_, i) => !resolved(state, i))
           .map((e) => e.person)
           .join(" & "),
       )} · ${done}/2 moments`
 }</small></div></aside>
 <div id="toast" class="toast" role="status">${esc(notice)}</div>
 <div class="controls ${panel !== "none" ? "hidden" : ""}"><div class="dpad" aria-label="Movement controls"><button data-pad="0,-1" class="up" aria-label="Move up">↑</button><button data-pad="-1,0" class="left" aria-label="Move left">←</button><span class="pad-center">✦</span><button data-pad="1,0" class="right" aria-label="Move right">→</button><button data-pad="0,1" class="down" aria-label="Move down">↓</button></div><div class="move-help">WASD / arrows to move<br>or tap a place to walk there</div>${btn("interact", '<kbd>E</kbd> <span id="interact-label">Explore the room</span>', "interact", 'id="interact" disabled')}</div>
 <footer class="game-footer"><div>${btn("explore", "⌖ Explore")}${btn("journal", `▤ Memories <span class="count">${state.memories.length}</span>`)}</div><span id="save-status">${storageIssue ? "Saving unavailable · keep this tab open" : "● Saved on this device"}</span><div>${btn("sound", sound ? "♫" : "♪", "icon-button", `aria-label="${sound ? "Mute sound" : "Enable sound"}"`)}${btn("pause", "Ⅱ", "icon-button", 'aria-label="Pause game"')}</div></footer>
 ${loading ? '<div class="loading-cover" role="status"><span class="loader"></span>Turning the page…</div>' : ""}${loadError ? `<div class="loading-cover"><p>${esc(loadError)}</p>${btn("retry", "Try again", "primary")}</div>` : ""}`;
}
function panelUI() {
  if (panel === "none") return "";
  if (panel === "choice") {
    const enc = chapters[state.chapter].encounters[activeEncounter];
    return `<section class="dialogue" role="dialog" aria-modal="true" aria-labelledby="dialogue-title"><div class="dialogue-header"><span class="speaker-mark">${esc(enc.person.slice(0, 1))}</span><div><p class="eyebrow">${esc(enc.role)}</p><h2 id="dialogue-title" tabindex="-1">${esc(enc.person)}</h2></div>${btn("close", "×", "close", 'aria-label="Return to exploring"')}</div>${enc.context ? `<p class="context">${esc(enc.context(state.facts))}</p>` : ""}<p class="prompt">${esc(enc.prompt)}</p><div class="choices">${enc.options.map((o, i) => `<button class="choice" data-action="choose" data-index="${i}"><span class="option-index">${i + 1}</span><span><strong>${esc(o.label)}</strong><small>${esc(o.hint)}</small><span class="deltas">${delta(o.effect)}</span></span><span class="option-arrow">↗</span></button>`).join("")}</div><p class="untimed">Take your time. The world will wait.</p></section>`;
  }
  let heading = "",
    content = "";
  if (panel === "explore") {
    heading = "Where will you go?";
    content = `<p>Choose a person or discovery. Your character will walk there and interact.</p><div class="place-list">${world
      .places()
      .map(
        (p) =>
          `<button data-action="travel" data-place="${p.id}"><span>${p.kind === "person" ? "☏" : p.kind === "exit" ? "↗" : "✦"}</span><span><strong>${esc(p.label)}</strong><small>${p.kind === "person" ? "A story moment" : p.kind === "exit" ? "Continue your life" : "An optional discovery"}</small></span><b>→</b></button>`,
      )
      .join("")}</div>`;
  } else if (panel === "journal") {
    heading = "Your little book of memories";
    content = `<p>Every small choice leaves something behind.</p><div class="memories">${
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
    content = `<p>Your story is saved. Come back when you are ready.</p><div class="menu-actions">${btn("close", "Return to your story", "primary")}${btn("motion", reduced ? "Reduced motion: on" : "Reduced motion: off", "secondary")}${btn("sound", sound ? "Sound: on" : "Sound: off", "secondary")}${btn("title", "Save & return to title", "quiet")}</div><p class="help-copy">Move: WASD or arrows · Interact: E or Space · Pause: Esc<br>Touch: use the pad or tap a destination.<br>Explore offers an automatic walk to each story moment.</p>`;
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
    )}</div><p class="ending-note">There is no perfect score for a life. There are only the things that mattered to you.</p><div class="ending-actions">${btn("journal", "Read your memory book", "secondary")}${btn("start", "Begin another story ↗", "primary")}${btn("title", "Return to title")}</div></main>`;
}
function render(focus = false) {
  document.body.dataset.mode = mode;
  document.body.dataset.panel = panel;
  ui.innerHTML =
    (mode === "title" ? title() : mode === "ending" ? endingUI() : playUI()) +
    panelUI();
  world.active =
    mode === "play" &&
    panel === "none" &&
    !loading &&
    !loadError &&
    !document.hidden;
  world.clearInput();
  if (mode === "play") nearby(world.nearest());
  if (focus) {
    const target =
      ui.querySelector<HTMLElement>('[role="dialog"] h2') ??
      ui.querySelector<HTMLElement>("h1");
    target?.setAttribute("tabindex", "-1");
    target?.focus({ preventScroll: true });
  }
}
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
  if (kind === "person") {
    if (resolved(state, i)) return;
    activeEncounter = i;
    panel = "choice";
    cue();
    render(true);
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
  const next = hazard(state);
  if (next !== state) {
    state = next;
    world.update(state);
    save();
    cue("hazard");
    const scores = ui.querySelector(".scores");
    if (scores) scores.outerHTML = stats();
    toast(
      "A little stumble · −3 Health. Watch for the purple puddle. It will not trouble you again this chapter.",
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
  if (action === "interact") world.interact();
  if (action === "close") {
    panel = "none";
    render();
  }
  if (action === "pause" || action === "journal" || action === "explore") {
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
        panel = "none";
        cue("choice");
        render();
        toast(state.memories[state.memories.length - 1].text);
      }
    } finally {
      busy = false;
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
  if (!target || !world.active) return;
  event.preventDefault();
  const [x, y] = target.dataset.pad!.split(",").map(Number);
  target.setPointerCapture(event.pointerId);
  world.pad(x, y);
});
for (const ev of ["pointerup", "pointercancel", "lostpointercapture"])
  ui.addEventListener(ev, () => world.pad(0, 0));
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
        '[role="dialog"] button,[role="dialog"] input,[role="dialog"] select',
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
    (key === "e" || event.key === " ") &&
    !event.repeat &&
    !(event.target instanceof HTMLButtonElement)
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
    render: world.diagnostics(),
  }),
});
