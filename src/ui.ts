/** HTML templates for every screen. Pure functions of the life state; main.ts wires events. */
import {
  chapters,
  people,
  text,
  personName,
  resolveWho,
  partnered,
  partnerName,
  kiteName,
  lexicon,
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
import { wordsHTML } from "./beats";
import { portraits, speaking } from "./portraits";
import { u, LANGS, type Lang, type UIKey } from "./i18n";
import { seasonOf } from "./town";
import { PATTERNS, TRIMS, kiteImage, kiteLook, lookOf, unlocked } from "./kite-art";
import { ENDINGS, endingsFound, type Album } from "./album";
import { explored, pathRows } from "./paths";

/** The beat currently shown in a dialog, a reply or a chapter intro. */
export type BeatState = { list: { text: string; memory?: boolean }[]; index: number };
/** Beat dots double as a way back: tap one to re-read that part. */
const dots = (b: BeatState) =>
  b.list.length > 1
    ? `<span class="dots">${b.list.map((_, i) => `<button type="button" data-action="beat-go" data-value="${i}" class="${i === b.index ? "on" : i < b.index ? "past" : ""}" aria-label="${u("beat.part", { n: i + 1, total: b.list.length })}"${i === b.index ? ' aria-current="step"' : ""}></button>`).join("")}</span>`
    : "";
function beatBlock(b: BeatState, full: string) {
  const cur = b.list[Math.min(b.index, b.list.length - 1)];
  const last = b.index >= b.list.length - 1;
  return `<p class="sr-only">${esc(full)}</p>
   <button type="button" class="beat${cur.memory ? " memory" : ""}${last ? " last" : ""}" data-action="beat" ${last ? 'tabindex="-1"' : `aria-label="${u("beat.continue")}"`}>${cur.memory ? `<span class="memo" aria-hidden="true">${u("beat.remember")}</span>` : ""}<span class="line" aria-hidden="true">${wordsHTML(cur.text)}</span>${last ? "" : '<span class="more" aria-hidden="true">▸</span>'}</button>`;
}

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export const btn = (action: string, label: string, cls = "ghost", extra = "") => `<button type="button" class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
const closeBtn = (label = u("close")) => btn("close", "×", "close", `aria-label="${esc(label)}"`);
const signed = (v: number) => `${v > 0 ? "+" : ""}${v}`;

export const statInfo: Record<Stat, { icon: string; readonly name: string }> = {
  health: { icon: "♥", get name() { return u("stat.health"); } },
  joy: { icon: "☀", get name() { return u("stat.joy"); } },
  savings: { icon: "●", get name() { return u("stat.savings"); } },
};
export function bondName(b: BondKey, l: Life) {
  return b === "family" ? u("bond.family") : b === "rowan" ? people.rowan.name : b === "maya" ? people.maya.name : partnered(l) ? partnerName(l) : u("bond.partner");
}

/** Effect chips: stats as coloured pills, bonds as hearts. */
export function chips(e: Effect, l: Life) {
  const out: string[] = [];
  for (const s of STATS) {
    const v = e[s];
    if (!v) continue;
    out.push(`<span class="chip ${s} ${v < 0 ? "down" : "up"}" aria-label="${esc(statInfo[s].name)} ${signed(v)}"><b aria-hidden="true">${statInfo[s].icon}</b>${signed(v)}</span>`);
  }
  for (const b of BONDS) {
    const v = e[b];
    if (!v) continue;
    const who = bondName(b, l);
    out.push(`<span class="chip bond ${v < 0 ? "down" : "up"}" aria-label="${esc(u("bond.aria", { who, v: signed(v) }))}"><b aria-hidden="true">${v > 0 ? "❤" : "💔"}</b>${esc(who)} ${signed(v)}</span>`);
  }
  return out.join("");
}

export function hearts(n: number) {
  return `<span class="hearts" aria-label="${esc(u("hearts.aria", { n, max: BOND_MAX }))}">${Array.from({ length: BOND_MAX }, (_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("")}</span>`;
}

const HONORIFIC = /^(Ms|Nana|Mrs|Cô|Bà|bà|Bố|Mẹ) /;
function portrait(who: string, l: Life, size = "") {
  const id = resolveWho(who, l);
  const p = people[id];
  const colour = who === "you" ? COLOURS[l.identity.colour] : (p?.color ?? "8c5cf0");
  const name = personName(who, l);
  const img = (speaking.who && speaking.who === id && speaking.url) || portraits.get(who === "you" ? "you" : id);
  return `<span class="portrait ${size}${img ? " photo" : ""}" style="--c:#${colour}" aria-hidden="true">${img ? `<img src="${img}" alt="">` : esc(who === "you" ? "★" : [...name.replace(HONORIFIC, "")][0] ?? "?")}</span>`;
}

// ---------------------------------------------------------------------------
// title
// ---------------------------------------------------------------------------
export function titleUI(o: { saved: Life | null; identity: Identity; loading: boolean; loadError: string; legacy: boolean; invalid: boolean; storage: boolean; pace: string; graphics: string; sound: boolean; reduced: boolean; makeOpen: boolean; lang: Lang; album: number }) {
  const load = o.loadError
    ? esc(o.loadError)
    : o.loading
      ? u("title.loading")
      : o.saved?.complete
        ? esc(u("title.complete", { title: ending(o.saved).title }))
        : o.saved
          ? esc(u("title.saved", { n: o.saved.chapter + 1, title: chapters[o.saved.chapter].title }))
          : u("title.fresh");
  return `<main class="title">
  <section class="title-card">
   <p class="kicker">${u("title.kicker")}</p>
   <h1><span>${u("title.game")}</span><em>${u("title.place")}</em></h1>
   <p class="tagline">${u("title.tagline")}</p>
   <div class="start">${o.saved ? btn("continue", `${o.saved.complete ? u("title.readStory") : u("title.continue")} <span>→</span>`, "primary big", o.loading ? "disabled" : "") : ""}${btn("start", o.saved ? u("title.beginNew") : `${u("title.begin")} <span>→</span>`, o.saved ? "secondary" : "primary big", o.loading ? "disabled" : "")}</div>
   <p class="load" role="status">${load}</p>
   ${o.loadError ? btn("retry", u("title.retry"), "secondary") : ""}
   ${o.legacy && !o.saved ? `<p class="note">${u("title.legacy")}</p>` : ""}
   ${o.invalid ? `<p class="note warn">${u("title.invalid")}</p>` : ""}
   ${o.storage ? `<p class="note warn">${u("title.storage")}</p>` : ""}
   <details class="make"${o.makeOpen ? " open" : ""}><summary>${u("title.make")}</summary>
    <label class="field">${u("title.name")}<input name="name" maxlength="24" value="${esc(o.identity.name === "You" ? "" : o.identity.name)}" placeholder="${esc(u("title.name"))}" autocomplete="off"></label>
    <fieldset class="field"><legend>${u("title.hair")}</legend><div class="pick hair">${HAIR_STYLES.map((_, i) => `<button type="button" data-action="hair" data-value="${i}" aria-pressed="${o.identity.hair === i}">${u(`hair.${i}` as UIKey)}</button>`).join("")}</div></fieldset>
    <fieldset class="field"><legend>${u("title.skin")}</legend><div class="pick swatches">${SKINS.map((c, i) => `<button type="button" data-action="skin" data-value="${i}" aria-pressed="${o.identity.skin === i}" aria-label="${esc(u("title.skinN", { n: i + 1 }))}" style="--c:#${c}"></button>`).join("")}</div></fieldset>
    <fieldset class="field"><legend>${u("title.colour")}</legend><div class="pick swatches">${COLOURS.map((c, i) => `<button type="button" data-action="colour" data-value="${i}" aria-pressed="${o.identity.colour === i}" aria-label="${esc(u("title.colourN", { n: i + 1 }))}" style="--c:#${c}"></button>`).join("")}</div></fieldset>
    <div class="row"><label class="field">${u("title.pace")}<select name="pace">${(["gentle", "normal", "brisk"] as const).map((n) => `<option value="${n}" ${o.pace === n ? "selected" : ""}>${u(`pace.${n}`)}</option>`).join("")}</select></label>
    ${graphicsSelect(o.graphics)}${langSelect(o.lang)}</div>
    <small class="help">${u("title.graphicsHelp")}</small>
   </details>
  </section>
  <footer class="title-foot"><span>${u("title.madeWith")}</span><div>${o.album ? btn("album", `✦ ${u("title.album")}`, "ghost small") : ""}${btn("sound", o.sound ? u("sound.on") : u("sound.off"), "ghost small")}${btn("motion", o.reduced ? u("motion.gentle") : u("motion.full"), "ghost small")}</div></footer>
 </main>`;
}
const graphicsSelect = (g: string) =>
  `<label class="field">${u("gfx.label")}<select name="graphics"><option value="high" ${g === "high" ? "selected" : ""}>${u("gfx.high")}</option><option value="low" ${g === "low" ? "selected" : ""}>${u("gfx.low")}</option></select></label>`;
const langSelect = (lang: Lang) =>
  `<label class="field">${u("title.language")}<select name="lang">${LANGS.map((x) => `<option value="${x.code}" lang="${x.code}" ${x.code === lang ? "selected" : ""}>${x.name}</option>`).join("")}</select></label>`;

// ---------------------------------------------------------------------------
// the HUD
// ---------------------------------------------------------------------------
export function statsUI(l: Life) {
  return `<div class="stats" aria-label="${esc(u("hud.yourLife"))}">${STATS.map(
    (s) => `<div class="stat ${s}"><b aria-hidden="true">${statInfo[s].icon}</b><span><small>${esc(statInfo[s].name)}</small><strong>${l.stats[s]}</strong></span><i style="--v:${l.stats[s]}%"></i></div>`,
  ).join("")}</div>`;
}

export function objectiveLine(l: Life) {
  const main = mainMoment(l);
  if (!mainDone(l)) return main.who === "you" ? u("obj.findLast") : u("obj.find", { name: personName(main.who, l) });
  if (freeTime(l) > 0 && chapterOf(l).free < 50) return u("obj.spend");
  return u("obj.gate");
}

const SEASON_ICON = { spring: "✿", summer: "☀", autumn: "❦", winter: "❄" } as const;
export function seasonChip(chapter: number) {
  const s = seasonOf(chapter);
  return `<span class="season s-${s}"><b aria-hidden="true">${SEASON_ICON[s]}</b>${u(`season.${s}`)}</span>`;
}

export function playUI(l: Life, o: { hunt: string; notice: string; saveStatus: string }) {
  const ch = chapterOf(l);
  const free =
    ch.free > 50
      ? `<span class="all-time">${u("hud.allTime")}</span>`
      : `<span class="suns" aria-label="${esc(u("hud.freeLeft", { left: freeTime(l), total: ch.free }))}">${Array.from({ length: ch.free }, (_, i) => `<i class="${i < freeTime(l) ? "on" : ""}">☀</i>`).join("")}</span>`;
  return `<header class="hud-top">
   <div class="chapter-chip"><span class="kicker">${esc(u("hud.chapterAge", { n: l.chapter + 1, age: ch.age }))} ${seasonChip(l.chapter)}</span><h1>${esc(ch.title)}</h1><span class="place">${esc(ch.place)}</span></div>
   ${statsUI(l)}
  </header>
  <ol class="lifeline" aria-label="${esc(u("hud.chapters"))}">${chapters.map((c, i) => `<li class="${i < l.chapter ? "past" : i === l.chapter ? "now" : ""}" title="${esc(c.title)}"></li>`).join("")}</ol>
  <aside class="quest"><span class="quest-mark" aria-hidden="true">!</span><div><strong>${esc(text(ch.objective, l))}</strong><small>${esc(objectiveLine(l))}</small></div><div class="free"><small>${u("hud.free")}</small>${free}</div></aside>
  ${o.hunt}
  <div id="toast" class="toast" role="status">${o.notice}</div>
  <div class="controls"><div class="dpad" aria-label="Movement">${["0,-1:up:↑", "-1,0:left:←", "1,0:right:→", "0,1:down:↓"]
    .map((d) => {
      const [v, c, s] = d.split(":");
      return `<button data-pad="${v}" class="${c}" aria-label="${esc(u("hud.moveHelp", { dir: s }))}">${s}</button>`;
    })
    .join("")}</div>
   <button class="action" data-action="interact" id="interact" disabled><kbd>E</kbd><span id="interact-label">${u("hud.lookAround")}</span></button></div>
  <footer class="hud-bottom"><div>${btn("explore", u("hud.goto"), "pill")}${btn("journal", `${u("hud.journal")} <b class="count">${l.memories.length}</b>`, "pill")}${btn("briefing", u("hud.chapter"), "pill")}</div>
   <span id="save-status" class="save">${o.saveStatus}</span>
   <div>${btn("sound", "♪", "round", `aria-label="${esc(u("hud.sound"))}"`)}${btn("pause", "Ⅱ", "round", `aria-label="${esc(u("hud.pause"))}"`)}</div></footer>`;
}

export function huntUI(l: Life) {
  const a = chapterOf(l).activity;
  const r = record(l);
  if (a.kind !== "hunt" || !r.started || r.complete) return "";
  return `<div class="hunt" role="status"><strong>${esc(text(a.title, l))}</strong><ul>${a.items!.map((it, i) => `<li class="${r.found.includes(i) ? "got" : ""}">${r.found.includes(i) ? "✔" : "○"} ${esc(it.name)}</li>`).join("")}</ul><small>${u("hud.huntHelp")}</small></div>`;
}

// ---------------------------------------------------------------------------
// panels
// ---------------------------------------------------------------------------
export function briefingUI(l: Life, first: boolean, b: BeatState, reopened: boolean) {
  const ch = chapterOf(l);
  const last = b.index >= b.list.length - 1;
  const time = ch.free > 50 ? u("brief.noClock") : `${"☀".repeat(ch.free)} ${u("brief.freeHours", { n: ch.free })}`;
  return `<div class="cinema" role="dialog" aria-modal="true" aria-labelledby="brief-title">
   <div class="bar top" aria-hidden="true"></div><div class="bar bottom" aria-hidden="true"></div>
   <header class="cine-head"><span class="cine-num" aria-hidden="true">${String(l.chapter + 1).padStart(2, "0")}</span><div>
    <p class="kicker">${esc(u("brief.chapterOf", { n: l.chapter + 1, age: ch.age }))} ${seasonChip(l.chapter)}</p><h2 id="brief-title" tabindex="-1">${esc(ch.title)}</h2><p class="place">${esc(ch.place)}</p></div></header>
   <div class="cine-text">${beatBlock(b, text(ch.intro, l))}${dots(b)}</div>
   <footer class="cine-foot">
    <div class="cine-goal"><span class="quest-mark" aria-hidden="true">!</span><strong>${esc(text(ch.objective, l))}</strong><span class="cine-time" title="${esc(u("brief.timeHelp"))}">${time}</span>${driftUI(l)}</div>
    <div class="cine-actions">${last ? btn("close", reopened ? u("brief.back") : u("brief.begin"), "primary big") : `${btn("close", u("brief.skip"), "ghost")}${btn("beat", u("brief.continue"), "primary big")}`}</div>
   </footer>
   ${first && last ? `<ul class="tips" aria-label="${esc(u("brief.tipsLabel"))}"><li>${u("brief.tip1")}</li><li>${u("brief.tip2")}</li><li>${u("brief.tip3")}</li><li>${u("brief.tip4")}</li></ul>` : ""}
  </div>`;
}

/** Bonds that cooled at the last chapter change, told plainly on the chapter card. */
function driftUI(l: Life) {
  if (!l.drift?.length || !l.chapter) return "";
  const names = l.drift.map((b) => bondName(b, l));
  return `<span class="drift" title="${esc(u("drift.title", { names: names.join(u("drift.join")) }))}">${esc(u("drift.chip", { names: names.join(", ") }))}</span>`;
}

export function momentUI(l: Life, m: Moment, b: BeatState) {
  const who = m.who;
  const id = resolveWho(who, l);
  const role = who === "you" ? u("dlg.lastFestival") : (people[id]?.role(l) ?? "");
  const ctx = m.context?.(l);
  const last = b.index >= b.list.length - 1;
  const opts = visibleOptions(l, m);
  return `<section class="dialog talk${last ? " choosing" : ""}" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
   <header>${portrait(who, l)}<div><span class="kicker ${m.kind}">${m.kind === "main" ? u("dlg.main") : u("dlg.side")}</span><h2 id="dlg-title" tabindex="-1">${esc(text(m.title, l))}</h2><p class="who">${esc(personName(who, l))}${role ? ` · ${esc(role)}` : ""}</p></div>${dots(b)}${closeBtn(u("dlg.notNow"))}</header>
   <div class="dialog-body">${beatBlock(b, [text(m.prompt, l), ctx ?? ""].join(" "))}
   ${
     last
       ? `<div class="options n${opts.length}">${opts
           .map(([o, i], n) => {
             const open = optionOpen(l, o);
             return `<button class="option" data-action="choose" data-index="${i}" style="--n:${n}" ${open ? "" : 'disabled aria-disabled="true"'}><span class="num">${n + 1}</span><span class="body"><strong>${esc(text(o.label, l))}</strong><small>${esc(text(o.hint, l))}</small>${open ? `<span class="chips">${chips(effectOf(l, o), l)}</span>` : `<em class="lock">🔒 ${esc(o.need!.why)}</em>`}</span></button>`;
           })
           .join("")}</div>`
       : `<div class="beat-foot">${btn("beat-all", u("beat.skipChoice"), "ghost small")}</div>`
   }</div>
  </section>`;
}

export function responseUI(title: string, b: BeatState, full: string, effect: Effect, l: Life, note = "", who?: string) {
  const last = b.index >= b.list.length - 1;
  return `<section class="dialog response" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
   <header>${who ? portrait(who, l) : `<span class="portrait" style="--c:#2ed3b0" aria-hidden="true">✦</span>`}<div><span class="kicker">${u("dlg.what")}</span><h2 id="dlg-title" tabindex="-1">${esc(title)}</h2></div>${dots(b)}</header>
   <div class="dialog-body">${beatBlock(b, full)}
   ${
     last
       ? `<div class="outcome">${Object.keys(effect).length ? `<div class="chips big">${chips(effect, l)}</div>` : ""}${note ? `<p class="note">${esc(note)}</p>` : ""}${btn("close", u("dlg.continue"), "primary")}</div>`
       : `<div class="beat-foot">${btn("beat-all", u("beat.skip"), "ghost small")}${btn("beat", u("dlg.continue"), "primary")}</div>`
   }</div>
  </section>`;
}

export function activityUI(l: Life, kite: { active: boolean; assist: boolean }) {
  const a = chapterOf(l).activity;
  const r = record(l);
  const title = text(a.title, l);
  const head = `<header>${portrait(a.who ?? "you", l)}<div><span class="kicker side">${u("actv.kicker")}</span><h2 id="dlg-title" tabindex="-1">${esc(title)}</h2><p class="who">${esc(u("actv.keepsake", { name: a.keepsake }))}</p></div>${closeBtn()}</header>`;
  if (!r.started) {
    const can = freeTime(l) > 0;
    const unlimited = chapterOf(l).free > 50;
    return `<section class="dialog activity" role="dialog" aria-modal="true" aria-labelledby="dlg-title">${head}<div class="dialog-body"><p class="prompt">${esc(text(a.intro, l))}</p>
     <p class="note">${unlimited ? u("actv.noClock") : can ? u("actv.takes", { n: freeTime(l) }) : u("actv.noTime")}</p>
     <div class="actions">${btn("task-start", a.kind === "kite" ? u("actv.flyKite") : a.kind === "plan" ? u("actv.makePlan") : u("actv.startLooking"), "primary", can ? "" : "disabled")}${btn("close", u("actv.notNow"), "secondary")}</div></div></section>`;
  }
  if (a.kind === "plan") {
    const sum: Effect = {};
    for (const id of r.plan) for (const [k, v] of Object.entries(a.blocks!.find((b) => b.id === id)!.effect)) sum[k as Stat] = (sum[k as Stat] ?? 0) + (v ?? 0);
    return `<section class="dialog activity" role="dialog" aria-modal="true" aria-labelledby="dlg-title">${head}<div class="dialog-body"><p class="prompt">${esc(text(a.intro, l))}</p>
     <ol class="slots">${[0, 1, 2].map((i) => `<li class="${r.plan[i] ? "full" : ""}"><small>${u("actv.block", { n: i + 1 })}</small><strong>${r.plan[i] ? esc(text(a.blocks!.find((b) => b.id === r.plan[i])!.label, l)) : "—"}</strong></li>`).join("")}</ol>
     <div class="blocks">${a.blocks!.map((b) => `<button class="block" data-action="task-plan" data-step="${b.id}" ${r.plan.length >= 3 ? "disabled" : ""}><strong>${esc(text(b.label, l))}</strong><small>${esc(b.detail)}</small><span class="chips">${chips(b.effect, l)}</span></button>`).join("")}</div>
     <p class="note">${r.plan.length ? `${u("actv.soFar")} ${chips(sum, l) || u("actv.noChange")}` : u("actv.chooseThree")}</p>
     <div class="actions">${btn("task-undo", u("actv.undo"), "secondary", r.plan.length ? "" : "disabled")}${btn("task-commit", u("actv.keepPlan"), "primary", r.plan.length === 3 ? "" : "disabled")}</div></div></section>`;
  }
  if (a.kind === "kite") {
    return `<section class="dialog activity kite" role="dialog" aria-modal="true" aria-labelledby="dlg-title">${head}<div class="dialog-body"><p class="prompt">${esc(text(a.intro, l))}</p>
     <div class="kite-wrap"><canvas id="kite-canvas" aria-label="${esc(u("actv.kiteAria"))}"></canvas><div class="kite-hud"><span id="kite-time">20s</span><span id="kite-score">${u("actv.inBand", { n: 0 })}</span></div></div>
     <div class="actions">${btn("kite-hold", u("actv.hold"), "primary hold")}${btn("kite-assist", kite.assist ? u("actv.assistOn") : u("actv.assistOff"), "secondary")}${btn("kite-skip", u("actv.windDecide"), "ghost")}</div></div></section>`;
  }
  return `<section class="dialog activity" role="dialog" aria-modal="true" aria-labelledby="dlg-title">${head}<div class="dialog-body"><p class="prompt">${esc(text(a.intro, l))}</p><div class="actions">${btn("close", u("actv.keepLooking"), "primary")}</div></div></section>`;
}

export function exploreUI(places: { id: string; kind: string; label: string; status?: string }[]) {
  const icon = (p: { kind: string; status?: string }) => (p.kind === "person" ? (p.status === "main" ? "!" : p.status === "side" ? "…" : p.status === "guest" ? "?" : "•") : p.kind === "activity" ? "✦" : p.kind === "exit" ? "→" : p.kind === "hunt" ? "★" : "○");
  const sub = (p: { kind: string; status?: string }) =>
    p.kind === "person"
      ? p.status === "main"
        ? u("explore.main")
        : p.status === "side"
          ? u("explore.side")
          : p.status === "guest"
            ? u("explore.meet")
            : u("explore.hello")
      : p.kind === "activity"
        ? u("explore.activity")
        : p.kind === "exit"
          ? u("explore.exit")
          : p.kind === "hunt"
            ? u("explore.hunt")
            : u("explore.find");
  return `<div class="shade"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="m-title"><header><h2 id="m-title" tabindex="-1">${u("explore.title")}</h2>${closeBtn()}</header>
   <div class="places">${places.map((p) => `<button data-action="travel" data-place="${p.id}" class="place-row is-${p.status ?? p.kind}"><span class="ico">${icon(p)}</span><span><strong>${esc(p.label)}</strong><small>${sub(p)}</small></span><b>→</b></button>`).join("") || `<p>${u("explore.nothing")}</p>`}</div></section></div>`;
}

// ---------------------------------------------------------------------------
// the journal: people, your kite, keepsakes, paths, your story
// ---------------------------------------------------------------------------
export const JOURNAL_TABS = ["people", "kite", "keepsakes", "paths", "story"] as const;

function kiteTab(l: Life) {
  const look = kiteLook(l);
  const main = look.main;
  return `<div class="workshop">
   <figure class="kite-preview"><img src="${kiteImage(look.pattern, main, look.trim, 240)}" alt="" width="240" height="240"><figcaption>${esc(u("end.kite", { colour: kiteName(l) }))} · ${u(`kite.pattern.${look.pattern}`)}</figcaption></figure>
   <div class="workshop-tools"><p class="help">${u("kite.help")}</p>
    <fieldset class="field"><legend>${u("kite.pattern")}</legend><div class="patterns">${PATTERNS.map((p) => {
      const open = unlocked(l, p);
      const how = p === "plain" ? "" : u(`kite.how.${p}` as UIKey);
      return `<button type="button" data-action="kite-pattern" data-value="${p}" aria-pressed="${look.pattern === p}" ${open ? "" : `disabled aria-disabled="true" title="${esc(u("kite.earn", { how }))}"`}><img src="${kiteImage(p, open ? main : "#9aa3b5", open ? look.trim : "#dfe3ea", 72)}" alt="" width="48" height="48"><span>${u(`kite.pattern.${p}`)}</span>${open ? "" : `<small>🔒 ${esc(u("kite.earn", { how }))}</small>`}</button>`;
    }).join("")}</div></fieldset>
    <fieldset class="field"><legend>${u("kite.trim")}</legend><div class="pick swatches">${TRIMS.map((c, i) => `<button type="button" data-action="kite-trim" data-value="${i}" aria-pressed="${l.style.trim === i}" aria-label="${esc(u("title.colourN", { n: i + 1 }))}" style="--c:#${c}"></button>`).join("")}</div></fieldset>
   </div></div>`;
}

const PATH_STATUS: Record<string, UIKey> = { chosen: "paths.chosen", other: "paths.otherLife", open: "paths.notTaken", locked: "paths.locked", hidden: "paths.locked" };
function pathsTab(l: Life, album: Album) {
  const rows = pathRows(l, album);
  const ex = explored(album, l);
  return `<p class="help">${u("paths.help")}</p><p class="explored">${esc(u("paths.explored", { n: ex.n, total: ex.total }))}</p>
   <ol class="paths">${rows
     .map(
       (r) => `<li class="path-ch${r.reached ? " reached" : ""}${r.chapter === l.chapter && !l.complete ? " now" : ""}"><h4><span>${r.chapter + 1}</span> ${esc(r.reached ? r.title : chapters[r.chapter].title)}</h4>${
         r.reached
           ? `<ul>${r.options.map((o) => `<li class="st-${o.status}"><i aria-hidden="true"></i><span>${o.status === "hidden" ? "? ? ?" : esc(o.label)}</span><small>${u(PATH_STATUS[o.status])}</small></li>`).join("")}</ul>`
           : `<p class="not-yet">${u("paths.notYet")}</p>`
       }</li>`,
     )
     .join("")}</ol>`;
}

export function journalUI(l: Life, tab: string, album: Album) {
  const tabs: [string, UIKey][] = JOURNAL_TABS.map((t) => [t, `tab.${t}` as UIKey]);
  let body = "";
  if (tab === "people") {
    const line = (b: BondKey, n: number) => u(`people.${b === "family" ? "family" : b === "partner" ? "partner" : "friend"}.${n}` as UIKey);
    body = `<div class="people">${BONDS.filter((b) => b !== "partner" || partnered(l))
      .map((b) => {
        const who = b === "family" ? "mum" : b === "partner" ? "partner" : b;
        return `<article class="person">${portrait(who, l)}<div><strong>${esc(bondName(b, l))}</strong><small>${line(b, l.bonds[b])}</small></div>${hearts(l.bonds[b])}</article>`;
      })
      .join("")}</div>
     <h3>${u("people.you")}</h3>${statsUI(l)}<p class="help">${l.facts.road ? `${esc(career(l))}. ` : ""}${u("people.help")}</p>`;
  } else if (tab === "kite") {
    body = kiteTab(l);
  } else if (tab === "keepsakes") {
    const ks = keepsakes(l);
    body = ks.length ? `<div class="keepsakes">${ks.map((k) => `<article><span class="ks-icon ${k.icon}" aria-hidden="true"></span><small>${u("keepsakes.chapter", { n: k.chapter + 1 })}</small><strong>${esc(k.title)}</strong><p>${esc(k.text)}</p></article>`).join("")}</div>` : `<p>${u("keepsakes.empty")}</p>`;
  } else if (tab === "paths") {
    body = pathsTab(l, album);
  } else {
    const byChapter = new Map<number, typeof l.memories>();
    for (const m of l.memories) byChapter.set(m.chapter, [...(byChapter.get(m.chapter) ?? []), m]);
    body =
      [...byChapter.entries()]
        .reverse()
        .map(([c, ms]) => `<section class="mem-chapter"><h4>${c + 1} · ${esc(chapters[c].title)}</h4>${ms.map((m) => `<details class="memory"><summary><strong>${esc(m.title)}</strong> ${esc(m.text)}</summary><p>${esc(m.detail)}</p></details>`).join("")}</section>`)
        .join("") || `<p>${u("story.empty")}</p>`;
  }
  return `<div class="shade"><section class="modal journal" role="dialog" aria-modal="true" aria-labelledby="m-title"><header><h2 id="m-title" tabindex="-1">${u("journal.title")}</h2>${closeBtn()}</header>
   <div class="tabs" role="tablist">${tabs.map(([id, key]) => `<button role="tab" data-action="tab" data-tab="${id}" aria-selected="${tab === id}">${u(key)}</button>`).join("")}</div>
   <div class="tab-body tab-${esc(tab)}">${body}</div></section></div>`;
}

export function pauseUI(o: { storage: boolean; graphics: string; largeText: boolean; reduced: boolean; sound: boolean; music: boolean; closeups: boolean; lang: Lang }) {
  return `<div class="shade"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="m-title"><header><h2 id="m-title" tabindex="-1">${u("pause.title")}</h2>${closeBtn(u("pause.resume"))}</header>
   <p>${o.storage ? u("pause.noSave") : u("pause.saved")}</p>
   <div class="menu">${btn("close", u("pause.resume"), "primary")}
    <div class="row">${graphicsSelect(o.graphics)}${langSelect(o.lang)}</div>
    ${btn("briefing", u("pause.readCard"), "secondary")}${btn("text-size", o.largeText ? u("pause.textLarge") : u("pause.textStandard"), "secondary")}${btn("closeups", o.closeups ? u("pause.closeupsOn") : u("pause.closeupsOff"), "secondary")}${btn("motion", o.reduced ? u("pause.motionOn") : u("pause.motionOff"), "secondary")}${btn("sound", o.sound ? u("pause.soundOn") : u("pause.soundOff"), "secondary")}${btn("music", o.music ? u("pause.musicOn") : u("pause.musicOff"), "secondary", o.sound ? "" : "disabled")}${btn("title", u("pause.title2"), "ghost")}</div>
   <p class="help">${u("pause.help")}</p></section></div>`;
}

export function restartUI() {
  return `<div class="shade"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="m-title"><header><h2 id="m-title" tabindex="-1">${u("restart.title")}</h2>${closeBtn()}</header><p>${u("restart.body")}</p><div class="menu">${btn("new-confirm", u("restart.confirm"), "primary")}${btn("close", u("restart.keep"), "secondary")}</div></section></div>`;
}

// ---------------------------------------------------------------------------
// the ending, the album of lives
// ---------------------------------------------------------------------------
export function endingUI(l: Life, o: { canShare: boolean; album: boolean }) {
  const e = ending(l);
  const name = l.identity.name && l.identity.name !== "You" ? l.identity.name : "";
  const look = kiteLook(l);
  return `<main class="ending">
   <p class="kicker">${u("end.kicker")}</p>
   <h1>${esc(e.title)}</h1>
   <p class="line">${esc(e.line)}</p>
   <p class="who">${esc(name ? u("end.namedStory", { name }) : u("end.yourStory"))} · <img class="kite-mini" src="${kiteImage(look.pattern, look.main, look.trim, 48)}" alt="" width="22" height="22"> ${esc(u("end.kite", { colour: kiteName(l) }))}</p>
   <section class="epilogue">${e.lines.map((x) => `<p>${esc(x)}</p>`).join("")}</section>
   <section class="festival"><h2>${u("end.festival")}</h2>${e.present.length ? `<div class="present">${e.present.map((n) => `<span>${esc(n)}</span>`).join("")}</div>` : `<p>${u("end.alone")}</p>`}</section>
   <section class="final-stats"><h2>${u("end.life")}</h2>${statsUI(l)}<div class="people">${BONDS.filter((b) => b !== "partner" || partnered(l))
     .map((b) => `<article class="person"><div><strong>${esc(bondName(b, l))}</strong></div>${hearts(l.bonds[b])}</article>`)
     .join("")}</div></section>
   <section class="shelf"><h2>${u("end.kept")}</h2><div class="keepsakes">${keepsakes(l)
     .map((k) => `<article><span class="ks-icon ${k.icon}" aria-hidden="true"></span><strong>${esc(k.title)}</strong></article>`)
     .join("")}</div></section>
   <p class="closing">${u("end.closing")}</p>
   <div class="actions share">${btn("card-save", `⤓ ${u("end.picture")}`, "secondary")}${o.canShare ? btn("card-share", `↗ ${u("end.share")}`, "secondary") : ""}${o.album ? btn("album", `✦ ${u("end.album")}`, "secondary") : ""}</div>
   <div class="actions">${btn("journal", u("end.journal"), "secondary")}${btn("start", u("end.again"), "primary big")}${btn("title", u("end.title"), "ghost")}</div>
  </main>`;
}

const ENDING_ICON = { keeper: "✺", heart: "❤", wanderer: "⚓", builder: "⌂", friend: "✦", ordinary: "☀" } as const;
export function albumUI(a: Album) {
  const found = endingsFound(a);
  const lives = [...a.lives].reverse();
  const present = (ids: string[]) => (ids.length ? u("album.present", { names: ids.map((w) => people[w]?.name ?? w).join(", ") }) : u("album.nobody"));
  return `<div class="shade"><section class="modal album" role="dialog" aria-modal="true" aria-labelledby="m-title"><header><h2 id="m-title" tabindex="-1">${u("album.title")}</h2>${closeBtn()}</header>
   <p class="explored">${esc(u("album.found", { n: found.size, total: ENDINGS.length }))}</p>
   <div class="endings">${ENDINGS.map((k) => {
     const got = found.has(k);
     const [title, line] = lexicon.archetype[k];
     return `<article class="ending-card${got ? " got" : ""}"><span class="ico" aria-hidden="true">${got ? ENDING_ICON[k] : "?"}</span><strong>${got ? esc(title) : u("album.locked")}</strong><small>${esc(got ? line : u(`album.hint.${k}`))}</small></article>`;
   }).join("")}</div>
   <h3>${u("album.lives")}</h3>
   ${
     lives.length
       ? `<ol class="lives">${lives
           .map((x) => {
             const look = lookOf(x.kite, x.pattern, x.trim);
             return `<li><img src="${kiteImage(look.pattern, look.main, look.trim, 64)}" alt="" width="40" height="40"><div><strong>${esc(lexicon.archetype[x.ending][0])}</strong><small>${esc([x.name, x.at ? new Date(x.at).toLocaleDateString(document.documentElement.lang || undefined) : ""].filter(Boolean).join(" · "))}</small><small>${esc(present(x.present))}</small></div></li>`;
           })
           .join("")}</ol>${btn("album-clear", u("album.clear"), "ghost small")}`
       : `<p>${u("album.empty")}</p>`
   }</section></div>`;
}
