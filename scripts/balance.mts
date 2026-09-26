// Balance report: play many seeded random lives and summarise where they end up.
import { chapters } from "../src/content";
import { act, chapterOf, canStartActivity, canTalk, ending, mainMoment, momentsOf, newLife, optionOpen, record, talkAction, visibleOptions, type Life } from "../src/core";
function rng(seed: number) { return () => ((seed = (seed * 1664525 + 1013904223) % 4294967296), seed / 4294967296); }
function randomLife(seed: number): Life {
  const r = rng(seed);
  let l = newLife({ name: "A", skin: 0, hair: 0, colour: 0 });
  const go = (a: string) => { const n = act(l, a); if (n === l) throw new Error(`refused ${a}`); l = n; };
  for (let c = 0; c < chapters.length; c++) {
    for (const g of chapterOf(l).guests ?? []) go(`meet:${g}`);
    for (let i = 0; i < 3; i++) go(`find:${i}`);
    const pick = (m: any) => { const open = visibleOptions(l, m).filter(([o]) => optionOpen(l, o)).map(([, i]) => i); go(talkAction(m.id, open[Math.floor(r() * open.length)])); };
    if (r() < 0.5 && canStartActivity(l)) { const a = chapterOf(l).activity; go("start"); if (a.kind === "hunt") a.items!.forEach((_, i) => go(`hunt:${i}`)); else if (a.kind === "plan") { for (let k = 0; k < 3; k++) go(`plan:${a.blocks![Math.floor(r() * a.blocks!.length)].id}`); go("commit"); } else go("kite:steady"); }
    for (const m of [...momentsOf(l).filter((m) => m.kind === "side")].sort(() => r() - 0.5)) if (canTalk(l, m)) pick(m);
    pick(mainMoment(l));
    if (c === chapters.length - 1) for (const m of momentsOf(l)) if (canTalk(l, m)) pick(m);
    go("next");
  }
  return l;
}
const titles: Record<string, number> = {};
const sums: Record<string, number[]> = {};
for (let s = 1; s <= 400; s++) {
  const l = randomLife(s);
  const t = ending(l).title;
  titles[t] = (titles[t] ?? 0) + 1;
  for (const [k, v] of Object.entries({ ...l.stats, ...l.bonds })) (sums[k] ??= []).push(v);
}
console.log(titles);
for (const [k, v] of Object.entries(sums)) {
  v.sort((a, b) => a - b);
  console.log(k.padEnd(8), "min", v[0], "p25", v[Math.floor(v.length * 0.25)], "med", v[Math.floor(v.length / 2)], "p75", v[Math.floor(v.length * 0.75)], "max", v.at(-1));
}
