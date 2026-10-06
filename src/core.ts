/**
 * Kitehaven rules. A life is an append-only log of actions replayed from a fresh start,
 * so a save can only ever contain states the game itself could have produced.
 *
 * Actions: talk:<moment>:<option> · find:<i> · meet:<who> · start · hunt:<i>
 *          plan:<block> · unplan · commit · kite:<grade> · run:<c>-<s>-<h>-<st>:<who,…> · next
 */
import {
  chapters,
  people,
  text,
  resolveWho,
  partnered,
  partnerName,
  lexicon,
  type ArchetypeKey,
  type BondKey,
  type Effect,
  type KiteGrade,
  type Moment,
  type Option,
  type Stat,
} from "./content";
import { u } from "./i18n";

export const SAVE_KEY = "choice-of-life-kitehaven-v1";
export const LEGACY_SAVE_KEY = "choice-of-life-3d-v1";
export const HAIR_STYLES = ["short", "swoop", "bob", "pony", "bun", "curls", "long", "spiky"] as const;
export const SKINS = ["f2c29b", "e8a97e", "c98a5e", "a86a45", "8d5a3b", "6b4028"];
export const COLOURS = ["2f7de1", "ee3b3b", "1fb8a8", "ffc234", "8c5cf0", "ff5f8f"];
export const STATS: Stat[] = ["health", "joy", "savings"];
export const BONDS: BondKey[] = ["family", "rowan", "maya", "partner"];
export const BOND_MAX = 5;
export const SPAWN = { x: 0, z: 2.6 };

export interface Identity {
  name: string;
  skin: number;
  hair: number;
  colour: number;
}
export interface Memory {
  id: string;
  chapter: number;
  title: string;
  text: string;
  detail: string;
  effect: Effect;
  /** Bonds this moment tended (raw intent, so time spent at five hearts still counts). */
  tended?: BondKey[];
}
const tendedBy = (e: Effect) => BONDS.filter((b) => (e[b] ?? 0) > 0);
export interface ActivityState {
  started: boolean;
  found: number[];
  plan: string[];
  grade?: KiteGrade;
  complete: boolean;
}
export interface Life {
  version: 2;
  identity: Identity;
  log: string[];
  position: { x: number; z: number };
  chapter: number;
  stats: Record<Stat, number>;
  bonds: Record<BondKey, number>;
  facts: Record<string, string>;
  done: Record<string, number>;
  used: number;
  found: string[];
  meetings: string[];
  activities: Record<string, ActivityState>;
  memories: Memory[];
  complete: boolean;
  /** Bonds that cooled at the last chapter change (for the chapter card). */
  drift: BondKey[];
  /** Your kite design from the workshop (cosmetic, so it lives outside the action log). */
  style: KiteStyle;
}
export interface KiteStyle {
  pattern: string;
  trim: number;
}
export const TRIM_COUNT = 6;

export function newLife(identity: Identity): Life {
  return {
    version: 2,
    identity: { ...identity },
    log: [],
    position: { ...SPAWN },
    chapter: 0,
    stats: { health: 70, joy: 55, savings: 20 },
    bonds: { family: 1, rowan: 0, maya: 0, partner: 0 },
    facts: {},
    done: {},
    used: 0,
    found: [],
    meetings: [],
    activities: {},
    memories: [],
    complete: false,
    drift: [],
    style: { pattern: "plain", trim: 0 },
  };
}

// ---------------------------------------------------------------------------
// queries
// ---------------------------------------------------------------------------
export const chapterOf = (l: Life) => chapters[l.chapter];
export const freeTime = (l: Life) => Math.max(0, chapterOf(l).free - l.used);
export const record = (l: Life, chapter = l.chapter): ActivityState =>
  l.activities[String(chapter)] ?? { started: false, found: [], plan: [], complete: false };

/** People standing in the current scene: [who, anchor slot]. */
export function castOf(l: Life): [string, number][] {
  const seen = new Set<number>();
  const out: [string, number][] = [];
  for (const [who, slot, when] of chapterOf(l).cast) {
    if (when && !when(l)) continue;
    if (seen.has(slot)) continue;
    seen.add(slot);
    out.push([who, slot]);
  }
  return out;
}
export const present = (l: Life, who: string) => who === "you" || castOf(l).some(([w]) => w === resolveWho(who, l));

