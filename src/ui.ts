/** HTML templates for every screen. Pure functions of the life state; main.ts wires events. */
import {
  chapters,
  people,
  text,
  personName,
  resolveWho,
  partnered,
  partnerName,
  kiteColours,
  career,
  type Effect,
  type Moment,
  type BondKey,
  type Stat,
} from "./content";
import {
  BONDS,
  BOND_MAX,
  COLOURS,
  HAIR_STYLES,
  SKINS,
  STATS,
  chapterOf,
  effectOf,
  ending,
  freeTime,
  keepsakes,
  mainDone,
  mainMoment,
  optionOpen,
  record,
  visibleOptions,
  type Identity,
  type Life,
} from "./core";

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export const btn = (action: string, label: string, cls = "ghost", extra = "") => `<button type="button" class="${cls}" data-action="${action}" ${extra}>${label}</button>`;

export const statInfo: Record<Stat, { icon: string; name: string }> = {
  health: { icon: "♥", name: "Health" },
  joy: { icon: "☀", name: "Joy" },
  savings: { icon: "●", name: "Savings" },
};
export function bondName(b: BondKey, l: Life) {
  return b === "family" ? "Family" : b === "rowan" ? "Rowan" : b === "maya" ? "Maya" : partnered(l) ? partnerName(l) : "Partner";
}

/** Effect chips: stats as coloured pills, bonds as hearts. */
export function chips(e: Effect, l: Life) {
  const out: string[] = [];
  for (const s of STATS) {
    const v = e[s];
    if (!v) continue;
    out.push(`<span class="chip ${s} ${v < 0 ? "down" : "up"}" aria-label="${statInfo[s].name} ${v > 0 ? "+" : ""}${v}"><b aria-hidden="true">${statInfo[s].icon}</b>${v > 0 ? "+" : ""}${v}</span>`);
  }
  for (const b of BONDS) {
    const v = e[b];
    if (!v) continue;
    const who = b === "partner" && !partnered(l) ? "Partner" : bondName(b, l);
    out.push(`<span class="chip bond ${v < 0 ? "down" : "up"}" aria-label="${who} bond ${v > 0 ? "+" : ""}${v}"><b aria-hidden="true">${v > 0 ? "❤" : "💔"}</b>${esc(who)} ${v > 0 ? "+" : ""}${v}</span>`);
  }
  return out.join("");
}

export function hearts(n: number) {
  return `<span class="hearts" aria-label="${n} of ${BOND_MAX}">${Array.from({ length: BOND_MAX }, (_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("")}</span>`;
}

function portrait(who: string, l: Life, size = "") {
  const id = resolveWho(who, l);
  const p = people[id];
  const colour = who === "you" ? COLOURS[l.identity.colour] : (p?.color ?? "8c5cf0");
  const name = personName(who, l);
  return `<span class="portrait ${size}" style="--c:#${colour}" aria-hidden="true">${esc(name === "You" ? "★" : name.replace(/^(Ms|Nana) /, "")[0])}</span>`;
}

