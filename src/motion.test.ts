import { test } from "node:test";
import assert from "node:assert/strict";
import { World } from "./world";

test("reduced motion immediately hides existing effects and stops fireworks simulation", () => {
  // Exercise the actual World methods without constructing a WebGL renderer.
  const world = Object.create(World.prototype) as World;
  let bursts = 0;
  const fireworks = {
    obj: { visible: true, geometry: { getAttribute: () => ({ needsUpdate: false }) } },
    next: 0, life: new Float32Array([1]), max: new Float32Array([1]),
    pos: new Float32Array(3), col: new Float32Array(3), base: new Float32Array(3), vel: new Float32Array(3),
  };
  const weather = { obj: { visible: true } };
  Object.assign(world, { fireworks, weather, walkers: [], burst: () => { bursts++; } });
  const animation = world as unknown as { animateTown: (t: number, dt: number) => void };
  world.reducedMotion = true;
  assert.equal(fireworks.obj.visible, false);
  assert.equal(weather.obj.visible, false);
  animation.animateTown(1, 0.05);
  assert.equal(bursts, 0);
  assert.equal(fireworks.life[0], 1);
  assert.equal(fireworks.next, 0);
  world.reducedMotion = false;
  assert.equal(fireworks.obj.visible, true);
  assert.equal(weather.obj.visible, true);
  animation.animateTown(2, 0.05);
  assert.equal(bursts, 1);
  assert.ok(fireworks.life[0] < 1);
});
