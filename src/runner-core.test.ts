import { test } from "node:test";
import assert from "node:assert/strict";
import { CLEAR, GATE_AHEAD, JUMP, MAX_STUMBLES, RUN_LANES, Run, gateX, planRun, runAction, type Body, type GateOption, type RunPlan } from "./runner-core";
import { act, canRun, castOf, chapterOf, mainMoment, newLife, optionOpen, runEffect, talkAction, visibleOptions, type Life } from "./core";

const GATES: GateOption[] = [
  { index: 0, label: "A", open: true },
  { index: 1, label: "B", open: false, why: "not yet" },
  { index: 2, label: "C", open: true },
];
const plan = (body: Body = "adult", level = 2, seed = 1, friends: string[] = []) => planRun({ seed, theme: "town", body, level, friends, gates: GATES });

/** Run a plan to the crossroads, stepping at 60 Hz with a given steering policy. */
function play(p: RunPlan, steer: (r: Run) => void = () => {}) {
  const r = new Run(p);
  for (let i = 0; i < 60 * 120 && r.phase === "run"; i++) {
    steer(r);
    r.step(1 / 60);
  }
  return r;
}

/** A careful runner: looks ahead and takes the free lane, or jumps a hurdle, or slides a banner. */
function careful(r: Run) {
  const ahead = r.items.filter((i) => i.kind in CLEAR && i.z + (i.kind === "cart" ? i.len : 0) > r.d - 0.5 && i.z - r.d < 9);
  const blocked = (lane: number) => ahead.find((i) => i.lane === lane && (i.kind === "crate" || i.kind === "cart"));
  if (blocked(r.lane)) {
    const free = [0, 1, 2].filter((l) => !blocked(l)).sort((a, b) => Math.abs(a - r.lane) - Math.abs(b - r.lane));
    if (free.length && Math.abs(free[0] - r.lane) === 1) r.input(free[0] < r.lane ? "left" : "right");
    else if (free.length) r.input(free[0] < r.lane ? "left" : "right");
  }
  const mine = ahead.find((i) => i.lane === r.lane && i.z - r.d < 3.2 && i.z - r.d > 0.4);
  if (mine?.kind === "hurdle") r.input("jump");
  if (mine?.kind === "banner") r.input("slide");
}

test("every row of every generated run leaves a way through", () => {
  for (const body of ["kid", "adult", "elder", "baby"] as Body[])
    for (let seed = 1; seed < 40; seed++) {
      const p = plan(body, 2, seed);
      const rows = new Map<number, Set<number>>();
      for (const it of p.items) if (it.kind === "crate" || it.kind === "cart") {
        const z = Math.round(it.kind === "cart" ? it.z + it.len / 2 : it.z);
        rows.set(z, (rows.get(z) ?? new Set()).add(it.lane));
      }
      for (const [z, lanes] of rows) assert.ok(lanes.size < 3, `${body}/${seed}: row at ${z} is walled off`);
      assert.ok(p.items.every((i) => i.z < p.stop - 17), "a clear run-in to the crossroads");
      const obstacles = p.items.filter((i) => i.kind in CLEAR).map((i) => i.z).sort((a, b) => a - b);
      assert.ok(obstacles[0] > 25, "a calm start");
    }
});

test("the same seed always lays out the same street", () => {
  assert.deepEqual(plan("adult", 1, 9), plan("adult", 1, 9));
  assert.notDeepEqual(plan("adult", 1, 9).items, plan("adult", 1, 10).items);
});

test("a careful runner reaches the crossroads without a stumble", () => {
  for (let seed = 1; seed < 12; seed++) {
    const r = play(plan("adult", 2, seed), careful);
    assert.equal(r.phase, "crossroads");
    assert.equal(r.stumbles, 0, `seed ${seed}: ${r.stumbles} stumbles`);
    assert.ok(r.coins > 10, `seed ${seed}: the coin lines lead the way (${r.coins})`);
  }
});

test("a runner who never steers is winded after three stumbles, and still arrives", () => {
  const r = play(plan("adult", 2, 3));
  assert.equal(r.stumbles, MAX_STUMBLES);
  assert.ok(r.winded);
  assert.equal(r.phase, "crossroads");
});

test("jumps clear hurdles but not crates; slides go under banners", () => {
  const one = (kind: "hurdle" | "crate" | "banner", act: "jump" | "slide" | null) => {
    const r = new Run({ seed: 0, theme: "town", body: "adult", base: 10, top: 10, stop: 200, gates: GATES, items: [{ id: 0, kind, lane: 1, z: 30, y: 0, len: 0 }] });
    for (let i = 0; i < 60 * 5; i++) {
      if (act && Math.abs(30 - r.d) < (act === "jump" ? 3.1 : 2) && !r.airborne && r.slide <= 0) r.input(act);
      r.step(1 / 60);
    }
    return r.stumbles;
  };
  assert.equal(one("hurdle", "jump"), 0);
  assert.equal(one("hurdle", null), 1);
  assert.equal(one("crate", "jump"), 1, "a crate is too tall to jump");
  assert.equal(one("banner", "slide"), 0);
  assert.equal(one("banner", "jump"), 1, "jumping into a banner hits it");
  assert.ok(JUMP.peak > CLEAR.hurdle.over && JUMP.peak < CLEAR.crate.over);
});