// ---------------------------------------------------------------------------
// title
// ---------------------------------------------------------------------------
export function titleUI(o: { saved: Life | null; identity: Identity; loading: boolean; loadError: string; legacy: boolean; invalid: boolean; storage: boolean; pace: string; graphics: string; sound: boolean; reduced: boolean; makeOpen: boolean }) {
  const hairLabels = ["Short", "Swept", "Bob", "Ponytail", "Bun", "Curls", "Long", "Spiky"];
  const load = o.loadError
    ? esc(o.loadError)
    : o.loading
      ? "Raising the kites…"
      : o.saved?.complete
        ? `A whole life, complete · ${esc(ending(o.saved).title)}`
        : o.saved
          ? `Saved in chapter ${o.saved.chapter + 1} · ${esc(chapters[o.saved.chapter].title)}`
          : "Twelve chapters. One life. Your choices.";
  return `<main class="title">
  <section class="title-card">
   <p class="kicker">A whole life in one small town</p>
   <h1><span>Choice of Life</span><em>Kitehaven</em></h1>
   <p class="tagline">Every summer the town flies kites off the Old Pier. Every choice you make decides who's holding the string with you at the end.</p>
   <div class="start">${o.saved ? btn("continue", o.saved.complete ? "Read your story <span>→</span>" : "Continue your life <span>→</span>", "primary big", o.loading ? "disabled" : "") : ""}${btn("start", o.saved ? "Begin a new life" : "Begin your life <span>→</span>", o.saved ? "secondary" : "primary big", o.loading ? "disabled" : "")}</div>
   <p class="load" role="status">${load}</p>
   ${o.loadError ? btn("retry", "Try again", "secondary") : ""}
   ${o.legacy && !o.saved ? '<p class="note">Your life from the earlier edition is still saved on this device. Kitehaven is a new story, so it begins fresh.</p>' : ""}
   ${o.invalid ? '<p class="note warn">A saved life on this device could not be read. It stays untouched until you begin a new one.</p>' : ""}
   ${o.storage ? '<p class="note warn">Saving is unavailable in this browser. You can play, but keep this tab open.</p>' : ""}
   <details class="make"${o.makeOpen ? " open" : ""}><summary>Make it yours</summary>
    <label class="field">Your name<input name="name" maxlength="24" value="${esc(o.identity.name === "You" ? "" : o.identity.name)}" placeholder="Your name" autocomplete="off"></label>
    <fieldset class="field"><legend>Hair</legend><div class="pick hair">${HAIR_STYLES.map((_, i) => `<button type="button" data-action="hair" data-value="${i}" aria-pressed="${o.identity.hair === i}">${hairLabels[i]}</button>`).join("")}</div></fieldset>
    <fieldset class="field"><legend>Skin tone</legend><div class="pick swatches">${SKINS.map((c, i) => `<button type="button" data-action="skin" data-value="${i}" aria-pressed="${o.identity.skin === i}" aria-label="Skin tone ${i + 1}" style="--c:#${c}"></button>`).join("")}</div></fieldset>
    <fieldset class="field"><legend>Favourite colour</legend><div class="pick swatches">${COLOURS.map((c, i) => `<button type="button" data-action="colour" data-value="${i}" aria-pressed="${o.identity.colour === i}" aria-label="Colour ${i + 1}" style="--c:#${c}"></button>`).join("")}</div></fieldset>
    <div class="row"><label class="field">Walking pace<select name="pace">${["gentle", "normal", "brisk"].map((n) => `<option value="${n}" ${o.pace === n ? "selected" : ""}>${n[0].toUpperCase() + n.slice(1)}</option>`).join("")}</select></label>
    <label class="field">Graphics<select name="graphics"><option value="high" ${o.graphics === "high" ? "selected" : ""}>Full detail</option><option value="low" ${o.graphics === "low" ? "selected" : ""}>Light (phones)</option></select></label></div>
    <small class="help">Changing graphics reloads the title. Your saved life is kept.</small>
   </details>
  </section>
  <footer class="title-foot"><span>Made with Blender &amp; Three.js</span><div>${btn("sound", o.sound ? "♫ Sound on" : "♫ Sound off", "ghost small")}${btn("motion", o.reduced ? "Motion: gentle" : "Motion: full", "ghost small")}</div></footer>
 </main>`;
}

// ---------------------------------------------------------------------------
// the HUD
// ---------------------------------------------------------------------------
export function statsUI(l: Life) {
  return `<div class="stats" aria-label="Your life">${STATS.map(
    (s) => `<div class="stat ${s}"><b aria-hidden="true">${statInfo[s].icon}</b><span><small>${statInfo[s].name}</small><strong>${l.stats[s]}</strong></span><i style="--v:${l.stats[s]}%"></i></div>`,
  ).join("")}</div>`;
}

