/**
 * The Life Run (docs/LIFE_RUN_PLAN.md): Subway Surfers' mechanics with Kitehaven's story.
 * Pure and deterministic: a plan is generated from a seed, and a Run steps it at a fixed rate.
 * The 3D view (runner-view.ts) only draws what this decides.
 *
 * Coordinates: `d` is the distance run from the start; an item's `z` is the distance along the
 * track where it stands. Lanes are x offsets; the crossroads widens them to one per option.
 */
export const RUN_LANES = [-2.2, 0, 2.2];
export const GATE_SPACING = 2.6;
export type Obstacle = "crate" | "cart" | "hurdle" | "banner";
export type Pickup = "coin" | "spark" | "heart" | "kite";
export type ItemKind = Obstacle | Pickup | "friend";
export type Item = { id: number; kind: ItemKind; lane: number; z: number; y: number; len: number; who?: string; taken?: boolean; hit?: boolean };
export type Theme = "town" | "pier" | "garden";
export type Body = "baby" | "kid" | "adult" | "elder";
export type GateOption = { index: number; label: string; open: boolean; why?: string };
export type RunPlan = {
  seed: number;
  theme: Theme;
  body: Body;
  base: number;
  top: number;
  /** Distance of the crossroads stop line; the gates stand GATE_AHEAD beyond it. */
  stop: number;
  items: Item[];
  gates: GateOption[];
};
export type RunEvent =
  | { type: "coin" | "spark" | "heart" | "kite"; item: Item }
  | { type: "hit"; item: Item; stumbles: number }
  | { type: "winded" }
  | { type: "highfive"; who: string }
  | { type: "crossroads" }
  | { type: "shut"; gate: number }
  | { type: "jump" | "slide" | "lane" }
  | { type: "done"; choice: number };
export type RunResult = { coins: number; sparks: number; hearts: number; stumbles: number; friends: string[]; choice: number };

export const GATE_AHEAD = 12;
export const JUMP = { peak: 1.35, time: 0.62 };
const GRAVITY = (8 * JUMP.peak) / (JUMP.time * JUMP.time);
const JUMP_V = (4 * JUMP.peak) / JUMP.time;
export const SLIDE_TIME = 0.7;
export const KITE_TIME = 5.5;
export const KITE_HEIGHT = 3.6;
export const MAX_STUMBLES = 3;
/** Height you must be above the ground to clear each obstacle (Infinity: change lane). */
export const CLEAR: Record<Obstacle, { depth: number; over: number; under?: boolean }> = {
  hurdle: { depth: 0.35, over: 0.55 },
  banner: { depth: 0.2, over: 2.4, under: true },
  crate: { depth: 1.7, over: 1.6 },
  cart: { depth: 4.4, over: 2.3 },
};
const PACE: Record<Body, [number, number, number]> = {
  // base speed, top speed, track length
  baby: [3.6, 4.4, 150],
  kid: [8.5, 11, 360],
  adult: [9.5, 12.5, 400],
  elder: [7, 8.5, 300],
};

/** Mulberry32: small, fast, good enough for level layout. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const gateX = (i: number, n: number) => (i - (n - 1) / 2) * GATE_SPACING;

type Row = (Obstacle | null)[];
/** Patterns are rows of three lanes; every one is passable (a free lane, or a jump/slide answer). */
const PATTERNS: { row: Row; level: number; weight: number }[] = [
  { row: ["crate", null, null], level: 0, weight: 3 },
  { row: [null, "crate", null], level: 0, weight: 3 },
  { row: [null, null, "crate"], level: 0, weight: 3 },
  { row: ["hurdle", null, null], level: 0, weight: 2 },
  { row: [null, "hurdle", null], level: 0, weight: 2 },
  { row: [null, "banner", null], level: 1, weight: 2 },
  { row: ["crate", "crate", null], level: 1, weight: 2 },
  { row: [null, "crate", "crate"], level: 1, weight: 2 },
  { row: ["crate", null, "crate"], level: 1, weight: 2 },
  { row: ["cart", null, null], level: 1, weight: 2 },
  { row: [null, null, "cart"], level: 1, weight: 2 },
  { row: ["hurdle", "hurdle", "hurdle"], level: 1, weight: 2 },
  { row: ["banner", "banner", "banner"], level: 2, weight: 2 },
  { row: ["cart", "hurdle", "crate"], level: 2, weight: 2 },
  { row: ["crate", "banner", "cart"], level: 2, weight: 2 },
];

