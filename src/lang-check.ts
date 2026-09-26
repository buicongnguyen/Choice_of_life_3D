/**
 * Shared checks for a translation (used by src/lang-*.test.ts). Each language test runs in
 * its own process, so applying an overlay there can't leak into the English tests.
 */
import assert from "node:assert/strict";
import { chapters, people, lexicon, text } from "./content";
import { EN_UI, u, type UIKey } from "./i18n";
import { applyOverlay, contentPaths, type Overlay } from "./localize";
import {
  act,
  canStartActivity,
  canTalk,
  chapterOf,
  ending,
  keepsakes,
  mainMoment,
  momentsOf,
  newLife,
  optionOpen,
  talkAction,
  visibleOptions,
  type Life,
} from "./core";
import { beats } from "./beats";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
const BAD = /undefined|NaN|\[object|\$\{|\{[a-z]+\}/;

export function checkLanguage(ov: Overlay, looksTranslated: (s: string) => boolean) {
  // 1. completeness, before applying (so English originals can be compared)
  const english = new Map<string, unknown>();
  for (const e of contentPaths()) {
    english.set(e.path, e.get());
    const v = ov.text[e.path];
    assert.ok(v !== undefined, `missing translation: ${e.path}`);
    const wantFn = typeof e.get() === "function";
    if (wantFn && e.kind !== "text") assert.equal(typeof v, "function", `${e.path} must be a function like the English`);
    if (typeof v === "string") {
      assert.ok(v.trim().length > 0, `${e.path} is empty`);
      assert.equal((v.match(/“/g) ?? []).length, (v.match(/”/g) ?? []).length, `${e.path}: unbalanced “ ”`);
    }
  }
  const extra = Object.keys(ov.text).filter((k) => !english.has(k));
  assert.deepEqual(extra, [], `unknown paths: ${extra.join(", ")}`);
  for (const key of Object.keys(EN_UI) as UIKey[]) {
    const v = ov.ui[key];
    assert.ok(typeof v === "string" && v.length > 0, `missing UI string: ${key}`);
    assert.equal(placeholders(v!), placeholders(EN_UI[key]), `${key}: placeholders must match {…}`);
  }
  for (const k of ["kite", "career", "ally", "keepsake", "archetype"] as const)
    for (const sub of Object.keys(lexicon[k])) assert.ok((ov.lexicon[k] as Record<string, unknown>)[sub] !== undefined, `lexicon.${k}.${sub} missing`);
  assert.equal(typeof ov.lexicon.endingLines, "function");

  // 2. apply and render everything a player can see, across many different lives
  applyOverlay(ov);
  const seen = new Set<string>();
  const see = (s: unknown, where: string) => {
    assert.equal(typeof s, "string", `${where} is not text`);
    const t = s as string;
    assert.doesNotMatch(t, BAD, `${where}: ${t}`);
    assert.equal((t.match(/“/g) ?? []).length, (t.match(/”/g) ?? []).length, `${where}: unbalanced quotes in "${t}"`);
    assert.ok(beats(t).join(" ").length > 0 || t === "", where);
    seen.add(t);
  };
  let seed = 7;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296), seed / 4294967296);
  for (let life = 0; life < 90; life++) {
    let l: Life = newLife({ name: "Ari", skin: 1, hair: 1, colour: 1 });
    const go = (a: string) => {
      const n = act(l, a);
      assert.notEqual(n, l, `refused ${a}`);
      l = n;
    };
    for (let c = 0; c < chapters.length; c++) {
      const ch = chapterOf(l);
      see(ch.title, `ch${c + 1}.title`);
      see(ch.place, `ch${c + 1}.place`);
      see(text(ch.intro, l), `ch${c + 1}.intro`);
      see(text(ch.objective, l), `ch${c + 1}.objective`);
      for (const [w] of ch.cast) {
        const p = people[w];
        see(p.name, `p.${w}.name`);
        see(p.role(l), `p.${w}.role`);
        see(p.bark(l), `p.${w}.bark`);
        if (p.meet) see(p.meet, `p.${w}.meet`);
      }
      for (const g of ch.guests ?? []) go(`meet:${g}`);
      for (let i = 0; i < 3; i++) {
        see(ch.finds[i].name, `find`);
        see(ch.finds[i].line, `find`);
        go(`find:${i}`);
      }
      const a = ch.activity;
      see(text(a.title, l), `${a.id}.title`);
      see(text(a.intro, l), `${a.id}.intro`);
      see(a.keepsake, `${a.id}.keepsake`);
      if (rnd() < 0.5 && canStartActivity(l)) {
        go("start");
        if (a.kind === "hunt") a.items!.forEach((it, i) => (see(it.name, "item"), see(it.line, "item"), go(`hunt:${i}`)));
        else if (a.kind === "plan") {
          for (const b of a.blocks!) (see(text(b.label, l), "block"), see(b.detail, "block"));
          for (let k = 0; k < 3; k++) go(`plan:${a.blocks![Math.floor(rnd() * a.blocks!.length)].id}`);
          go("commit");
        } else go(`kite:${(["soar", "steady", "wobbly"] as const)[Math.floor(rnd() * 3)]}`);
        see(l.memories.at(-1)!.text, `${a.id}.result`);
      }
      const talk = (m: ReturnType<typeof mainMoment>) => {
        see(text(m.title, l), `${m.id}.title`);
        see(text(m.prompt, l), `${m.id}.prompt`);
        const ctx = m.context?.(l);
        if (ctx !== undefined) see(ctx, `${m.id}.context`);
        const open: number[] = [];
        for (const [o, i] of visibleOptions(l, m)) {
          see(text(o.label, l), `${m.id}.o${i}.label`);
          see(text(o.hint, l), `${m.id}.o${i}.hint`);
          see(text(o.reply, l), `${m.id}.o${i}.reply`);
          see(text(o.memory, l), `${m.id}.o${i}.memory`);
          if (o.need) see(o.need.why, `${m.id}.o${i}.why`);
          if (optionOpen(l, o)) open.push(i);
        }
        go(talkAction(m.id, open[Math.floor(rnd() * open.length)]));
      };
      for (const m of momentsOf(l).filter((m) => m.kind === "side").sort(() => rnd() - 0.5)) if (canTalk(l, m)) talk(m);
      talk(mainMoment(l));
      if (c === chapters.length - 1) for (const m of momentsOf(l)) if (canTalk(l, m)) talk(m);
      go("next");
    }
    const e = ending(l);
    see(e.title, "ending.title");
    see(e.line, "ending.line");
    e.lines.forEach((x) => see(x, "ending.lines"));
    for (const k of keepsakes(l)) (see(k.title, "keepsake"), see(k.text, "keepsake"));
  }
  for (const key of Object.keys(EN_UI) as UIKey[]) see(u(key, { n: 1, name: "Ari", title: "T", age: "1", left: 1, total: 2, dir: "up", who: "Rowan", v: 1, max: 5, names: "Rowan", how: "x", colour: "red" }), key);

  // 3. nothing left in English
  const english2 = new Set([...english.values()].filter((v) => typeof v === "string") as string[]);
  const leftovers = [...seen].filter((s) => s.length > 14 && (english2.has(s) || !looksTranslated(s)));
  assert.deepEqual(leftovers.slice(0, 12), [], `untranslated text (${leftovers.length})`);
  return seen.size;
}