export function objectiveLine(l: Life) {
  const main = mainMoment(l);
  if (!mainDone(l)) return main.who === "you" ? "When you're ready, fly the last kite (the ! on the clifftop)." : `Find ${personName(main.who, l)} — look for the gold !`;
  if (freeTime(l) > 0 && chapterOf(l).free < 50) return "Spend your free time with someone — or head for the golden gate.";
  return "The golden gate is open when you're ready to move on.";
}

export function playUI(l: Life, o: { hunt: string; notice: string; saveStatus: string }) {
  const ch = chapterOf(l);
  const free = ch.free > 50 ? `<span class="all-time">All the time in the world</span>` : `<span class="suns" aria-label="${freeTime(l)} of ${ch.free} hours of free time left">${Array.from({ length: ch.free }, (_, i) => `<i class="${i < freeTime(l) ? "on" : ""}">☀</i>`).join("")}</span>`;
  return `<header class="hud-top">
   <div class="chapter-chip"><span class="kicker">Chapter ${l.chapter + 1} · Age ${ch.age}</span><h1>${esc(ch.title)}</h1><span class="place">${esc(ch.place)}</span></div>
   ${statsUI(l)}
  </header>
  <ol class="lifeline" aria-label="Chapters">${chapters.map((c, i) => `<li class="${i < l.chapter ? "past" : i === l.chapter ? "now" : ""}" title="${esc(c.title)}"></li>`).join("")}</ol>
  <aside class="quest"><span class="quest-mark" aria-hidden="true">!</span><div><strong>${esc(text(ch.objective, l))}</strong><small>${esc(objectiveLine(l))}</small></div><div class="free"><small>Free time</small>${free}</div></aside>
  ${o.hunt}
  <div id="toast" class="toast" role="status">${o.notice}</div>
  <div class="controls"><div class="dpad" aria-label="Movement">${["0,-1:up:↑", "-1,0:left:←", "1,0:right:→", "0,1:down:↓"].map((d) => {
    const [v, c, s] = d.split(":");
    return `<button data-pad="${v}" class="${c}" aria-label="Move ${c}">${s}</button>`;
  }).join("")}</div>
   <button class="action" data-action="interact" id="interact" disabled><kbd>E</kbd><span id="interact-label">Look around</span></button></div>
  <footer class="hud-bottom"><div>${btn("explore", "⌖ Go to…", "pill")}${btn("journal", `❤ Journal <b class="count">${l.memories.length}</b>`, "pill")}${btn("briefing", "▤ Chapter", "pill")}</div>
   <span id="save-status" class="save">${o.saveStatus}</span>
   <div>${btn("sound", "♪", "round", 'aria-label="Toggle sound"')}${btn("pause", "Ⅱ", "round", 'aria-label="Pause"')}</div></footer>`;
}

export function huntUI(l: Life) {
  const a = chapterOf(l).activity;
  const r = record(l);
  if (a.kind !== "hunt" || !r.started || r.complete) return "";
  return `<div class="hunt" role="status"><strong>${esc(text(a.title, l))}</strong><ul>${a.items!.map((it, i) => `<li class="${r.found.includes(i) ? "got" : ""}">${r.found.includes(i) ? "✔" : "○"} ${esc(it.name)}</li>`).join("")}</ul><small>Follow the golden beams.</small></div>`;
}