test("a lane step is one press; the crossroads widens to one gate per option", () => {
  const r = new Run(plan());
  r.input("left");
  r.input("left");
  r.input("left");
  assert.equal(r.lane, 0, "clamped at the edge");
  for (let i = 0; i < 30; i++) r.step(1 / 60);
  assert.equal(r.x, RUN_LANES[0]);
  r.d = r.plan.stop - 0.5;
  for (let i = 0; i < 120 && r.phase === "run"; i++) r.step(1 / 60);
  assert.equal(r.phase, "crossroads");
  assert.deepEqual(r.lanes, GATES.map((_, i) => gateX(i, 3)));
  assert.equal(r.gate, 0, "you face the gate nearest your lane");
  r.input("right");
  assert.deepEqual(r.go(), [{ type: "shut", gate: 1 }], "a shut gate turns you back");
  r.input("right");
  r.input("go");
  let done;
  for (let i = 0; i < 60 * 10 && !done; i++) done = r.step(1 / 60).find((e) => e.type === "done");
  assert.deepEqual(done, { type: "done", choice: 2 });
  assert.ok(r.d >= r.plan.stop + GATE_AHEAD);
});

test("friends wait on the street for a high-five", () => {
  const p = plan("adult", 1, 4, ["rowan", "maya"]);
  const friends = p.items.filter((i) => i.kind === "friend");
  assert.deepEqual(friends.map((f) => f.who), ["rowan", "maya"]);
  const r = play(p, (run) => {
    const f = run.items.find((i) => i.kind === "friend" && !i.taken && i.z > run.d);
    if (f && f.z - run.d < 12 && f.lane !== run.lane) run.input(f.lane < run.lane ? "left" : "right");
    else careful(run);
  });
  assert.deepEqual(r.friends, ["rowan", "maya"]);
});

test("the kite lift carries you over everything", () => {
  const p = plan("adult", 2, 5);
  const kite = p.items.find((i) => i.kind === "kite")!;
  assert.ok(kite, "every run but the baby's has a kite");
  const r = play(p, (run) => {
    if (kite.z - run.d < 14 && kite.z > run.d && run.lane !== kite.lane) run.input(kite.lane < run.lane ? "left" : "right");
    else if (run.kite <= 0) careful(run);
  });
  assert.ok(r.sparks > 5, `sky sparks collected (${r.sparks})`);
  assert.equal(r.stumbles, 0);
  assert.ok(!plan("baby", 0, 5).items.some((i) => i.kind === "kite" || i.kind === "hurdle" || i.kind === "banner"), "the baby only ever dodges");
});

// --- the story side: the run: action -------------------------------------------------
function chapter(n: number): Life {
  let l = newLife({ name: "Ari", skin: 1, hair: 1, colour: 1 });
  for (let c = 0; c < n; c++) {
    const m = mainMoment(l);
    l = act(l, talkAction(m.id, visibleOptions(l, m).find(([o]) => optionOpen(l, o))![1]));
    l = act(l, "next");
  }
  return l;
}

test("a run is logged once per chapter, before the big choice, with a bounded haul", () => {
  const l = chapter(3);
  assert.ok(canRun(l));
  const friend = castOf(l).map(([w]) => w).find((w) => w === "rowan")!;
  const a = act(l, runAction({ coins: 23, sparks: 10, hearts: 1, stumbles: 1, friends: [friend], choice: 0 }));
  assert.notEqual(a, l);
  assert.equal(a.log.at(-1), "run:23-10-1-1:rowan");
  assert.deepEqual(a.memories.at(-1)!.effect, { savings: 4, joy: 3 });
  assert.ok(a.memories.at(-1)!.tended!.includes("rowan"), "a high-five tends the bond");
  assert.equal(act(a, "run:1-1-1-0:"), a, "only once a chapter");
  const m = mainMoment(a);
  const chosen = act(a, talkAction(m.id, 0));
  assert.notEqual(chosen, a, "the choice follows the run");
  assert.ok(!canRun(chapter(3).memories.length ? act(chapter(3), talkAction(mainMoment(chapter(3)).id, 0)) : l), "no run after the choice is made");
  for (const bad of ["run:999-0-0-0:", "run:1-1-1-4:", "run:1-1-1-0:nobody", "run:1-1-1-0:rowan,rowan", "run:x:"]) assert.equal(act(l, bad), l, bad);
  assert.deepEqual(runEffect(1000, 1000, 0, 0), { savings: 8, joy: 6 });
  assert.deepEqual(runEffect(0, 0, 0, 3), { health: -4 });
  assert.equal(chapterOf(a).title, chapterOf(l).title);
});
