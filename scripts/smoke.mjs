import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.GAME_URL || "http://127.0.0.1:4193/";
await mkdir("docs/captures", { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
});
const diagnostic = () => page.evaluate(() => window.lifeDiagnostics);
async function travel(id) {
  await page.locator("[data-action=explore]").click();
  await page.locator(`[data-place="${id}"]`).click();
}
try {
  await page.goto(base);
  await page.waitForFunction(() => window.lifeDiagnostics?.loading === false);
  await page.screenshot({ path: "docs/captures/title-desktop.png" });
  await page.locator("[data-action=start]").click();
  await page.waitForFunction(
    () =>
      window.lifeDiagnostics.loading === false &&
      window.lifeDiagnostics.mode === "play",
  );
  const before = (await diagnostic()).render.position;
  await page.keyboard.down("d");
  await page.waitForTimeout(250);
  await page.keyboard.up("d");
  const after = (await diagnostic()).render.position;
  assert.ok(
    Math.abs(after.x - before.x) > 0.1 && Math.abs(after.z - before.z) > 0.05,
    "Keyboard movement affects ground coordinates",
  );
  for (let chapter = 0; chapter < 12; chapter++) {
    for (let encounter = 0; encounter < 2; encounter++) {
      await travel(`person:${encounter}`);
      await page.waitForFunction(
        () => window.lifeDiagnostics.panel === "choice",
        null,
        { timeout: 20000 },
      );
      if (encounter === 0)
        await page.screenshot({
          path: `docs/captures/chapter-${chapter + 1}.png`,
        });
      await page
        .locator(`[data-action=choose][data-index="${chapter % 3}"]`)
        .click();
    }
    if (chapter === 0) {
      await travel("discovery:0");
      await page.waitForFunction(
        () => window.lifeDiagnostics.discoveries === 1,
        null,
        { timeout: 15000 },
      );
      await page.reload();
      await page.waitForFunction(
        () => window.lifeDiagnostics?.loading === false,
      );
      await page.locator("[data-action=continue]").click();
      await page.waitForFunction(
        () => window.lifeDiagnostics.loading === false,
      );
      assert.equal((await diagnostic()).choices, 2);
    }
    await travel("exit");
    await page.waitForFunction(
      (expected) =>
        window.lifeDiagnostics.loading === false &&
        (window.lifeDiagnostics.chapter === expected ||
          window.lifeDiagnostics.complete),
      chapter + 1,
      { timeout: 20000 },
    );
    console.log(`Chapter ${chapter + 1}: complete`);
  }
  assert.equal((await diagnostic()).complete, true);
  await page.screenshot({ path: "docs/captures/ending.png" });
  assert.equal((await diagnostic()).choices, 24);
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  mobile.on("pageerror", (e) => errors.push(e.message));
  await mobile.goto(base);
  await mobile.waitForFunction(() => window.lifeDiagnostics?.loading === false);
  await mobile.screenshot({ path: "docs/captures/title-mobile.png" });
  await mobile.locator("[data-action=start]").tap();
  await mobile.waitForFunction(() => window.lifeDiagnostics.loading === false);
  await mobile.locator("[data-action=explore]").tap();
  await mobile.locator('[data-place="person:0"]').tap();
  await mobile.waitForFunction(
    () => window.lifeDiagnostics.panel === "choice",
    null,
    { timeout: 20000 },
  );
  await mobile.screenshot({ path: "docs/captures/dialogue-mobile.png" });
  const world = await mobile.locator("#world").boundingBox(),
    dialog = await mobile.locator(".dialogue").boundingBox();
  assert.ok(
    world.y + world.height <= dialog.y + 5,
    "Dialogue does not cover the 3D playfield",
  );
  assert.equal(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await mobile.locator('[data-action=choose][data-index="1"]').tap();
  await mobile.locator("[data-action=pause]").tap();
  assert.equal(
    await mobile.evaluate(() => window.lifeDiagnostics.panel),
    "pause",
  );
  await mobile.setViewportSize({ width: 320, height: 568 });
  await mobile.screenshot({ path: "docs/captures/small-mobile.png" });
  const report = {
    base,
    errors,
    desktop: await diagnostic(),
    mobile: await mobile.evaluate(() => window.lifeDiagnostics),
    result: "pass",
  };
  assert.deepEqual(errors, []);
  await writeFile("docs/smoke-result.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (e) {
  await page.screenshot({ path: "docs/captures/failure.png" });
  console.error(await diagnostic());
  throw e;
} finally {
  await browser.close();
}
