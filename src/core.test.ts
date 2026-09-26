import { test } from "node:test";
import assert from "node:assert/strict";
import { allies, chapters, type KiteGrade, type Moment } from "./content";
import {
  act,
  canStartActivity,
  canTalk,
  chapterOf,
  effectOf,
  ending,
  freeTime,
  keepsakes,
  mainMoment,
  momentsOf,
  newLife,
  optionOpen,
  parseLife,
  record,
  replay,
  serialise,
  talkAction,
  visibleOptions,
  BOND_MAX,
  type Life,
} from "./core";

export const id = { name: "Ari", skin: 2, hair: 3, colour: 1 };
const must = (l: Life, a: string) => {
  const n = act(l, a);
  assert.notEqual(n, l, `refused: ${a} in chapter ${l.chapter + 1}`);
  return n;
};

/** Deterministic pseudo-random numbers for reproducible random lives. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

type Policy = {
  pick: (l: Life, m: Moment, open: number[]) => number;
  sides: (l: Life, sides: Moment[]) => Moment[];
  activity: (l: Life) => boolean;
  plan: (l: Life) => string[];
  grade: (l: Life) => KiteGrade;
};

export function live(p: Policy, stopBefore = chapters.length): Life {
  let l = newLife(id);
  for (let c = 0; c < stopBefore; c++) {
    assert.equal(l.chapter, c);
    for (const g of chapterOf(l).guests ?? []) l = must(l, `meet:${g}`);
    for (let i = 0; i < 3; i++) l = must(l, `find:${i}`);
    const run = (m: Moment) => {
      const open = visibleOptions(l, m).filter(([o]) => optionOpen(l, o)).map(([, i]) => i);
      assert.ok(open.length, `${m.id} has no open option`);
      l = must(l, talkAction(m.id, p.pick(l, m, open)));
    };
    const sides = p.sides(
      l,
      momentsOf(l).filter((m) => m.kind === "side"),
    );
    const activityFirst = p.activity(l);
    if (activityFirst && canStartActivity(l)) {
      const a = chapterOf(l).activity;
      l = must(l, "start");
      if (a.kind === "hunt") a.items!.forEach((_, i) => (l = must(l, `hunt:${i}`)));
      else if (a.kind === "plan") {
        for (const b of p.plan(l)) l = must(l, `plan:${b}`);
        l = must(l, "commit");
      } else l = must(l, `kite:${p.grade(l)}`);
      assert.ok(record(l).complete);
    }
    for (const m of sides) if (canTalk(l, m)) run(m);
    run(mainMoment(l));
    // In the last chapter there is no clock: visit everyone who came.
    if (c === chapters.length - 1) for (const m of momentsOf(l)) if (canTalk(l, m)) run(m);
    l = must(l, "next");
  }
  return l;
}

function randomPolicy(seed: number): Policy {
  const r = rng(seed);
  return {
    pick: (_l, _m, open) => open[Math.floor(r() * open.length)],
    sides: (_l, s) => [...s].sort(() => r() - 0.5),
    activity: () => r() < 0.5,
    plan: (l) => {
      const blocks = chapterOf(l).activity.blocks!;
      return [0, 1, 2].map(() => blocks[Math.floor(r() * blocks.length)].id);
    },
    grade: () => (["soar", "steady", "wobbly"] as const)[Math.floor(r() * 3)],
  };
}

/** Choose by weighted effect plus preferred facts. */
function greedy(weights: Record<string, number>, prefer: Record<string, string> = {}, sidePrefer: string[] = []): Policy {
  const score = (l: Life, m: Moment, i: number) => {
    const o = m.options[i];
    const e = effectOf(l, o) as Record<string, number>;
    let s = Object.entries(e).reduce((t, [k, v]) => t + (weights[k] ?? 0) * v, 0);
    const facts = typeof o.facts === "function" ? o.facts(l) : (o.facts ?? {});
    for (const [k, v] of Object.entries(facts)) if (prefer[k] === v) s += 1000;
    return s;
  };
  return {
    pick: (l, m, open) => open.reduce((best, i) => (score(l, m, i) > score(l, m, best) ? i : best), open[0]),
    sides: (_l, s) => [...s].sort((a, b) => sidePrefer.indexOf(b.who) - sidePrefer.indexOf(a.who)),
    activity: () => false,
    plan: () => ["rest", "rest", "rest"],
    grade: () => "soar",
  };
}

