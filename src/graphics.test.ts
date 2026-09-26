import { test } from "node:test";
import assert from "node:assert/strict";
import { graphicsQuality, graphicsProfile } from "./graphics";

test("phone default is low, but saved preferences always win", () => {
  assert.equal(graphicsQuality(undefined, true), "low");
  assert.equal(graphicsQuality(undefined, false), "high");
  assert.equal(graphicsQuality("high", true), "high");
  assert.equal(graphicsQuality("low", false), "low");
  for (const invalid of [null, "auto", {}, 1]) assert.equal(graphicsQuality(invalid, true), "low");
});

test("low profile loads lighter geometry, skips shadows and bloom, and caps pixels", () => {
  const low = graphicsProfile("low", 3),
    high = graphicsProfile("high", 3);
  assert.equal(low.modelFolder, "low/");
  assert.equal(high.modelFolder, "");
  assert.equal(low.shadows, false);
  assert.equal(low.bloom, false);
  assert.equal(high.bloom, true);
  assert.equal(low.antialias, false);
  assert.equal(low.maxFPS, 30);
  assert.ok(low.pixelRatio ** 2 / high.pixelRatio ** 2 < 0.4);
  assert.equal(graphicsProfile("high", 1).pixelRatio, 1);
});
