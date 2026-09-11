export type Point = { x: number; z: number };
export type Collider = Point & { w: number; d: number };
export const navigation = {
  halfWidth: 5.85,
  halfDepth: 4.05,
  radius: 0.24,
  grid: 0.35,
  reach: 1.55,
  arrival: 1.25,
  pickup: 1.25,
} as const;
export const spawn: Point = { x: 0, z: 2.6 };
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.z - b.z);

/** Pickups require the same clear ground path as interactions, never through furniture. */
export function withinPickup(
  player: Point,
  item: Point,
  colliders: Collider[],
) {
  return (
    distance(player, item) < navigation.pickup &&
    clearSegment(player, item, colliders)
  );
}

export function free(p: Point, colliders: Collider[]) {
  return (
    Number.isFinite(p.x) &&
    Number.isFinite(p.z) &&
    Math.abs(p.x) < navigation.halfWidth &&
    Math.abs(p.z) < navigation.halfDepth &&
    !colliders.some(
      (c) =>
        Math.abs(p.x - c.x) <= c.w / 2 + navigation.radius &&
        Math.abs(p.z - c.z) <= c.d / 2 + navigation.radius,
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

export function recoverPosition(p: Point, colliders: Collider[]): Point {
  if (free(p, colliders)) return { ...p };
  const candidates: Point[] = [{ ...spawn }];
  for (let x = -16; x <= 16; x++)
    for (let z = -11; z <= 11; z++)
      candidates.push({ x: x * navigation.grid, z: z * navigation.grid });
  return (
    candidates
      .filter((c) => free(c, colliders))
      .sort((a, b) => distance(a, p) - distance(b, p))[0] ?? { ...spawn }
  );
}

/** Exact endpoints connect to nearby grid nodes; rounding cannot invalidate a tap. */
export function findPath(
  start: Point,
  end: Point,
  colliders: Collider[],
): Point[] {
  if (!free(start, colliders) || !free(end, colliders)) return [];
  if (clearSegment(start, end, colliders)) return [{ ...end }];
  const step = navigation.grid;
  const key = (x: number, z: number) => `${x},${z}`;
  const point = (key: string): Point => {
    const [x, z] = key.split(",").map(Number);
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
  for (let i = 0; i < queue.length && i < 2500; i++) {
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
      const next = key(x + dx, z + dz);
      if (!previous.has(next) && clearSegment(p, point(next), colliders)) {
        previous.set(next, k);
        queue.push(next);
      }
    }
  }
  if (!found) return [];
  const route: Point[] = [{ ...end }];
  for (let k: string | null = found; k !== null; k = previous.get(k) ?? null)
    route.unshift(point(k));
  // Remove grid stair-steps only where the entire shortcut is collision-free.
  const smooth: Point[] = [];
  let from = start,
    index = 0;
  while (index < route.length) {
    let next = route.length - 1;
    while (next > index && !clearSegment(from, route[next], colliders)) next--;
    smooth.push(route[next]);
    from = route[next];
    index = next + 1;
  }
  return smooth;
}

export function surfaceHeight(scene: string, x: number, z: number) {
  if (scene === "home")
    return Math.abs(x) < 2.85 && Math.abs(z) < 2 ? 0.16 : 0.1;
  if (scene === "school" || scene === "campus")
    return Math.abs(x) < 2.75 && Math.abs(z) < 1.75 ? 0.15 : 0.1;
  if (scene === "office")
    return Math.abs(x) < 2.9 && Math.abs(z) < 2 ? 0.15 : 0.1;
  if (Math.abs(x) < 5.4 && Math.abs(z - 0.25) < 0.85) return 0.105;
  const stone = Math.round(x);
  return Math.abs(stone) <= 5 &&
    Math.abs(x - stone) < 0.36 &&
    Math.abs(z - 1.65) < 0.275
    ? 0.14
    : 0.06;
}