test("random lives always finish all twelve chapters, and every save replays exactly", () => {
  const titles = new Set<string>();
  for (let seed = 1; seed <= 260; seed++) {
    const l = live(randomPolicy(seed));
    assert.ok(l.complete);
    for (const v of Object.values(l.stats)) assert.ok(v >= 0 && v <= 100);
    for (const v of Object.values(l.bonds)) assert.ok(v >= 0 && v <= BOND_MAX);
    const back = parseLife(serialise(l));
    assert.ok(back, "save must parse");
    assert.deepEqual(back!.stats, l.stats);
    assert.deepEqual(back!.bonds, l.bonds);
    assert.deepEqual(back!.facts, l.facts);
    assert.equal(back!.memories.length, l.memories.length);
    const e = ending(l);
    assert.ok(e.lines.length >= 8, "a full epilogue");
    titles.add(e.title);
  }
  assert.ok(titles.size >= 5, `endings reached: ${[...titles].join(", ")}`);
});

test("the six endings are each reachable by a consistent way of living", () => {
  const cases: [string, Policy][] = [
    ["The Keeper of the Light", greedy({ rowan: 5, family: 1 }, { lunchbox: "stood", voss: "refused", vote: "pier", road: "home", nanaNight: "yes", lighthouse: "climbed", promise: "festival", shop: "reopened" }, ["nana", "rowan"])],
    ["The Heart of the House", greedy({ family: 6, savings: 0.3 }, { care: "home", vote: "marina", road: "home" }, ["mum", "dad", "nana", "pip"])],
    ["The Wanderer", greedy({ rowan: 2, health: 0.4 }, { road: "sea", vote: "marina", care: "paid", partner: "Morgan", dream: "backed", shop: "sold", final: "free", pip: "left" }, ["rowan", "morgan"])],
    ["The Builder", greedy({ savings: 3 }, { voss: "joined", care: "paid", vote: "marina", road: "city", grade: "excellent", storm: "studied" }, [])],
    ["The Friend", greedy({ maya: 3, rowan: 2 }, { lunchbox: "away", voss: "inside", vote: "marina", road: "city", care: "paid", partner: "none" }, ["maya", "rowan"])],
  ];
  for (const [title, policy] of cases) assert.equal(ending(live(policy)).title, title);
  // The fallback ending when nobody stayed close.
  const drifter = live(greedy({ joy: 1, savings: -1, rowan: -4, maya: -4, family: -4 }, { lunchbox: "away", voss: "inside", vote: "marina", road: "home", care: "paid", storm: "studied", partner: "Quinn", race: "together", shop: "given" }, []));
  assert.equal(ending(drifter).title, "A Whole, Ordinary Life");
});

test("free time is a real budget: two side moments or activities per chapter, and the main story is always free", () => {
  let l = newLife(id);
  assert.equal(freeTime(l), 2);
  l = must(l, talkAction("c1.mum", 0));
  l = must(l, talkAction("c1.dad", 0));
  assert.equal(freeTime(l), 0);
  assert.equal(canStartActivity(l), false);
  assert.equal(act(l, "start"), l, "no hour left for the activity");
  l = must(l, talkAction("c1.kite", 0));
  assert.equal(act(l, talkAction("c1.kite", 1)), l, "a moment is decided once");
  l = must(l, "next");
  assert.equal(freeTime(l), 2, "a new chapter brings new time");
});

test("you cannot leave a chapter before its main moment", () => {
  const l = newLife(id);
  assert.equal(act(l, "next"), l);
});

test("gates: a worn-out teenager can't go out onto the pontoon", () => {
  let l = live(greedy({ rowan: 1 }), 4);
  assert.equal(l.chapter, 4);
  const storm = mainMoment(l);
  l = { ...l, stats: { ...l.stats, health: 20 } };
  assert.equal(optionOpen(l, storm.options[0]), false);
  assert.equal(act(l, talkAction("c5.storm", 0)), l);
  assert.notEqual(act(l, talkAction("c5.storm", 1)), l);
});

test("the vote is decided by the allies you earned across your life", () => {
  const withAllies = live(greedy({ rowan: 5 }, { lunchbox: "stood", voss: "refused", vote: "pier" }, ["rowan"]));
  assert.equal(withAllies.facts.pier, "restored");
  const alone = live(greedy({ savings: 1, rowan: -3 }, { lunchbox: "away", voss: "joined", vote: "pier" }, []));
  assert.equal(alone.facts.pier, "marina");
});

