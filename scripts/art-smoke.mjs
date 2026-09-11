import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
const base = process.env.GAME_URL || "http://127.0.0.1:4194/";
const version = JSON.parse(await readFile("package.json", "utf8")).version;
const manifest = JSON.parse(
  await readFile("public/models/manifest.json", "utf8"),
);
const models = Object.keys(manifest.files).map((file) =>
  file.replace(".glb", ""),
);
assert.equal(models.length, 20);
for (const model of models) {
  const buffer = await readFile(`public/models/${model}.glb`);
  assert.equal(buffer.toString("ascii", 0, 4), "glTF");
  const json = JSON.parse(
    buffer.toString("utf8", 20, 20 + buffer.readUInt32LE(12)),
  );
  assert.ok(json.meshes.length > 0);
  assert.ok(
    (json.images ?? []).every((image) => Number.isInteger(image.bufferView)),
    "Textures must be embedded",
  );
  assert.ok(
    json.materials.every((mat) => (mat.alphaMode ?? "OPAQUE") === "OPAQUE"),
    "No accidental transparent clothing",
  );
  if (["male", "female", "baby"].includes(model))
    for (const pivot of ["Head", "ArmL", "ArmR", "LegL", "LegR"])
      assert.ok(
        json.nodes.some((node) => node.name === pivot),
        `${model}: missing ${pivot}`,
      );
}
await mkdir("docs/captures", { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [],
  checks = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 840 },
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  await page.goto(new URL("asset-gallery.html", base).href);
  for (const model of models) {
    await page.locator("#asset").selectOption(model);
    await page.waitForFunction(
      (id) => window.artDiagnostics?.loaded === id,
      model,
    );
    checks.push(await page.evaluate(() => window.artDiagnostics));
    if (
      [
        "home",
        "female",
        "boat",
        "book",
        "office",
        "garden",
        "cat",
        "apple",
      ].includes(model)
    )
      await page.screenshot({ path: `docs/captures/crafted-${model}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#asset").selectOption("apple");
  await page.waitForFunction(() => window.artDiagnostics.loaded === "apple");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({ path: "docs/captures/crafted-gallery-mobile.png" });
  await page.goto(base);
  await page.waitForFunction(() => window.lifeDiagnostics?.loading === false);
  await page.locator("[data-action=start]").click();
  await page.waitForFunction(() => !window.lifeDiagnostics.loading);
  await page.locator('[role="dialog"] [data-action="close"]').last().click();
  const position = await page.evaluate(
    () => window.lifeDiagnostics.render.position,
  );
  await page.keyboard.down("d");
  await page.waitForTimeout(250);
  await page.keyboard.up("d");
  const after = await page.evaluate(
    () => window.lifeDiagnostics.render.position,
  );
  assert.ok(Math.hypot(after.x - position.x, after.z - position.z) > 0.1);
  await page.locator("[data-action=explore]").click();
  await page.locator('[data-place="person:0"]').click();
  await page.waitForFunction(() => window.lifeDiagnostics.panel === "choice");
  await page.screenshot({ path: "docs/captures/crafted-game-mobile.png" });
  await page.locator('[data-action=choose][data-index="0"]').click();
  assert.equal(await page.evaluate(() => window.lifeDiagnostics.choices), 1);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.reload();
  await page.waitForFunction(() => window.lifeDiagnostics?.loading === false);
  await page.screenshot({ path: "docs/captures/crafted-title.png" });
  await page.locator("[data-action=continue]").click();
  await page.waitForFunction(() => !window.lifeDiagnostics.loading);
  assert.equal(await page.evaluate(() => window.lifeDiagnostics.choices), 1);
  assert.equal(
    await page.evaluate(() => window.lifeDiagnostics.render.playerVisible),
    true,
  );
  const urls = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((url) => url.includes(".glb")),
  );
  assert.ok(
    urls.length > 0 && urls.every((url) => url.includes(`v=${version}`)),
    "New art must bypass old cached GLBs",
  );
  assert.deepEqual(errors, []);
  const result = {
    base,
    result: "pass",
    checkedAt: new Date().toISOString(),
    revision: manifest.revision,
    bytes: Object.values(manifest.files).reduce((a, b) => a + b, 0),
    errors,
    checks,
    game: await page.evaluate(() => window.lifeDiagnostics),
  };
  await writeFile(
    "docs/art-smoke-result.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