export function momentsOf(l: Life): Moment[] {
  return chapterOf(l).moments.filter((m) => (!m.when || m.when(l)) && present(l, m.who) && (m.who !== "partner" || partnered(l)));
}
export const mainMoment = (l: Life) => chapterOf(l).moments.find((m) => m.kind === "main")!;
export const isDone = (l: Life, id: string) => Object.hasOwn(l.done, id);
export const mainDone = (l: Life) => isDone(l, mainMoment(l).id);

export function canTalk(l: Life, m: Moment) {
  if (l.complete || isDone(l, m.id)) return false;
  if (!momentsOf(l).includes(m)) return false;
  return m.kind === "main" || freeTime(l) > 0;
}
export const visibleOptions = (l: Life, m: Moment) => m.options.map((o, i) => [o, i] as const).filter(([o]) => !o.show || o.show(l));
export const optionOpen = (l: Life, o: Option) => !o.need || o.need.test(l);
export const effectOf = (l: Life, o: Option): Effect => (typeof o.effect === "function" ? o.effect(l) : o.effect);
export function canStartActivity(l: Life) {
  const r = record(l);
  return !l.complete && !r.started && freeTime(l) > 0;
}
export const canLeave = (l: Life) => !l.complete && mainDone(l);

// ---------------------------------------------------------------------------
// transitions (all pure: they return a new life, or the same one if refused)
// ---------------------------------------------------------------------------
function applyEffect(l: Life, e: Effect): Effect {
  const actual: Effect = {};
  for (const [k, v] of Object.entries(e) as [Stat | BondKey, number][]) {
    if (!v) continue;
    if ((STATS as string[]).includes(k)) {
      const s = k as Stat;
      const before = l.stats[s];
      l.stats[s] = Math.max(0, Math.min(100, before + v));
      if (l.stats[s] !== before) actual[s] = l.stats[s] - before;
    } else {
      const b = k as BondKey;
      if (b === "partner" && !partnered(l) && v > 0 && !l.facts.partner) continue;
      const before = l.bonds[b];
      l.bonds[b] = Math.max(0, Math.min(BOND_MAX, before + v));
      if (l.bonds[b] !== before) actual[b] = l.bonds[b] - before;
    }
  }
  return actual;
}

/** Which bond a person belongs to (people outside these four don't decay). */
export const bondOf = (who: string, l: Life): BondKey | null =>
  ["mum", "dad", "nana", "pip"].includes(who) ? "family" : who === "rowan" ? "rowan" : who === "maya" ? "maya" : partnered(l) && who === l.facts.partner.toLowerCase() ? "partner" : null;

/**
 * Relationships need tending: when someone is right there in the chapter and you give
 * them none of your time, the bond cools by a heart. Returns the bonds that cooled.
 */
function neglect(l: Life): BondKey[] {
  const presentBonds = new Set(castOf(l).map(([w]) => bondOf(w, l)).filter((b): b is BondKey => !!b));
  const tended = new Set<BondKey>();
  for (const m of l.memories) if (m.chapter === l.chapter) for (const b of m.tended ?? []) tended.add(b);
  const cooled: BondKey[] = [];
  for (const b of presentBonds) if (!tended.has(b) && l.bonds[b] > 0) cooled.push(b);
  return cooled;
}

/** Ageing, the cost of living, income, and joy settling back to everyday life. */
const AGE = [0, 0, 0, 0, 0, 0, 2, 3, 4, 5, 6, 7];
function seasons(l: Life) {
  const c = l.chapter;
  const e: Effect = {};
  let money = c >= 5 ? -8 : 0;
  if (c >= 6 && c <= 10) money += 6 + (l.facts.road === "city" ? 3 : 0) + (l.facts.voss === "joined" ? 5 : l.facts.voss === "inside" ? 2 : 0) + (l.facts.peak === "yes" ? 6 : 0);
  else if (c === 11) money += 5;
  e.savings = money;
  if (AGE[c]) e.health = -AGE[c];
  e.joy = Math.round((50 - l.stats.joy) * 0.45);
  applyEffect(l, e);
}

function talk(l: Life, id: string, index: number): Life | null {
  const m = chapterOf(l).moments.find((x) => x.id === id);
  if (!m || !canTalk(l, m)) return null;
  const o = m.options[index];
  if (!o || (o.show && !o.show(l)) || !optionOpen(l, o)) return null;
  // Everything is evaluated against the life *before* the choice.
  const effect = effectOf(l, o);
  const facts = typeof o.facts === "function" ? o.facts(l) : (o.facts ?? {});
  const reply = text(o.reply, l);
  const memory = text(o.memory, l);
  const title = text(m.title, l);
  const s = structuredClone(l);
  s.done[id] = index;
  if (m.kind === "side") s.used += 1;
  Object.assign(s.facts, facts);
  if (facts.partner && facts.partner !== "none") s.bonds.partner = 0;
  const actual = applyEffect(s, effect);
  s.memories.push({ id: `m:${id}`, chapter: s.chapter, title, text: memory, detail: reply, effect: actual, tended: tendedBy(effect) });
  return s;
}

