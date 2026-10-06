import { test } from "node:test";
import assert from "node:assert/strict";
import { LANES, LANE_COUNT, LANE_MID, clampLane, laneIndexNear } from "./navigation";

test("lanes are evenly spaced, centred and odd-count (one true middle lane)", () => {
  assert.equal(LANES.length, LANE_COUNT);
  assert.equal(LANE_COUNT % 2, 1, "an odd lane count gives a centre lane to start in");
  assert.equal(LANES[LANE_MID], 0, "the middle lane sits on the axis origin");
  for (let i = 1; i < LANES.length; i++) {
    const gap = LANES[i] - LANES[i - 1];
    assert.ok(Math.abs(gap - (LANES[1] - LANES[0])) < 1e-9, "every gap between lanes is equal");
    assert.ok(gap > 0, "lanes are sorted left to right");
  }
});

test("laneIndexNear finds the closest lane, including off the ends", () => {
  for (let i = 0; i < LANES.length; i++) assert.equal(laneIndexNear(LANES[i]), i, `exactly on lane ${i}`);
  assert.equal(laneIndexNear(LANES[0] - 50), 0, "far left clamps to the leftmost lane");
  assert.equal(laneIndexNear(LANES.at(-1)! + 50), LANES.length - 1, "far right clamps to the rightmost lane");
  const mid = (LANES[0] + LANES[1]) / 2;
  assert.ok(laneIndexNear(mid - 0.001) === 0 && laneIndexNear(mid + 0.001) === 1, "the boundary falls to the nearer lane");
});

test("clampLane keeps a step inside the track", () => {
  assert.equal(clampLane(-3), 0);
  assert.equal(clampLane(LANE_COUNT + 3), LANE_COUNT - 1);
  assert.equal(clampLane(LANE_MID), LANE_MID);
  assert.equal(clampLane(LANE_MID + 1), LANE_MID + 1);
});
