import { test } from "node:test";
import assert from "node:assert/strict";
import { cycleLength, gaitPose, gaitShape } from "./gait";

const LEGS = { kid: 0.38, adult: 0.48, elder: 0.47 };

/** Run the body forward in small steps; return how far planted soles slid and how low any sole went. */
function walk(speed: number, leg: number, energy = 1, seconds = 3) {
  const dt = 1 / 120;
  const shape = gaitShape(speed, leg, energy);
  const C = cycleLength(shape, leg);
  let x = 0,
    phase = 0.13,
    worstSlip = 0,
    lowest = Infinity,
    steps = 0;
  const planted: (number | null)[] = [null, null];
  for (let t = 0; t < seconds; t += dt) {
    const dx = speed * dt;
    x += dx;
    phase = (phase + dx / C) % 1;
    const pose = gaitPose(phase, shape, leg);
    pose.legs.forEach((l, i) => {
      // the sole as the 3D scene draws it: a leg of length leg·scale rotated about the hip
      const soleX = x + l.scale * leg * Math.sin(-l.angle);
      const soleY = leg + pose.hipDrop - l.scale * leg * Math.cos(l.angle);
      lowest = Math.min(lowest, soleY);
      if (l.planted) {
        if (planted[i] === null) {
          planted[i] = soleX;
          steps++;
        }
        worstSlip = Math.max(worstSlip, Math.abs(soleX - planted[i]!));
        assert.ok(Math.abs(soleY) < 1e-9, `a planted sole is on the floor (y=${soleY})`);
      } else planted[i] = null;
    });
  }
  return { worstSlip, lowest, stepsPerSecond: steps / seconds, shape };
}

test("planted feet never slide, at every speed and for every body", () => {
  for (const [kind, leg] of Object.entries(LEGS))
    for (const speed of [0.6, 0.85, 1.5, 2.3, 2.9, 3.6]) {
      const r = walk(speed, leg, kind === "elder" ? 0.75 : 1);
      assert.ok(r.worstSlip < 1e-9, `${kind} at ${speed}: a planted foot slid ${r.worstSlip}`);
      assert.ok(r.lowest > -1e-9, `${kind} at ${speed}: a sole went ${r.lowest} below the floor`);
    }
});

test("cadence stays natural: a stroll, a jog, never a whir", () => {
  const stroll = walk(0.85, LEGS.adult);
  assert.equal(stroll.shape.run, 0, "townsfolk at 0.85 walk");
  assert.ok(stroll.stepsPerSecond > 2 && stroll.stepsPerSecond < 3.6, `stroll ${stroll.stepsPerSecond.toFixed(2)} steps/s`);
  const run = walk(2.9, LEGS.adult);
  assert.equal(run.shape.run, 1, "the player at 2.9 runs");
  assert.ok(run.stepsPerSecond > 3 && run.stepsPerSecond < 4.6, `run ${run.stepsPerSecond.toFixed(2)} steps/s`);
  const kid = walk(2.9, LEGS.kid);
  assert.ok(kid.stepsPerSecond < 5.6, `kid run ${kid.stepsPerSecond.toFixed(2)} steps/s`);
  assert.ok(kid.stepsPerSecond > run.stepsPerSecond, "short legs take more steps");
});

test("a run has a flight phase and a walk has double support", () => {
  const count = (speed: number, leg: number) => {
    const shape = gaitShape(speed, leg);
    let both = 0,
      none = 0;
    for (let p = 0; p < 1; p += 0.001) {
      const n = gaitPose(p, shape, leg).legs.filter((l) => l.planted).length;
      if (n === 2) both++;
      if (n === 0) none++;
    }
    return { both, none };
  };
  const walking = count(0.85, LEGS.adult);
  assert.ok(walking.both > 0 && walking.none === 0);
  const running = count(2.9, LEGS.adult);
  assert.ok(running.none > 0 && running.both === 0);
});

test("standing still is standing straight", () => {
  const pose = gaitPose(0.3, gaitShape(2.9, LEGS.adult), LEGS.adult, 0);
  for (const l of pose.legs) {
    assert.equal(Math.abs(l.angle), 0);
    assert.equal(l.scale, 1);
  }
  assert.ok(Math.abs(pose.hipDrop) < 1e-9);
});

import { CRAWL, crawlCycle, crawlPose, type CrawlRig } from "./gait";

