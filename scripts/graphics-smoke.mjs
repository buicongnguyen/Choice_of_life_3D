// Bounded graphics check: two phone views, quality switching, save safety, all GLB pivots.
import { chromium } from "@playwright/test";
import { tsImport } from "tsx/esm/api";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const { newLife, choose, advance, SAVE_KEY } = await tsImport(
  "../src/core.ts",
  import.meta.url,
);
const settings = "choice-of-life-3d-settings";
const base = process.env.GAME_URL || "http://127.0.0.1:4196/";
const manifest = JSON.parse(
  await readFile("public/models/low/manifest.json", "utf8"),
);
const metrics = {
  assetBytes: 0,
  fullAssetBytes: 0,
  triangles: 0,
  fullTriangles: 0,
};
function gltf(buffer) {
  assert.equal(buffer.toString("ascii", 0, 4), "glTF");
  return JSON.parse(buffer.toString("utf8", 20, 20 + buffer.readUInt32LE(12)));
}
for (const [name, detail] of Object.entries(manifest.detail)) {
  const low = gltf(await readFile(`public/models/low/${name}.glb`));
  const high = gltf(await readFile(`public/models/${name}.glb`));
  assert.equal(low.images?.length || 0, 0, name + " must not load textures");
  assert.ok(detail.bytes < detail.sourceBytes, name + " bytes reduced");
  assert.ok(
    detail.triangles < detail.sourceTriangles,
    name + " geometry reduced",
  );
  // Every animation pivot survives, including its position/rotation/scale.
  for (const node of high.nodes.filter((n) =>
    /^(Head|Arm[LR]|Leg[LR])$/.test(n.name),
  )) {
    const match = low.nodes.find((n) => n.name === node.name);
    assert.ok(match, `${name} retains ${node.name}`);
    for (const key of ["translation", "rotation", "scale"])
      assert.deepEqual(match[key], node[key], `${name}/${node.name} ${key}`);
  }
  metrics.assetBytes += detail.bytes;
  metrics.fullAssetBytes += detail.sourceBytes;
  metrics.triangles += detail.triangles;
  metrics.fullTriangles += detail.sourceTriangles;
}
await mkdir("docs/captures", { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  screen: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
page.setDefaultTimeout(20000);
const errors = [],
  models = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  if (r.url().includes(".glb")) models.push(r.url());
});
async function ready() {
  await page.waitForFunction(() => window.lifeDiagnostics?.loading === false);
}
async function closePanel() {
  await page.locator('[role="dialog"] [data-action="close"]').last().click();
}
async function snapshot(label) {
  // Allow the full-detail layout transition and at least one low-detail paint.
  await page.waitForTimeout(400);
  const data = await page.evaluate(() => ({
    ...window.lifeDiagnostics,
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
  }));
  assert.equal(data.overflow, false);
  assert.equal(data.render.playerVisible, true);
  await page.screenshot({ path: `docs/captures/graphics-${label}.png` });
  return data;
}
try {
  await page.goto(base);
  await ready();
  assert.equal(await page.locator('[name="graphics"]').inputValue(), "low");
  assert.ok(
    models.length > 0 && models.every((url) => url.includes("/models/low/")),
  );
  await page.locator('[data-action="start"]').click();
  await ready();
  await closePanel();
  const low = await snapshot("low-baby");
  assert.equal(low.render.shadows, false);
  assert.equal(low.render.maxFPS, 30);
  const beforeMove = low.render.position;
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(350);
  await page.keyboard.up("ArrowRight");
  const moved = await page.evaluate(
    () => window.lifeDiagnostics.render.position,
  );
  assert.ok(Math.hypot(moved.x - beforeMove.x, moved.z - beforeMove.z) > 0.1);
  await page.locator('[data-action="pause"]').click();
  await snapshot("settings");
  await Promise.all([
    page.waitForEvent("load"),
    page.locator('[name="graphics"]').selectOption("high"),
  ]);
  await ready();
  assert.equal(await page.locator('[name="graphics"]').inputValue(), "high");
  assert.equal(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)).graphics,
      settings,
    ),
    "high",
  );
  await page.locator('[data-action="continue"]').click();
  await ready();
  await closePanel();
  const high = await snapshot("full-baby");
  assert.deepEqual(
    high.render.position,
    moved,
    "switching saves player position",
  );
  assert.equal(high.render.scale, low.render.scale);
  assert.equal(high.render.shadows, true);
  assert.ok(high.render.triangles > low.render.triangles * 2);
  assert.ok(high.render.buffer.width > low.render.buffer.width);
  assert.ok(high.render.buffer.height > low.render.buffer.height);

  // Exercise a real life with earlier decisions and an adult, not just the nursery.
  let adult = newLife({ name: "Ari", gender: "female", skin: 2 });
  for (let chapter = 0; chapter < 6; chapter++) {
    adult = choose(choose(adult, 0, 1), 1, 1);
    adult = advance(adult);
  }
  await page.evaluate(
    ({ key, settings, adult }) => {
      localStorage.setItem(settings, JSON.stringify({ graphics: "low" }));
    },
    { key: SAVE_KEY, settings, adult },
  );
  // Park the old in-memory story at title before installing the isolated fixture,
  // so pagehide cannot overwrite it. No user browser/profile is used here.
  await page.locator('[data-action="pause"]').click();
  await page.locator('[data-action="title"]').click();
  await page.evaluate(
    ({ key, adult }) => localStorage.setItem(key, JSON.stringify(adult)),
    { key: SAVE_KEY, adult },
  );
  await page.reload();
  await ready();
  await page.locator('[data-action="continue"]').click();
  await ready();
  await closePanel();
  const adultLow = await snapshot("low-adult");
  assert.equal(adultLow.chapter, 6);
  assert.equal(adultLow.choices, 12);
  assert.equal(adultLow.render.quality, "low");
  await page.locator('[data-action="pause"]').click();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage blocked", "QuotaExceededError");
    };
  });
  await page.locator('[name="graphics"]').selectOption("high");
  assert.match(
    await page.locator("#graphics-status").textContent(),
    /Could not save/,
  );
  assert.equal(await page.locator('[name="graphics"]').inputValue(), "low");
  assert.equal(await page.evaluate(() => window.lifeDiagnostics.mode), "play");
  assert.deepEqual(errors, []);
  const report = { metrics, low, high, adultLow, saveSafety: true, errors };
  await writeFile(
    "docs/graphics-smoke-result.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
