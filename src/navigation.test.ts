import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  clearSegment,
  findPath,
  free,
  recoverPosition,
  surfaceHeight,
  spawn,
  type Collider,
  type Point,
} from "./navigation";
const rooms: Record<string, Collider[]> = JSON.parse(
  readFileSync(
    new URL("../public/models/colliders.json", import.meta.url),
    "utf8",
  ),
);
const stops: Point[] = [
  spawn,
  { x: -2.2, z: -0.7 },
  { x: 2.2, z: -1.25 },
  { x: -3.1, z: 0.9 },
  { x: 0, z: 1.6 },
  { x: 3.3, z: 0.6 },
  { x: 5.2, z: -0.3 },
];
function assertRoute(start: Point, end: Point, colliders: Collider[]) {
  const route = findPath(start, end, colliders);
  assert.ok(route.length, `No route: ${JSON.stringify({ start, end })}`);
  let previous = start;
  for (const next of route) {
    assert.ok(clearSegment(previous, next, colliders));
    previous = next;
  }
  assert.deepEqual(route.at(-1), end);
}
test("all six room families connect every required and optional activity", () => {
  for (const [name, colliders] of Object.entries(rooms)) {
    for (const stop of stops)
      assert.ok(free(stop, colliders), `${name}: obstructed activity`);
    for (const start of stops)
      for (const end of stops) assertRoute(start, end, colliders);
  }
});
test("exact furniture-edge taps connect even when their rounded grid node is blocked", () => {
  const colliders = [{ x: 0, z: 0, w: 1, d: 1 }];
  assertRoute({ x: -2, z: 0 }, { x: 0.76, z: 0.1 }, colliders);
  assert.equal(clearSegment({ x: -2, z: 0 }, { x: 2, z: 0 }, colliders), false);
  assert.equal(findPath({ x: -2, z: 0 }, { x: 0, z: 0 }, colliders).length, 0);
});
test("invalid old positions recover safely without moving legitimate saves", () => {
  for (const colliders of Object.values(rooms)) {
    assert.deepEqual(recoverPosition(spawn, colliders), spawn);
    for (const position of [...colliders, { x: 5.99, z: 4.2 }]) {
      const recovered = recoverPosition(position, colliders);
      assert.ok(free(recovered, colliders));
      assertRoute(recovered, spawn, colliders);
    }
  }
});
test("surface heights distinguish every rug, path, stone and gap", () => {
  assert.equal(surfaceHeight("home", 0, 0), 0.16);
  assert.equal(surfaceHeight("school", 0, 0), 0.15);
  assert.equal(surfaceHeight("office", 4, 0), 0.1);
  for (const scene of ["town", "garden"]) {
    assert.equal(surfaceHeight(scene, 0, 0.25), 0.105);
    assert.equal(surfaceHeight(scene, 2, 1.65), 0.14);
    assert.equal(surfaceHeight(scene, 2.5, 1.65), 0.06);
    assert.equal(surfaceHeight(scene, 5.6, 1.65), 0.06);
  }
});
