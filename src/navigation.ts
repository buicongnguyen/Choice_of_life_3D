export type Point = { x: number; z: number };
export type Collider = Point & { w: number; d: number; variant?: string };
export type Anchor = Point & { facing: number; y?: number };
export type SceneLayout = {
  colliders: Collider[];
  anchors: Record<string, Anchor>;
  backdrop?: { x: number; y: number; z: number; s: number; variant: string; rot?: number } | null;
  floor?: number;
  interior?: boolean;
  night?: boolean;
  variants?: string[];
};
/** Every diorama shares the same walkable rectangle at y = 0 (see art/kitehaven/scenes.py). */
export const navigation = {
  halfWidth: 5.85,
  halfDepth: 4.05,
  radius: 0.24,
  grid: 0.35,
  reach: 1.55,
  arrival: 1.2,
  pickup: 1.1,
} as const;
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);

/**
 * Lane-stepping (see docs/SUBWAY_LANES_PLAN.md): a small number of parallel tracks laid out
 * along the camera's screen-right axis, so A/D or ←/→ always reads as "left/right on screen"
 * under the fixed isometric camera, whichever way a diorama happens to be modelled. The scalar
 * is the player's position projected onto that axis (world.ts owns the actual 3D RIGHT vector;
 * this module only knows the 1D lane coordinates, so it's plain and testable).
 */
export const LANE_COUNT = 5;
export const LANE_SPACING = 1.65;
export const LANES: number[] = Array.from({ length: LANE_COUNT }, (_, i) => (i - (LANE_COUNT - 1) / 2) * LANE_SPACING);
export const LANE_MID = (LANE_COUNT - 1) / 2;

/** The lane whose scalar coordinate is closest to a given position along the lane axis. */
export function laneIndexNear(scalar: number): number {
  let best = 0,
    bestDist = Infinity;
  LANES.forEach((lane, i) => {
    const d = Math.abs(lane - scalar);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

/** Clamp a lane step so it never walks off the ends of the track. */
export const clampLane = (i: number) => Math.min(LANE_COUNT - 1, Math.max(0, i));

/** Colliders active for a scene variant (untagged colliders always apply). */
export const activeColliders = (layout: SceneLayout, variant?: string) =>
  layout.colliders.filter((c) => !c.variant || c.variant === variant);

/** Pickups require the same clear ground path as interactions, never through furniture. */
export function withinPickup(player: Point, item: Point, colliders: Collider[]) {
  return distance(player, item) < navigation.pickup && clearSegment(player, item, colliders);
}

export function free(p: Point, colliders: Collider[]) {
  return (
    Number.isFinite(p.x) &&
    Number.isFinite(p.z) &&
    Math.abs(p.x) < navigation.halfWidth &&
    Math.abs(p.z) < navigation.halfDepth &&
    !colliders.some(
      (c) => Math.abs(p.x - c.x) <= c.w / 2 + navigation.radius && Math.abs(p.z - c.z) <= c.d / 2 + navigation.radius,
    )
  );
}

/** Swept point against furniture inflated by the avatar's clearance. */
export function clearSegment(a: Point, b: Point, colliders: Collider[]) {
  if (!free(a, colliders) || !free(b, colliders)) return false;
  return !colliders.some((c) => {
    let enter = 0,
      leave = 1;
    for (const axis of ["x", "z"] as const) {
      const radius = (axis === "x" ? c.w : c.d) / 2 + navigation.radius;
      const low = c[axis] - radius,
        high = c[axis] + radius;
      const delta = b[axis] - a[axis];
      if (Math.abs(delta) < 1e-10) {
        if (a[axis] < low || a[axis] > high) return false;
      } else {
        const t1 = (low - a[axis]) / delta,
          t2 = (high - a[axis]) / delta;
        enter = Math.max(enter, Math.min(t1, t2));
        leave = Math.min(leave, Math.max(t1, t2));
        if (enter > leave) return false;
      }
    }
    return enter <= leave;
  });
}

export function recoverPosition(p: Point, colliders: Collider[], spawn: Point): Point {
  if (free(p, colliders)) return { ...p };
  const candidates: Point[] = [{ ...spawn }];
  for (let x = -16; x <= 16; x++) for (let z = -11; z <= 11; z++) candidates.push({ x: x * navigation.grid, z: z * navigation.grid });
  return candidates.filter((c) => free(c, colliders)).sort((a, b) => distance(a, p) - distance(b, p))[0] ?? { ...spawn };
}

/** Nearest free point to a target (people and props stand on furniture edges sometimes). */
export function approach(target: Point, from: Point, colliders: Collider[]): Point | null {
  if (free(target, colliders)) return { ...target };
  let best: Point | null = null;
  for (let r = 0.2; r <= 1.2 && !best; r += 0.2)
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const p = { x: target.x + Math.cos(a) * r, z: target.z + Math.sin(a) * r };
      if (free(p, colliders) && (!best || distance(p, from) < distance(best, from))) best = p;
    }
  return best;
}

/** Exact endpoints connect to nearby grid nodes; rounding cannot invalidate a tap. */
export function findPath(start: Point, end: Point, colliders: Collider[]): Point[] {
  if (!free(start, colliders) || !free(end, colliders)) return [];
  if (clearSegment(start, end, colliders)) return [{ ...end }];
  const step = navigation.grid;
  const key = (x: number, z: number) => `${x},${z}`;
  const point = (k: string): Point => {
    const [x, z] = k.split(",").map(Number);
    return { x: x * step, z: z * step };
  };
  const previous = new Map<string, string | null>();
  const queue: string[] = [];
  const sx = Math.round(start.x / step),
    sz = Math.round(start.z / step);
  for (let x = sx - 2; x <= sx + 2; x++)
    for (let z = sz - 2; z <= sz + 2; z++) {
      const k = key(x, z),
        p = point(k);
      if (clearSegment(start, p, colliders)) {
        previous.set(k, null);
        queue.push(k);
      }
    }
  let found: string | undefined;
  for (let i = 0; i < queue.length && i < 3000; i++) {
    const k = queue[i],
      p = point(k);
    if (distance(p, end) < step * 2.5 && clearSegment(p, end, colliders)) {
      found = k;
      break;
    }
    const [x, z] = k.split(",").map(Number);
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const n = key(x + dx, z + dz);
      if (!previous.has(n) && clearSegment(p, point(n), colliders)) {
        previous.set(n, k);
        queue.push(n);
      }
    }
  }
  if (!found) return [];
  const route: Point[] = [{ ...end }];
  for (let k: string | null = found; k !== null; k = previous.get(k) ?? null) route.unshift(point(k));
  // Remove grid stair-steps only where the entire shortcut is collision-free.
  const smooth: Point[] = [];
  let from = start,
    index = 0;
  while (index < route.length) {
    let n = route.length - 1;
    while (n > index && !clearSegment(from, route[n], colliders)) n--;
    smooth.push(route[n]);
    from = route[n];
    index = n + 1;
  }
  return smooth;
}