function find(l: Life, i: number): Life | null {
  const d = chapterOf(l).finds[i];
  const key = `${l.chapter}:${i}`;
  if (!d || l.complete || l.found.includes(key)) return null;
  const s = structuredClone(l);
  s.found.push(key);
  const actual = applyEffect(s, { [d.stat]: 2 });
  s.memories.push({ id: `f:${key}`, chapter: s.chapter, title: d.name, text: d.line, detail: d.line, effect: actual });
  return s;
}

function meet(l: Life, who: string): Life | null {
  const guests = chapterOf(l).guests ?? [];
  if (l.complete || !guests.includes(who) || l.meetings.includes(who)) return null;
  const s = structuredClone(l);
  s.meetings.push(who);
  return s;
}

function finishActivity(s: Life) {
  const a = chapterOf(s).activity;
  const r = record(s);
  const plan = r.plan;
  let effect: Effect = {};
  if (a.kind === "plan") for (const id of plan) for (const [k, v] of Object.entries(a.blocks!.find((b) => b.id === id)!.effect)) effect[k as Stat] = (effect[k as Stat] ?? 0) + v;
  const res = a.result(s, { plan, grade: r.grade });
  for (const [k, v] of Object.entries(res.effect)) effect[k as Stat] = (effect[k as Stat] ?? 0) + (v ?? 0);
  Object.assign(s.facts, res.facts ?? {});
  const actual = applyEffect(s, effect);
  s.activities[String(s.chapter)].complete = true;
  // An hour spent with someone (flying Dad's kite, boarding up with Mum) is time with them.
  const withWho = a.who ? bondOf(a.who, s) : null;
  const tended = tendedBy(effect);
  if (withWho && !tended.includes(withWho)) tended.push(withWho);
  s.memories.push({ id: `a:${s.chapter}`, chapter: s.chapter, title: a.keepsake, text: res.text, detail: res.text, effect: actual, tended });
}

function activityStep(l: Life, verb: string, arg: string): Life | null {
  const a = chapterOf(l).activity;
  const r = record(l);
  if (l.complete) return null;
  if (verb === "start") {
    if (!canStartActivity(l)) return null;
    const s = structuredClone(l);
    s.used += 1;
    s.activities[String(s.chapter)] = { started: true, found: [], plan: [], complete: false };
    return s;
  }
  if (!r.started || r.complete) return null;
  const s = structuredClone(l);
  const rec = s.activities[String(s.chapter)];
  if (verb === "hunt" && a.kind === "hunt") {
    const i = Number(arg);
    if (!Number.isInteger(i) || i < 0 || i >= a.items!.length || rec.found.includes(i)) return null;
    rec.found.push(i);
    if (rec.found.length === a.items!.length) finishActivity(s);
    return s;
  }
  if (verb === "plan" && a.kind === "plan") {
    if (rec.plan.length >= 3 || !a.blocks!.some((b) => b.id === arg)) return null;
    rec.plan.push(arg);
    return s;
  }
  if (verb === "unplan" && a.kind === "plan") {
    if (!rec.plan.length) return null;
    rec.plan.pop();
    return s;
  }
  if (verb === "commit" && a.kind === "plan") {
    if (rec.plan.length !== 3) return null;
    finishActivity(s);
    return s;
  }
  if (verb === "kite" && a.kind === "kite") {
    if (!["soar", "steady", "wobbly"].includes(arg)) return null;
    rec.grade = arg as KiteGrade;
    finishActivity(s);
    return s;
  }
  return null;
}

/** The Life Run's haul (docs/LIFE_RUN_PLAN.md §4): bounded, so a hand-made save can't mint stats. */
export function runEffect(coins: number, sparks: number, hearts: number, stumbles: number): Effect {
  const e: Effect = {};
  const savings = Math.min(8, Math.floor(coins / 5)),
    joy = Math.min(6, Math.floor(sparks / 3)),
    health = Math.max(-4, Math.min(4, 2 * hearts - 2 * stumbles));
  if (savings) e.savings = savings;
  if (joy) e.joy = joy;
  if (health) e.health = health;
  return e;
}
/** A run is the way into a chapter's big choice; its haul is logged once per chapter, right after the choice. */
export const canRun = (l: Life) => !l.complete && !l.facts[`run${l.chapter}`];

