/**
 * Speed-true legs: feet stay planted on the floor whatever the speed.
 *
 * The toy characters have rigid legs on a hip pivot (art/kitehaven/characters.py). The gait
 * phase advances with distance travelled, never with time. While a foot is down, its leg angle
 * is solved from where that foot was planted (asin(offset / leg)), so the foot cannot slide.
 * Speed picks walk or run by the Froude number v²/(g·L), as in people:
 * - walking: long stance and double support, the body vaults over a straight leg;
 * - running: short stance, a springy leg that shortens mid-stance, and a flight phase.
 * Swing legs shorten (scale.y) to lift the foot clear, a cartoon knee for a kneeless toy.
 * All lengths are in the model's own units (divide world distances by the actor's scale).
 */
export type GaitShape = {
  /** Fraction of a full cycle that each foot is on the floor. */
  stance: number;
  /** Largest leg angle from vertical (radians) at touchdown and take-off. */
  reach: number;
  /** How far the swing foot lifts, as a share of the leg. */
  lift: number;
  /** How much the planted leg compresses mid-stance (runs), as a share of the leg. */
  squash: number;
  /** How high the body floats in the flight phase, as a share of the leg. */
  bounce: number;
  /** Forward lean of the body (radians) and arm swing relative to the legs. */
  lean: number;
  arms: number;
  /** 0 = walk, 1 = run. */
  run: number;
};

const G = 9.8;
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** The shape of the gait for a speed (model units per second) and a leg length (model units). */
export function gaitShape(speed: number, leg: number, energy = 1): GaitShape {
  const froude = (speed * speed) / (G * Math.max(0.05, leg));
  // Walk–run transition near Froude 0.5, as in people. An older body (energy < 1) jogs more gently.
  const run = smooth(0.32, 0.75, froude);
  return {
    stance: mix(0.62, 0.36, run),
    reach: mix(0.36, 0.6, run) * mix(0.8, 1, energy),
    lift: mix(0.07, 0.2, run),
    squash: mix(0, 0.06, run) * energy,
    bounce: mix(0, 0.07, run) * energy,
    lean: mix(0.03, 0.16, run),
    arms: mix(0.7, 1.15, run),
    run,
  };
}

/** Distance (model units) the body travels in one full cycle (two steps), so stance feet stay put. */
export const cycleLength = (shape: GaitShape, leg: number) => (2 * leg * Math.sin(shape.reach)) / shape.stance;

export type LegPose = {
  /** Rotation about the hip (radians; positive swings the foot backwards, like three.js rotation.x). */
  angle: number;
  /** Leg length factor (scale.y on the leg pivot): < 1 lifts a swing foot or squashes a planted leg. */
  scale: number;
  planted: boolean;
  /** Where the sole is, ahead of the hip, along the floor. */
  ahead: number;
};
export type BodyPose = { legs: [LegPose, LegPose]; arms: [number, number]; hipDrop: number; lean: number };

const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);

/**
 * The pose at a phase (0..1 over one full cycle; the right leg is half a cycle behind).
 * `amount` (0..1) eases the gait in and out when starting and stopping.
 */
export function gaitPose(phase: number, shape: GaitShape, leg: number, amount = 1): BodyPose {
  const reach = shape.reach * amount;
  const D = 2 * leg * Math.sin(reach); // how far a planted foot travels back past the hip
  const legs = [0, 0.5].map((offset) => {
    const u = (((phase + offset) % 1) + 1) % 1;
    if (u < shape.stance) {
      const s = u / shape.stance;
      return { ahead: D / 2 - s * D, planted: true, s };
    }
    const w = (u - shape.stance) / (1 - shape.stance);
    return { ahead: -D / 2 + D * smoother(w), planted: false, s: w };
  });
  // Hip height: the planted leg holds it up (springy in a run); in flight it floats on a small arc.
  const standing = legs.filter((l) => l.planted).map((l) => {
    const cos = Math.sqrt(Math.max(0, leg * leg - l.ahead * l.ahead));
    return cos - shape.squash * amount * leg * Math.sin(Math.PI * l.s);
  });
  let hip: number;
  if (standing.length) hip = Math.min(...standing);
  else {
    // both feet up: the phase through the flight, from one take-off to the next touchdown
    const flight = (0.5 - shape.stance) * 2; // share of a half cycle spent in the air
    const into = ((((phase % 0.5) + 0.5) % 0.5) * 2 - shape.stance * 2) / Math.max(1e-6, flight);
    hip = leg * Math.cos(reach) + shape.bounce * amount * leg * Math.sin(Math.PI * Math.min(1, Math.max(0, into)));
  }
  const poses = legs.map((l) => {
    // Aim the (telescoping) leg at its sole: planted on the floor, or a little above it in swing.
    // Length and angle both come from the target, so a squashed planted leg doesn't drag its foot.
    const clear = l.planted ? 0 : shape.lift * amount * leg * Math.sin(Math.PI * l.s);
    const down = Math.max(1e-6, hip - clear);
    const reachTo = Math.hypot(l.ahead, down);
    const scale = Math.min(1, Math.max(0.55, reachTo / leg));
    const angle = -Math.atan2(l.ahead, down);
    return { angle, scale, planted: l.planted, ahead: l.ahead };
  }) as [LegPose, LegPose];
  // Arms swing against the legs on the same side.
  const arms: [number, number] = [-poses[0].angle * shape.arms, -poses[1].angle * shape.arms];
  return { legs: poses, arms, hipDrop: hip - leg, lean: shape.lean * amount };
}