export function bodyOf(kind: string): Body {
  return kind === "baby" || kind === "kid" || kind === "elder" ? kind : "adult";
}

/**
 * Lay out a run. `friends` stand in the street for a high-five; `gates` are the chapter's
 * visible options in order. Difficulty grows with the chapter (`level` 0..2) and the distance.
 */
export function planRun(opts: { seed: number; theme: Theme; body: Body; level: number; friends: string[]; gates: GateOption[] }): RunPlan {
  const r = rng(opts.seed);
  const [base, top, length] = PACE[opts.body];
  const items: Item[] = [];
  let id = 0;
  const add = (kind: ItemKind, lane: number, z: number, y = 0, extra: Partial<Item> = {}) => items.push({ id: id++, kind, lane, z, y, len: kind === "cart" ? CLEAR.cart.depth : 0, ...extra });
  const level = opts.body === "baby" ? -1 : opts.body === "elder" ? Math.min(0, opts.level) : opts.level;
  const pick = <T>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  // a gap of at least ~1.3 s at top speed between rows: room to read and react
  const gap = Math.max(11, top * 1.3);
  let z = 34;
  let row = 0;
  const kiteAt = opts.body === "baby" ? Infinity : length * (0.35 + r() * 0.2);
  let kiteUntil = -1;
  const friendRows = new Set<number>();
  const rows = Math.floor((length - 40 - z) / gap);
  opts.friends.slice(0, 2).forEach((_, i) => friendRows.add(Math.floor(((i + 1) * rows) / (Math.min(2, opts.friends.length) + 1))));
  let friendIndex = 0;
  let heartsLeft = opts.body === "baby" ? 1 : 2;
  while (z < length - 40) {
    // the kite lift: a kite in an open row, then a ribbon of sky sparks while you fly
    if (z >= kiteAt && kiteUntil < 0) {
      const lane = Math.floor(r() * 3);
      add("kite", lane, z, 0.9);
      kiteUntil = z + top * KITE_TIME;
      for (let s = z + 8; s < kiteUntil - 4; s += 3.2) add("spark", Math.floor(((s - z) / 20) % 3), s, KITE_HEIGHT + 0.9);
      z += gap;
      row++;
      continue;
    }
    if (friendRows.has(row) && friendIndex < opts.friends.length) {
      const lane = Math.floor(r() * 3);
      add("friend", lane, z, 0, { who: opts.friends[friendIndex++] });
      for (let k = 1; k <= 4; k++) add("spark", lane, z - 10 + k * 2, 0.9);
      z += gap;
      row++;
      continue;
    }
    // a safe landing: the rows just after the kite lift ends carry only coins
    if (kiteUntil > 0 && z > kiteUntil - 4 && z < kiteUntil + gap * 1.5) {
      for (let k = -2; k <= 2; k++) add("coin", 1, z + k * 2, 0.9);
      z += gap;
      row++;
      continue;
    }
    const pool = PATTERNS.filter((p) => p.level <= Math.max(-1, Math.min(2, level + (z > length * 0.55 ? 1 : 0))));
    let pattern: Row;
    if (level < 0 || !pool.length) {
      const lane = Math.floor(r() * 3);
      pattern = [0, 1, 2].map((i) => (i === lane ? "crate" : null));
    }
    else {
      const total = pool.reduce((s, p) => s + p.weight, 0);
      let w = r() * total;
      pattern = pool.find((p) => (w -= p.weight) < 0)!.row;
    }
    pattern.forEach((o, lane) => o && add(o, lane, o === "cart" ? z - CLEAR.cart.depth / 2 : z));
    // pickups teach the safe route: a line of coins through a free lane, or over/under the obstacle
    const free = pattern.map((o, i) => (o ? -1 : i)).filter((i) => i >= 0);
    const kind: Pickup = row % 4 === 3 ? "spark" : "coin";
    if (free.length) {
      const lane = pick(free);
      for (let k = -2; k <= 2; k++) add(kind, lane, z + k * 2, 0.9);
    } else {
      const lane = Math.floor(r() * 3);
      const o = pattern[lane]!;
      if (o === "hurdle") for (let k = -2; k <= 2; k++) add(kind, lane, z + k * 1.6, 0.9 + JUMP.peak * Math.max(0, 1 - (k / 2.6) ** 2));
      else if (o === "banner") for (let k = -2; k <= 2; k++) add(kind, lane, z + k * 1.6, 0.45);
    }
    if (heartsLeft > 0 && row % 6 === 5 && free.length) {
      heartsLeft--;
      add("heart", free[free.length - 1], z + gap / 2, 0.9);
    }
    z += gap;
    row++;
  }
  // nothing in the last stretch: a clear run-in to the crossroads
  return { seed: opts.seed, theme: opts.theme, body: opts.body, base, top, stop: length, items: items.filter((i) => i.z < length - 18), gates: opts.gates };
}