test("activities: hunts finish when every item is found, plans need three blocks and can be undone", () => {
  let l = newLife(id);
  l = must(l, "start");
  assert.equal(freeTime(l), 1);
  l = must(l, "hunt:0");
  assert.equal(act(l, "hunt:0"), l, "each item is found once");
  l = must(l, "hunt:1");
  assert.equal(record(l).complete, false);
  l = must(l, "hunt:2");
  assert.equal(record(l).complete, true);
  assert.ok(keepsakes(l).some((k) => k.title === "First shoes"));
  // A planner in chapter 6
  let p = live(greedy({ joy: 1 }), 5);
  p = must(p, "start");
  p = must(p, "plan:work");
  p = must(p, "plan:rest");
  assert.equal(act(p, "commit"), p, "three blocks are needed");
  p = must(p, "unplan");
  p = must(p, "plan:friends");
  p = must(p, "plan:family");
  assert.equal(act(p, "plan:rest"), p, "only three blocks fit");
  p = must(p, "commit");
  assert.ok(record(p).complete);
});

test("saves reject tampering: unknown actions, reordered logs, bad identities and wrong versions", () => {
  const l = live(randomPolicy(7), 3);
  const good = JSON.parse(serialise(l));
  assert.ok(parseLife(JSON.stringify(good)));
  const bad = [
    { ...good, version: 1 },
    { ...good, log: [...good.log, "next"] },
    { ...good, log: ["next", ...good.log] },
    { ...good, log: [...good.log.slice(0, 5), "talk:c9.care:0", ...good.log.slice(5)] },
    { ...good, identity: { ...good.identity, skin: 99 } },
    { ...good, identity: { ...good.identity, name: "x".repeat(40) } },
    { ...good, log: "next" },
  ];
  for (const b of bad) assert.equal(parseLife(JSON.stringify(b)), null);
  assert.equal(parseLife("{"), null);
  assert.equal(parseLife(null), null);
  // An out-of-bounds position is ignored rather than trusted.
  const moved = parseLife(JSON.stringify({ ...good, position: { x: 99, z: 0 } }))!;
  assert.notEqual(moved.position.x, 99);
  assert.deepEqual(replay(id, [])!.stats, newLife(id).stats);
});

test("callbacks: the town remembers the boat, the lunchbox and the storm", () => {
  const liar = live(greedy({ joy: 2 }, { boat: "cat", lunchbox: "away" }), 10);
  const rowanSide = chapterOf(liar).moments.find((m) => m.id === "c11.rowan")!;
  const visible = visibleOptions(liar, rowanSide).map(([o]) => (typeof o.label === "string" ? o.label : ""));
  assert.ok(visible.includes("Apologise to the cat"), "the cat lie can finally be confessed");
  const honest = live(greedy({ rowan: 2 }, { boat: "truth" }), 10);
  const ctx = chapterOf(honest).moments.find((m) => m.id === "c11.rowan")!.context!(honest);
  assert.match(ctx ?? "", /truth/);
});

test("time spent with someone at five hearts still counts: no drift", () => {
  let l = newLife(id);
  l = must(l, talkAction("c1.kite", 0));
  l = must(l, "next");
  l = { ...l, bonds: { ...l.bonds, rowan: 5 } };
  l = must(l, talkAction("c2.boat", 1));
  l = must(l, "next");
  assert.equal(l.bonds.rowan, 5, "the main moment tended Rowan even though the heart was capped");
  assert.ok(!l.drift.includes("rowan"));
  l = { ...l, bonds: { ...l.bonds, rowan: 5 } };
  l = must(l, talkAction("c3.lunchbox", 1));
  l = must(l, "next");
  assert.equal(l.bonds.rowan, 4, "Rowan was in the schoolyard and got none of your time");
  assert.deepEqual(l.drift.includes("rowan"), true);
});

test("undoing a planned block shrinks the log instead of growing the save", () => {
  let p = live(greedy({ joy: 1 }), 5);
  p = must(p, "start");
  const before = p.log.length;
  for (let i = 0; i < 50; i++) p = must(must(p, "plan:work"), "unplan");
  assert.equal(p.log.length, before);
  assert.ok(parseLife(serialise(p)));
});

test("Councillor Quinn only counts as an ally if you backed the campaign", () => {
  const base = live(greedy({ joy: 1 }), 9);
  const withQuinn = { ...base, facts: { ...base.facts, partner: "Quinn", dream: "backed" } };
  const waited = { ...base, facts: { ...base.facts, partner: "Quinn", dream: "waited" } };
  assert.ok(allies(withQuinn).includes("Councillor Quinn"));
  assert.ok(!allies(waited).includes("Councillor Quinn"));
});