/**
 * A baby's hands-and-knees crawl. The sitting baby leans forward onto four limbs. Diagonal
 * pairs move together (left hand with right knee), as crawling babies do, and every contact
 * is solved exactly like a planted foot. Limbs keep their authored bend (they're angled, not
 * straight down), so each is aimed by turning its rest tip onto the target and scaling it
 * uniformly.
 */
export type Vec = { y: number; z: number };
export type CrawlRig = {
  /** Body pivot height; shoulders are children of the body, hips of the root. */
  bodyY: number;
  shoulder: Vec;
  hip: Vec;
  /** Rest tips (the lowest point of hand and foot) relative to their pivots. */
  armTip: Vec;
  legTip: Vec;
};
// Tuned so limbs stay 85–106% of their authored size (planted ones ≥ 92%) and the raised hips
// stay inside the round body (see docs/KITEHAVEN_REDESIGN.md §10).
export const CRAWL = {
  pitch: 1.1, // body lean when crawling (radians, about 63°)
  hipLift: 0.12, // hips up off the floor onto the knees
  stance: 0.5, // each limb is down half the cycle: a trot-like diagonal crawl
  reach: 0.1, // a contact travels this far either side of its centre
  armCentre: 0.03, // hands land just ahead of the shoulders
  legCentre: -0.04, // knees just behind the hips
  lift: 0.02, // how high a swinging hand or knee clears the floor
  head: 0.8, // share of the lean the head takes back, to keep looking ahead
};
export const crawlCycle = () => (2 * CRAWL.reach) / CRAWL.stance;
export type LimbPose = { rotation: number; scale: number; planted: boolean };
export type CrawlPose = {
  pitch: number;
  hipLift: number;
  /** Lift for the whole baby (body and hips) so no limb dips below the floor mid-blend; 0 while crawling. */
  lift: number;
  headTilt: number;
  limbs: [LimbPose, LimbPose, LimbPose, LimbPose];
};

const forwardAngle = (v: Vec) => Math.atan2(v.z, -v.y);

/** Limbs in order armL, armR, legL, legR; `amount` blends from sitting (0) to crawling (1). */
export function crawlPose(phase: number, rig: CrawlRig, amount = 1): CrawlPose {
  const p = CRAWL.pitch;
  // where the shoulders sit once the body leans (rotation about x by p)
  const sy = rig.shoulder.y * Math.cos(p) - rig.shoulder.z * Math.sin(p);
  const sz = rig.shoulder.y * Math.sin(p) + rig.shoulder.z * Math.cos(p);
  const shoulder = { y: rig.bodyY + sy, z: sz };
  const hip = { y: rig.hip.y + CRAWL.hipLift, z: rig.hip.z };
  const limb = (offset: number, pivot: Vec, tip: Vec, centre: number, isArm: boolean): LimbPose => {
    const u = (((phase + offset) % 1) + 1) % 1;
    let ahead: number,
      clear = 0;
    const planted = u < CRAWL.stance;
    if (planted) ahead = centre + CRAWL.reach - (u / CRAWL.stance) * 2 * CRAWL.reach;
    else {
      const w = (u - CRAWL.stance) / (1 - CRAWL.stance);
      ahead = centre - CRAWL.reach + 2 * CRAWL.reach * smoother(w);
      clear = CRAWL.lift * Math.sin(Math.PI * w);
    }
    const down = pivot.y - clear;
    const want = Math.atan2(ahead, down);
    // An arm turns with the leaning body (a forward lean swings a hanging arm back by p).
    const rest = forwardAngle(tip) - (isArm ? p : 0);
    const rotation = rest - want;
    const scale = Math.hypot(ahead, down) / Math.hypot(tip.y, tip.z);
    return {
      rotation: rotation * amount,
      scale: 1 + (scale - 1) * amount,
      planted,
    };
  };
  const limbs: CrawlPose["limbs"] = [
    limb(0, shoulder, rig.armTip, CRAWL.armCentre, true),
    limb(0.5, shoulder, rig.armTip, CRAWL.armCentre, true),
    limb(0.5, hip, rig.legTip, CRAWL.legCentre, false),
    limb(0, hip, rig.legTip, CRAWL.legCentre, false),
  ];
  const pitch = p * amount,
    hipLift = CRAWL.hipLift * amount;
  // Blending from sitting swings the forward legs down through the floor before the hips rise:
  // lift the whole baby by however far the lowest limb would sink (zero once fully crawling).
  const tipY = (l: LimbPose, k: number) => {
    const arm = k < 2;
    const base = arm ? rig.bodyY + rig.shoulder.y * Math.cos(pitch) - rig.shoulder.z * Math.sin(pitch) : rig.hip.y + hipLift;
    const tip = arm ? rig.armTip : rig.legTip;
    const a = (arm ? pitch : 0) + l.rotation;
    return base + l.scale * (tip.y * Math.cos(a) - tip.z * Math.sin(a));
  };
  const lowest = Math.min(...limbs.map(tipY));
  return { pitch, hipLift, lift: amount < 1 ? Math.max(0, -lowest) : 0, headTilt: -CRAWL.head * p * amount, limbs };
}