// ---------------------------------------------------------------------------
// panels
// ---------------------------------------------------------------------------
export function briefingUI(l: Life, first: boolean) {
  const ch = chapterOf(l);
  return `<div class="shade chapter-shade"><section class="briefing" role="dialog" aria-modal="true" aria-labelledby="brief-title">
   <span class="big-num" aria-hidden="true">${String(l.chapter + 1).padStart(2, "0")}</span>
   <p class="kicker">Chapter ${l.chapter + 1} of 12 · Age ${ch.age}</p>
   <h2 id="brief-title" tabindex="-1">${esc(ch.title)}</h2>
   <p class="place">${esc(ch.place)}</p>
   <p class="intro">${esc(text(ch.intro, l))}</p>
   ${driftUI(l)}
   <div class="brief-goal"><span class="quest-mark">!</span><div><strong>${esc(text(ch.objective, l))}</strong><small>${ch.free > 50 ? "No clock today. There's time for everyone who came." : `You have <b>${ch.free} hours</b> of free time. Each conversation marked … or activity marked ✦ takes one. You can't do everything — choose who gets your time.`}</small></div></div>
   ${first ? `<ul class="tips"><li><kbd>WASD</kbd> / arrows or tap the ground to walk</li><li><kbd>E</kbd> or <kbd>Space</kbd> to talk and act</li><li>Glowing rings are small discoveries — just walk over them</li><li><b>Go to…</b> walks you anywhere automatically</li></ul>` : ""}
   <div class="actions">${btn("close", l.log.length && record(l).started ? "Back to the story" : "Begin chapter →", "primary big")}</div>
  </section></div>`;
}

/** Bonds that cooled at the last chapter change, told plainly on the chapter card. */
function driftUI(l: Life) {
  if (!l.drift?.length || !l.chapter) return "";
  const names = l.drift.map((b) => bondName(b, l));
  return `<p class="drift">💔 Since last chapter: you made no time for ${esc(names.join(" or "))}, and ${names.length > 1 ? "those bonds" : "that bond"} cooled a little.</p>`;
}

export function momentUI(l: Life, m: Moment) {
  const who = m.who;
  const id = resolveWho(who, l);
  const role = who === "you" ? "The last festival" : people[id]?.role(l) ?? "";
  const ctx = m.context?.(l);
  const opts = visibleOptions(l, m);
  return `<section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
   <header>${portrait(who, l)}<div><span class="kicker ${m.kind}">${m.kind === "main" ? "★ Main story" : "… Free time · 1 hour"}</span><h2 id="dlg-title" tabindex="-1">${esc(text(m.title, l))}</h2><p class="who">${esc(personName(who, l))}${role ? ` · ${esc(role)}` : ""}</p></div>${btn("close", "×", "close", 'aria-label="Not now"')}</header>
   <div class="dialog-body"><p class="prompt">${esc(text(m.prompt, l))}</p>${ctx ? `<p class="context">${esc(ctx)}</p>` : ""}
   <div class="options">${opts
     .map(([o, i], n) => {
       const open = optionOpen(l, o);
       return `<button class="option" data-action="choose" data-index="${i}" ${open ? "" : 'disabled aria-disabled="true"'}><span class="num">${n + 1}</span><span class="body"><strong>${esc(text(o.label, l))}</strong><small>${esc(text(o.hint, l))}</small>${open ? `<span class="chips">${chips(effectOf(l, o), l)}</span>` : `<em class="lock">🔒 ${esc(o.need!.why)}</em>`}</span></button>`;
     })
     .join("")}</div></div>
  </section>`;
}

export function responseUI(title: string, body: string, effect: Effect, l: Life, note = "", who?: string) {
  return `<section class="dialog response" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
   <header>${who ? portrait(who, l) : `<span class="portrait" style="--c:#2ed3b0" aria-hidden="true">✦</span>`}<div><span class="kicker">What happened</span><h2 id="dlg-title" tabindex="-1">${esc(title)}</h2></div></header>
   <div class="dialog-body"><p class="reply">${esc(body)}</p>${Object.keys(effect).length ? `<div class="chips big">${chips(effect, l)}</div>` : ""}${note ? `<p class="note">${esc(note)}</p>` : ""}
   <div class="actions">${btn("close", "Continue →", "primary")}</div></div>
  </section>`;
}

export function activityUI(l: Life, kite: { active: boolean; assist: boolean }) {
  const a = chapterOf(l).activity;
  const r = record(l);
  const title = text(a.title, l);
  const head = `<header>${portrait(a.who ?? "you", l)}<div><span class="kicker side">✦ Activity · 1 hour</span><h2 id="dlg-title" tabindex="-1">${esc(title)}</h2><p class="who">Keepsake: ${esc(a.keepsake)}</p></div>${btn("close", "×", "close", 'aria-label="Close"')}</header>`;
  if (!r.started) {
    const can = freeTime(l) > 0;
    const unlimited = chapterOf(l).free > 50;
    return `<section class="dialog activity" role="dialog" aria-modal="true" aria-labelledby="dlg-title">${head}<div class="dialog-body"><p class="prompt">${esc(text(a.intro, l))}</p>
     <p class="note">${unlimited ? "There's no clock today." : can ? `This takes one hour of free time. You have ${freeTime(l)}.` : "You've no free time left in this chapter."}</p>
     <div class="actions">${btn("task-start", a.kind === "kite" ? "Fly the kite →" : a.kind === "plan" ? "Make the plan →" : "Start looking →", "primary", can ? "" : "disabled")}${btn("close", "Not now", "secondary")}</div></div></section>`;
  }
  if (a.kind === "plan") {
    const sum: Effect = {};
    for (const id of r.plan) for (const [k, v] of Object.entries(a.blocks!.find((b) => b.id === id)!.effect)) sum[k as Stat] = (sum[k as Stat] ?? 0) + (v ?? 0);
    return `<section class="dialog activity" role="dialog" aria-modal="true" aria-labelledby="dlg-title">${head}<div class="dialog-body"><p class="prompt">${esc(text(a.intro, l))}</p>
     <ol class="slots">${[0, 1, 2].map((i) => `<li class="${r.plan[i] ? "full" : ""}"><small>Block ${i + 1}</small><strong>${r.plan[i] ? esc(text(a.blocks!.find((b) => b.id === r.plan[i])!.label, l)) : "—"}</strong></li>`).join("")}</ol>
     <div class="blocks">${a.blocks!.map((b) => `<button class="block" data-action="task-plan" data-step="${b.id}" ${r.plan.length >= 3 ? "disabled" : ""}><strong>${esc(text(b.label, l))}</strong><small>${esc(b.detail)}</small><span class="chips">${chips(b.effect, l)}</span></button>`).join("")}</div>
     <p class="note">${r.plan.length ? `So far: ${chips(sum, l) || "no change"}` : "Choose three blocks, in any order. You can repeat one."}</p>
     <div class="actions">${btn("task-undo", "Undo", "secondary", r.plan.length ? "" : "disabled")}${btn("task-commit", "Keep this plan →", "primary", r.plan.length === 3 ? "" : "disabled")}</div></div></section>`;
  }
  if (a.kind === "kite") {
    return `<section class="dialog activity kite" role="dialog" aria-modal="true" aria-labelledby="dlg-title">${head}<div class="dialog-body"><p class="prompt">${esc(text(a.intro, l))}</p>
     <div class="kite-wrap"><canvas id="kite-canvas" aria-label="Kite flying game: hold to pull the line in, release to let it out"></canvas><div class="kite-hud"><span id="kite-time">20s</span><span id="kite-score">In the band: 0%</span></div></div>
     <div class="actions">${btn("kite-hold", "Hold to pull ⤒", "primary hold")}${btn("kite-assist", kite.assist ? "Steady hands: on" : "Steady hands: off", "secondary")}${btn("kite-skip", "Let the wind decide", "ghost")}</div></div></section>`;
  }
  return `<section class="dialog activity" role="dialog" aria-modal="true" aria-labelledby="dlg-title">${head}<div class="dialog-body"><p class="prompt">${esc(text(a.intro, l))}</p><div class="actions">${btn("close", "Keep looking", "primary")}</div></div></section>`;
}

export function exploreUI(places: { id: string; kind: string; label: string; status?: string }[]) {
  const icon = (p: { kind: string; status?: string }) => (p.kind === "person" ? (p.status === "main" ? "!" : p.status === "side" ? "…" : p.status === "guest" ? "?" : "•") : p.kind === "activity" ? "✦" : p.kind === "exit" ? "→" : p.kind === "hunt" ? "★" : "○");
  const sub = (p: { kind: string; status?: string }) =>
    p.kind === "person" ? (p.status === "main" ? "Main story" : p.status === "side" ? "Free time · 1 hour" : p.status === "guest" ? "Meet them" : "Say hello") : p.kind === "activity" ? "Activity · 1 hour" : p.kind === "exit" ? "Move on" : p.kind === "hunt" ? "Something to find" : "A small discovery";
  return `<div class="shade"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="m-title"><header><h2 id="m-title" tabindex="-1">Where to?</h2>${btn("close", "×", "close", 'aria-label="Close"')}</header>
   <div class="places">${places.map((p) => `<button data-action="travel" data-place="${p.id}" class="place-row is-${p.status ?? p.kind}"><span class="ico">${icon(p)}</span><span><strong>${esc(p.label)}</strong><small>${sub(p)}</small></span><b>→</b></button>`).join("") || "<p>Nothing else to do here.</p>"}</div></section></div>`;
}

export function journalUI(l: Life, tab: string) {
  const tabs = [
    ["people", "People"],
    ["keepsakes", "Keepsakes"],
    ["story", "Your story"],
  ];
  let body = "";
  if (tab === "people") {
    const line = (b: BondKey, n: number) =>
      b === "family"
        ? ["Distant", "Family", "Close", "Very close", "Your whole heart", "Home"][n]
        : b === "partner"
          ? ["—", "Sweethearts", "Partners", "Deeply in love", "Inseparable", "Your person"][n]
          : ["Strangers", "Friendly", "Friends", "Close friends", "Best friends", "Family by choice"][n];
    body = `<div class="people">${BONDS.filter((b) => b !== "partner" || partnered(l))
      .map((b) => {
        const who = b === "family" ? "mum" : b === "partner" ? "partner" : b;
        return `<article class="person">${portrait(who, l)}<div><strong>${esc(bondName(b, l))}</strong><small>${line(b, l.bonds[b])}</small></div>${hearts(l.bonds[b])}</article>`;
      })
      .join("")}</div>
     <h3>You</h3>${statsUI(l)}<p class="help">${l.facts.road ? `${esc(career(l))}. ` : ""}Health, joy and savings carry from chapter to chapter; some choices need enough of one. Anyone you spend no time with while they're around will drift a little. The people you stay close to will be there at the end.</p>`;
  } else if (tab === "keepsakes") {
    const ks = keepsakes(l);
    body = ks.length ? `<div class="keepsakes">${ks.map((k) => `<article><span class="ks-icon ${k.icon}" aria-hidden="true"></span><small>Chapter ${k.chapter + 1}</small><strong>${esc(k.title)}</strong><p>${esc(k.text)}</p></article>`).join("")}</div>` : "<p>Activities leave keepsakes behind. Your shelf is waiting.</p>";
  } else {
    const byChapter = new Map<number, typeof l.memories>();
    for (const m of l.memories) byChapter.set(m.chapter, [...(byChapter.get(m.chapter) ?? []), m]);
    body = [...byChapter.entries()]
      .reverse()
      .map(([c, ms]) => `<section class="mem-chapter"><h4>${c + 1} · ${esc(chapters[c].title)}</h4>${ms.map((m) => `<details class="memory"><summary><strong>${esc(m.title)}</strong> ${esc(m.text)}</summary><p>${esc(m.detail)}</p></details>`).join("")}</section>`)
      .join("") || "<p>Your first page is waiting. Go and meet someone.</p>";
  }
  return `<div class="shade"><section class="modal journal" role="dialog" aria-modal="true" aria-labelledby="m-title"><header><h2 id="m-title" tabindex="-1">Journal</h2>${btn("close", "×", "close", 'aria-label="Close"')}</header>
   <div class="tabs" role="tablist">${tabs.map(([id, name]) => `<button role="tab" data-action="tab" data-tab="${id}" aria-selected="${tab === id}">${name}</button>`).join("")}</div>
   <div class="tab-body">${body}</div></section></div>`;
}