export class Run {
  d = 0;
  speed: number;
  lane = 1;
  x = 0;
  y = 0;
  vy = 0;
  slide = 0;
  kite = 0;
  invuln = 0;
  slow = 1;
  stumbles = 0;
  winded = false;
  coins = 0;
  sparks = 0;
  hearts = 0;
  friends: string[] = [];
  phase: "run" | "crossroads" | "through" | "done" = "run";
  gate = 0;
  choice = -1;
  /** Time since the last lane change (for the lean), and its direction. */
  leanDir = 0;
  time = 0;
  items: Item[];

  constructor(readonly plan: RunPlan) {
    this.speed = plan.base;
    this.items = plan.items.map((i) => ({ ...i }));
  }

  get lanes() {
    return this.phase === "run" ? RUN_LANES : this.plan.gates.map((_, i) => gateX(i, this.plan.gates.length));
  }
  get progress() {
    return Math.min(1, this.d / this.plan.stop);
  }
  get airborne() {
    return this.y > 0.02 || this.vy > 0;
  }
  get gateZ() {
    return this.plan.stop + GATE_AHEAD;
  }

  input(cmd: "left" | "right" | "jump" | "slide" | "go"): RunEvent[] {
    const ev: RunEvent[] = [];
    if (this.phase === "done" || this.phase === "through") return ev;
    if (cmd === "left" || cmd === "right") {
      const n = this.lanes.length;
      const next = Math.min(n - 1, Math.max(0, (this.phase === "run" ? this.lane : this.gate) + (cmd === "left" ? -1 : 1)));
      if (this.phase === "run") {
        if (next !== this.lane) {
          this.lane = next;
          this.leanDir = cmd === "left" ? -1 : 1;
          ev.push({ type: "lane" });
        }
      } else if (next !== this.gate) {
        this.gate = next;
        this.leanDir = cmd === "left" ? -1 : 1;
        ev.push({ type: "lane" });
      }
      return ev;
    }
    if (this.phase === "crossroads") {
      if (cmd === "jump" || cmd === "go") return this.go();
      return ev;
    }
    if (cmd === "jump" && !this.airborne && this.kite <= 0) {
      this.vy = JUMP_V;
      this.slide = 0;
      ev.push({ type: "jump" });
    } else if (cmd === "slide" && this.kite <= 0) {
      if (this.airborne) this.vy = -JUMP_V * 1.4; // drop fast, then slide on landing
      this.slide = SLIDE_TIME;
      ev.push({ type: "slide" });
    }
    return ev;
  }

  /** Choose the gate you're facing (or `index` directly, e.g. a tapped card). */
  go(index = this.gate): RunEvent[] {
    if (this.phase !== "crossroads") return [];
    const g = this.plan.gates[index];
    if (!g) return [];
    this.gate = index;
    if (!g.open) return [{ type: "shut", gate: index }];
    this.phase = "through";
    return [];
  }