function run(l: Life, counts: string, who: string): Life | null {
  const m = /^(\d{1,3})-(\d{1,3})-(\d{1,2})-([0-3])$/.exec(counts);
  if (!m || !canRun(l)) return null;
  const [coins, sparks, hearts, stumbles] = m.slice(1).map(Number);
  if (coins > 400 || sparks > 200 || hearts > 10) return null;
  const friends = who ? who.split(",") : [];
  const cast = castOf(l).map(([w]) => w);
  if (friends.length > 2 || new Set(friends).size !== friends.length || friends.some((f) => !cast.includes(f))) return null;
  const s = structuredClone(l);
  s.facts[`run${s.chapter}`] = "1";
  const effect = runEffect(coins, sparks, hearts, stumbles);
  const actual = applyEffect(s, effect);
  // a high-five on the street is time with someone, so that bond doesn't cool this chapter
  const tended = tendedBy(effect);
  for (const f of friends) {
    const b = bondOf(f, s);
    if (b && !tended.includes(b)) tended.push(b);
  }
  const line = u("run.memory", { coins, sparks, hearts });
  s.memories.push({ id: `r:${s.chapter}`, chapter: s.chapter, title: u("run.memoryTitle"), text: line, detail: line, effect: actual, tended });
  return s;
}

function next(l: Life): Life | null {
  if (!canLeave(l)) return null;
  const s = structuredClone(l);
  s.position = { ...SPAWN };
  if (s.chapter === chapters.length - 1) {
    s.complete = true;
    return s;
  }
  const cooled = neglect(s);
  for (const b of cooled) s.bonds[b] -= 1;
  if (cooled.length) applyEffect(s, { joy: -3 * cooled.length });
  s.drift = cooled;
  s.chapter += 1;
  s.used = 0;
  seasons(s);
  return s;
}

/** Apply one logged action. Returns the same object when the action is not allowed. */
export function act(l: Life, action: string): Life {
  const [verb, a = "", b = ""] = action.split(":");
  let s: Life | null = null;
  if (verb === "talk") s = /^\d$/.test(b) ? talk(l, a, Number(b)) : null;
  else if (verb === "find") s = /^[0-2]$/.test(a) ? find(l, Number(a)) : null;
  else if (verb === "meet") s = meet(l, a);
  else if (verb === "next") s = next(l);
  else if (verb === "run") s = run(l, a, b);
  else if (["start", "hunt", "plan", "unplan", "commit", "kite"].includes(verb)) s = activityStep(l, verb, a);
  if (!s) return l;
  if (verb === "unplan") {
    // Undo removes the block from the log rather than appending, so plan/undo can't grow a save.
    const i = l.log.map((x) => x.startsWith("plan:")).lastIndexOf(true);
    s.log = [...l.log.slice(0, i), ...l.log.slice(i + 1)];
  } else s.log = [...l.log, action];
  return s;
}
export const talkAction = (id: string, i: number) => `talk:${id}:${i}`;

export function replay(identity: Identity, log: string[]): Life | null {
  let l = newLife(identity);
  for (const a of log) {
    const n = act(l, a);
    if (n === l) return null;
    l = n;
  }
  return l;
}

// ---------------------------------------------------------------------------
// saving
// ---------------------------------------------------------------------------
export function serialise(l: Life) {
  return JSON.stringify({ version: 2, identity: l.identity, log: l.log, position: l.position, style: l.style });
}
export function validIdentity(i: unknown): i is Identity {
  const x = i as Identity;
  return (
    !!x &&
    typeof x.name === "string" &&
    x.name.length <= 24 &&
    [x.skin, x.hair, x.colour].every((n) => Number.isInteger(n)) &&
    x.skin >= 0 && x.skin < SKINS.length &&
    x.hair >= 0 && x.hair < HAIR_STYLES.length &&
    x.colour >= 0 && x.colour < COLOURS.length
  );
}
export function parseLife(raw: string | null): Life | null {
  if (!raw || raw.length > 60000) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || data.version !== 2 || !validIdentity(data.identity)) return null;
    if (!Array.isArray(data.log) || data.log.length > 2000 || data.log.some((a: unknown) => typeof a !== "string" || a.length > 48)) return null;
    const l = replay(data.identity, data.log);
    if (!l) return null;
    const p = data.position;
    if (p && Number.isFinite(p.x) && Number.isFinite(p.z) && Math.abs(p.x) < 6 && Math.abs(p.z) < 4.2) l.position = { x: p.x, z: p.z };
    const st = data.style;
    if (st && typeof st.pattern === "string" && /^[a-z]{1,16}$/.test(st.pattern) && Number.isInteger(st.trim) && st.trim >= 0 && st.trim < TRIM_COUNT)
      l.style = { pattern: st.pattern, trim: st.trim };
    return l;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// keepsakes and the ending