export function pauseUI(o: { storage: boolean; graphics: string; largeText: boolean; reduced: boolean; sound: boolean; closeups: boolean }) {
  return `<div class="shade"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="m-title"><header><h2 id="m-title" tabindex="-1">Paused</h2>${btn("close", "×", "close", 'aria-label="Resume"')}</header>
   <p>${o.storage ? "Saving is unavailable. Keep this tab open to keep playing." : "Your life is saved on this device."}</p>
   <div class="menu">${btn("close", "Resume", "primary")}
    <label class="field">Graphics<select name="graphics"><option value="high" ${o.graphics === "high" ? "selected" : ""}>Full detail</option><option value="low" ${o.graphics === "low" ? "selected" : ""}>Light (phones)</option></select></label>
    ${btn("briefing", "Read the chapter card", "secondary")}${btn("text-size", o.largeText ? "Text: large" : "Text: standard", "secondary")}${btn("closeups", o.closeups ? "Conversation close-ups: on" : "Conversation close-ups: off", "secondary")}${btn("motion", o.reduced ? "Reduced motion: on" : "Reduced motion: off", "secondary")}${btn("sound", o.sound ? "Sound: on" : "Sound: off", "secondary")}${btn("title", "Save and return to title", "ghost")}</div>
   <p class="help">Move: WASD / arrows · Act: E or Space · Choose: 1–5 · Journal: J · Pause: Esc<br>Touch: use the pad, or tap anywhere to walk there.</p></section></div>`;
}