  step(dt: number): RunEvent[] {
    const ev: RunEvent[] = [];
    if (this.phase === "done") return ev;
    this.time += dt;
    const before = this.d;
    // speed: ramps with distance; a stumble knocks it down for a moment; winded is a jog
    const ramp = this.plan.base + (this.plan.top - this.plan.base) * Math.min(1, this.d / this.plan.stop);
    this.slow = Math.min(1, this.slow + dt * 0.8);
    let want = (this.winded ? this.plan.base * 0.75 : ramp) * this.slow;
    if (this.phase === "crossroads") want = 0;
    if (this.phase === "through") want = this.plan.base;
    this.speed += (want - this.speed) * Math.min(1, dt * (this.phase === "crossroads" ? 4 : 3));
    if (this.phase === "run" && this.d >= this.plan.stop - 6) {
      // ease to a stop on the line, then the question
      this.speed = Math.min(this.speed, Math.max(0.6, (this.plan.stop - this.d) * 2.2));
    }
    this.d = this.phase === "run" ? Math.min(this.plan.stop, this.d + this.speed * dt) : this.d + this.speed * dt;
    if (this.phase === "run" && this.d >= this.plan.stop - 0.01) {
      this.phase = "crossroads";
      // face the gate nearest to where you are
      const lanes = this.lanes;
      this.gate = lanes.reduce((b, x, i) => (Math.abs(x - this.x) < Math.abs(lanes[b] - this.x) ? i : b), 0);
      this.kite = 0;
      ev.push({ type: "crossroads" });
    }
    // sideways: a quick, capped tween to the lane (0.14 s for a full lane)
    const goal = this.phase === "run" ? RUN_LANES[this.lane] : this.lanes[this.gate];
    const dx = goal - this.x;
    const lateral = (RUN_LANES[1] - RUN_LANES[0]) / 0.14;
    this.x += Math.sign(dx) * Math.min(Math.abs(dx), lateral * dt);
    // up and down: a jump arc, or the kite's lift
    if (this.kite > 0) {
      this.kite -= dt;
      const target = this.kite > 0.6 ? KITE_HEIGHT : 0;
      this.y += (target - this.y) * Math.min(1, dt * 4);
      this.vy = 0;
      if (this.kite <= 0) {
        this.vy = -0.1;
        this.invuln = Math.max(this.invuln, 1);
      }
    } else {
      this.vy -= GRAVITY * dt;
      this.y = Math.max(0, this.y + this.vy * dt);
      if (this.y === 0 && this.vy < 0) this.vy = 0;
    }
    if (this.slide > 0 && !this.airborne) this.slide -= dt;
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.phase === "through" && this.d >= this.gateZ + 2) {
      this.phase = "done";
      this.choice = this.plan.gates[this.gate].index;
      ev.push({ type: "done", choice: this.choice });
      return ev;
    }
    if (this.phase !== "run") return ev;
    // what you meet between the last step and this one
    for (const it of this.items) {
      if (it.taken || it.hit) continue;
      const lx = RUN_LANES[it.lane];
      if (Math.abs(this.x - lx) > 1.0) continue;
      if (it.kind === "friend") {
        if (Math.abs(it.z - this.d) < 0.7) {
          it.taken = true;
          if (it.who && !this.friends.includes(it.who)) this.friends.push(it.who);
          ev.push({ type: "highfive", who: it.who ?? "" });
        }
        continue;
      }
      if (it.kind === "coin" || it.kind === "spark" || it.kind === "heart" || it.kind === "kite") {
        if (Math.abs(it.z - this.d) < 0.8 && Math.abs(this.y + 0.9 - it.y) < 1.1) {
          it.taken = true;
          if (it.kind === "coin") this.coins++;
          else if (it.kind === "spark") this.sparks++;
          else if (it.kind === "heart") this.hearts++;
          else {
            this.kite = KITE_TIME;
            this.slide = 0;
          }
          ev.push({ type: it.kind, item: it });
        }
        continue;
      }
      const c = CLEAR[it.kind];
      const near = it.kind === "cart" ? it.z : it.z - c.depth / 2;
      const far = it.kind === "cart" ? it.z + c.depth : it.z + c.depth / 2;
      // the body's span along the track over this step
      if (this.d + 0.3 < near || before - 0.3 > far) continue;
      const cleared = c.under ? this.slide > 0 && !this.airborne : this.y >= c.over;
      if (cleared || this.kite > 0 || this.y >= c.over) continue;
      if (this.invuln > 0 || this.winded) continue;
      it.hit = true;
      this.stumbles++;
      this.invuln = 1.2;
      this.slow = 0.45;
      ev.push({ type: "hit", item: it, stumbles: this.stumbles });
      if (this.stumbles >= MAX_STUMBLES) {
        this.winded = true;
        // the street clears ahead: you jog the rest of the way
        this.items = this.items.filter((i) => i.z < this.d || !(i.kind in CLEAR));
        ev.push({ type: "winded" });
        break;
      }
    }
    return ev;
  }

  result(): RunResult {
    return { coins: this.coins, sparks: this.sparks, hearts: this.hearts, stumbles: this.stumbles, friends: [...this.friends], choice: this.choice };
  }
}

/** The logged action for a finished run (the choice is logged separately as talk:…). */
export const runAction = (r: RunResult) => `run:${r.coins}-${r.sparks}-${r.hearts}-${r.stumbles}:${r.friends.join(",")}`;
