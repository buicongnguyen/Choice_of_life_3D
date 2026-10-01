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