export function restartUI() {
  return `<div class="shade"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="m-title"><header><h2 id="m-title" tabindex="-1">Begin a new life?</h2>${btn("close", "×", "close", 'aria-label="Close"')}</header><p>Your current life will be replaced when the new one begins.</p><div class="menu">${btn("new-confirm", "Begin a new life", "primary")}${btn("close", "Keep my current life", "secondary")}</div></section></div>`;
}

export function endingUI(l: Life) {
  const e = ending(l);
  const name = l.identity.name && l.identity.name !== "You" ? l.identity.name : "You";
  return `<main class="ending">
   <p class="kicker">A whole life in Kitehaven</p>
   <h1>${esc(e.title)}</h1>
   <p class="line">${esc(e.line)}</p>
   <p class="who">${esc(name === "You" ? "Your story" : `${name}'s story`)} · <span style="color:#${kiteColours[l.facts.kite ?? "red"].hex}">◆</span> ${esc(kiteColours[l.facts.kite ?? "red"].name)} kite</p>
   <section class="epilogue">${e.lines.map((x) => `<p>${esc(x)}</p>`).join("")}</section>
   <section class="festival"><h2>At the last festival</h2>${e.present.length ? `<div class="present">${e.present.map((n) => `<span>${esc(n)}</span>`).join("")}</div>` : "<p>Just you, and the wind, and the whole town below.</p>"}</section>
   <section class="final-stats"><h2>Your life</h2>${statsUI(l)}<div class="people">${BONDS.filter((b) => b !== "partner" || partnered(l)).map((b) => `<article class="person"><div><strong>${esc(bondName(b, l))}</strong></div>${hearts(l.bonds[b])}</article>`).join("")}</div></section>
   <section class="shelf"><h2>What you kept</h2><div class="keepsakes">${keepsakes(l).map((k) => `<article><span class="ks-icon ${k.icon}" aria-hidden="true"></span><strong>${esc(k.title)}</strong></article>`).join("")}</div></section>
   <p class="closing">There's no perfect score for a life. Only the people who held the string with you.</p>
   <div class="actions">${btn("journal", "Read your journal", "secondary")}${btn("start", "Live another life →", "primary big")}${btn("title", "Title", "ghost")}</div>
  </main>`;
}