// The baby as authored in art/kitehaven/characters.py: body pivot, shoulder and hip pivots,
// and the lowest points of hand and foot relative to them.
const BABY: CrawlRig = { bodyY: 0.2, shoulder: { y: 0.16, z: 0.02 }, hip: { y: 0.13, z: 0.05 }, armTip: { y: -0.25, z: 0.1 }, legTip: { y: -0.13, z: 0.24 } };

/** Where a limb's tip is, drawn as the 3D scene draws it: rest tip, uniform scale, rotation about x. */
function tipAt(base: { y: number; z: number }, tip: { y: number; z: number }, angle: number, scale: number) {
  return {
    y: base.y + scale * (tip.y * Math.cos(angle) - tip.z * Math.sin(angle)),
    z: base.z + scale * (tip.y * Math.sin(angle) + tip.z * Math.cos(angle)),
  };
}

test("the baby crawls on hands and knees that stay planted", () => {
  const C = crawlCycle();
  let x = 0,
    phase = 0.07,
    worst = 0,
    lowest = Infinity,
    highestPlanted = 0;
  const planted: (number | null)[] = [null, null, null, null];
  for (let i = 0; i < 1200; i++) {
    const dx = 0.003;
    x += dx;
    phase = (phase + dx / C) % 1;
    const pose = crawlPose(phase, BABY);
    // the body leans by pose.pitch about its pivot; arms hang from the leaning shoulders
    const sy = BABY.shoulder.y * Math.cos(pose.pitch) - BABY.shoulder.z * Math.sin(pose.pitch);
    const sz = BABY.shoulder.y * Math.sin(pose.pitch) + BABY.shoulder.z * Math.cos(pose.pitch);
    const shoulder = { y: BABY.bodyY + sy, z: sz };
    const hip = { y: BABY.hip.y + pose.hipLift, z: BABY.hip.z };
    pose.limbs.forEach((l, k) => {
      const arm = k < 2;
      const t = arm
        ? tipAt(shoulder, BABY.armTip, pose.pitch + l.rotation, l.scale)
        : tipAt(hip, BABY.legTip, l.rotation, l.scale);
      const worldZ = x + t.z;
      lowest = Math.min(lowest, t.y);
      if (l.planted) {
        highestPlanted = Math.max(highestPlanted, Math.abs(t.y));
        if (planted[k] === null) planted[k] = worldZ;
        worst = Math.max(worst, Math.abs(worldZ - planted[k]!));
      } else planted[k] = null;
    });
  }
  assert.ok(worst < 1e-9, `a planted hand or knee slid ${worst}`);
  assert.ok(highestPlanted < 1e-9, `a planted hand or knee left the floor by ${highestPlanted}`);
  assert.ok(lowest > -1e-9, `a hand or knee went ${lowest} below the floor`);
  for (let p = 0; p < 1; p += 0.01)
    for (const l of crawlPose(p, BABY).limbs) assert.ok(l.scale > 0.84 && l.scale < 1.08, `limbs keep their size (${l.scale.toFixed(2)} at ${p.toFixed(2)})`);
  assert.equal(CRAWL.stance, 0.5);
});

test("starting and stopping a crawl never pushes a limb through the floor", () => {
  for (let amount = 0; amount <= 1.0001; amount += 0.02)
    for (let p = 0; p < 1; p += 0.05) {
      const pose = crawlPose(p, BABY, amount);
      const sy = BABY.shoulder.y * Math.cos(pose.pitch) - BABY.shoulder.z * Math.sin(pose.pitch);
      const shoulder = { y: BABY.bodyY + sy + pose.lift, z: 0 };
      const hip = { y: BABY.hip.y + pose.hipLift + pose.lift, z: 0 };
      pose.limbs.forEach((l, k) => {
        const t = k < 2 ? tipAt(shoulder, BABY.armTip, pose.pitch + l.rotation, l.scale) : tipAt(hip, BABY.legTip, l.rotation, l.scale);
        assert.ok(t.y > -1e-9, `limb ${k} at blend ${amount.toFixed(2)} is ${t.y.toFixed(3)} below the floor`);
      });
    }
});

test("a sitting baby is the authored pose", () => {
  const pose = crawlPose(0.42, BABY, 0);
  assert.equal(pose.pitch, 0);
  for (const l of pose.limbs) {
    assert.equal(Math.abs(l.rotation), 0);
    assert.equal(l.scale, 1);
  }
});
