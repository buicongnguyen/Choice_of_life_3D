import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { activeColliders, approach, clearSegment, findPath, free, recoverPosition, withinPickup, type Collider, type Point, type SceneLayout } from "./navigation";

const layouts: Record<string, SceneLayout> = JSON.parse(readFileSync(new URL("../public/models/layout.json", import.meta.url), "utf8"));
const scenes = Object.entries(layouts).filter(([k, v]) => k !== "_meta" && k !== "harbour" && (v as SceneLayout).anchors);

function assertRoute(start: Point, end: Point, colliders: Collider[], label: string) {
  const to = approach(end, start, colliders);
  assert.ok(to, `${label}: no free ground near the target`);
  const route = findPath(start, to!, colliders);
  assert.ok(route.length, `${label}: no route ${JSON.stringify({ start, end })}`);
  let previous = start;
  for (const next of route) {
    assert.ok(clearSegment(previous, next, colliders), `${label}: route crosses furniture`);
    previous = next;
  }
}

test("every Blender layout exports the anchors the story needs", () => {
  assert.equal(scenes.length, 12);
  for (const [name, layout] of scenes) {
    for (const key of ["spawn", "exit", "act", "npc0", "npc1", "npc2", "npc3", "npc4", "find0", "find1", "find2", "hunt0", "hunt1", "hunt2", "hunt3"])
      assert.ok(layout.anchors[key], `${name} lacks ${key}`);
  }
});

test("from the spawn point you can reach every person, discovery, hunt spot and the exit — in every workplace fit-out", () => {
  for (const [name, layout] of scenes) {
    for (const variant of layout.variants ?? [undefined]) {
      const colliders = activeColliders(layout, variant);
      const spawn = layout.anchors.spawn;
      assert.ok(free(spawn, colliders), `${name}: spawn is blocked`);
      for (const [key, a] of Object.entries(layout.anchors)) {
        if (key === "spawn") continue;
        assertRoute(spawn, a, colliders, `${name}${variant ? `[${variant}]` : ""}:${key}`);
      }
    }
  }
});

test("variant colliders only apply to their own fit-out", () => {
  const w = layouts.workplace;
  const studio = activeColliders(w, "studio"),
    clinic = activeColliders(w, "clinic");
  assert.ok(studio.every((c) => !c.variant || c.variant === "studio"));
  assert.ok(clinic.every((c) => !c.variant || c.variant === "clinic"));
  assert.notEqual(studio.length, clinic.length);
});

test("exact furniture-edge taps route, and invalid positions recover to free ground", () => {
  const colliders: Collider[] = [{ x: 0, z: 0, w: 2, d: 1 }];
  assert.equal(free({ x: 0, z: 0 }, colliders), false);
  const recovered = recoverPosition({ x: 0, z: 0 }, colliders, { x: 0, z: 2.6 });
  assert.ok(free(recovered, colliders));
  assert.deepEqual(recoverPosition({ x: 3, z: 1 }, colliders, { x: 0, z: 2.6 }), { x: 3, z: 1 });
  assert.equal(recoverPosition({ x: Number.NaN, z: 0 }, [], { x: 0, z: 2.6 }).x, 0);
  const edge = { x: 1.25, z: 0 };
  assert.ok(free(edge, colliders));
  assert.ok(findPath({ x: -3, z: 0 }, edge, colliders).length);
});

test("pickups need clear ground within reach", () => {
  const wall: Collider[] = [{ x: 0, z: 0, w: 0.2, d: 4 }];
  assert.equal(withinPickup({ x: -0.6, z: 0 }, { x: 0.6, z: 0 }, wall), false);
  assert.equal(withinPickup({ x: 1.5, z: 0 }, { x: 0.6, z: 0 }, []), true);
  assert.equal(withinPickup({ x: 3, z: 0 }, { x: 0.6, z: 0 }, []), false);
});