// ---------------------------------------------------------------------------
export function keepsakes(l: Life) {
  const cards: { chapter: number; title: string; text: string; icon: string }[] = [];
  const f = l.facts;
  const k = lexicon.keepsake;
  if (f.kite) cards.push({ chapter: 0, title: k.kiteTitle(l), text: k.kiteText, icon: "kite" });
  for (let c = 0; c <= Math.min(l.chapter, chapters.length - 1); c++) {
    const r = record(l, c);
    if (!r.complete) continue;
    const a = chapters[c].activity;
    const m = l.memories.find((x) => x.id === `a:${c}`);
    cards.push({ chapter: c, title: a.keepsake, text: m?.text ?? "", icon: a.icon });
  }
  if (f.race === "won") cards.push({ chapter: 3, title: k.medalTitle, text: k.medalText, icon: "medal" });
  if (f.race === "gave") cards.push({ chapter: 3, title: k.rosetteTitle, text: k.rosetteText, icon: "medal" });
  if (f.nanaNight === "yes") cards.push({ chapter: 4, title: k.keyTitle, text: k.keyText, icon: "key" });
  return cards.sort((a, b) => a.chapter - b.chapter);
}

export function presentAtEnd(l: Life) {
  const c = chapters.length - 1;
  const view = { ...l, chapter: c };
  return castOf(view).map(([who]) => who);
}

/** The shape of a life: every archetype collects evidence from the whole story; the strongest wins. */
export function archetypes(l: Life) {
  const f = l.facts;
  const b = l.bonds;
  const up = (n: number, from: number) => Math.max(0, n - from);
  const score = {
    keeper: (f.pier === "restored" || f.pier === "shared" ? 4 : 0) + (f.nanaNight === "yes" ? 1 : 0) + (f.lighthouse === "climbed" ? 1 : 0) + up(b.rowan, 2) + (f.promise === "festival" ? 1 : 0) + (f.shop === "reopened" ? 1 : 0),
    heart: (f.care === "home" || f.care === "shared" ? 3 : 0) + up(b.family, 2) + (f.mumLast === "yes" ? 1 : 0) + (f.dadLast === "yes" ? 1 : 0) + (f.pipStory ? 1 : 0) + (f.final === "pip" ? 1 : 0),
    wanderer: (f.road === "sea" ? 3 : 0) + (f.shop === "sold" ? 3 : 0) + (f.partner === "Morgan" ? 1 : 0) + (f.partner === "Morgan" && f.dream === "backed" ? 1 : 0) + (f.pip === "left" ? 1 : 0) + (f.final === "free" ? 1 : 0),
    builder: (f.voss === "joined" ? 3 : 0) + (f.peak === "yes" ? 2 : 0) + (l.stats.savings >= 60 ? 1 : 0) + (f.road === "city" ? 1 : 0) + (f.race === "won" ? 1 : 0) + (f.vote === "marina" ? 1 : 0),
    friend: up(b.rowan, 3) + up(b.maya, 3) + (b.rowan >= 3 && b.maya >= 3 ? 1 : 0) + (f.partner === "none" ? 2 : 0) + (f.mayaPlan === "shared" ? 1 : 0) + (f.race === "gave" || f.race === "together" ? 1 : 0) + (f.final === "rowan" || f.final === "maya" ? 1 : 0),
  };
  return score;
}

const ARCHETYPE_KEYS = ["keeper", "heart", "wanderer", "builder", "friend"] as const;

export function endingKey(l: Life): ArchetypeKey {
  const score = archetypes(l);
  let best: (typeof ARCHETYPE_KEYS)[number] | null = null;
  for (const k of ARCHETYPE_KEYS) if (score[k] >= 5 && (!best || score[k] > score[best])) best = k;
  return best ?? "ordinary";
}

export function ending(l: Life) {
  const key = endingKey(l);
  const [title, line] = lexicon.archetype[key];
  return { key, title, line, lines: lexicon.endingLines(l), present: presentAtEnd(l).map((w) => people[w]?.name ?? w) };
}
