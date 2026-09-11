import { chromium } from "@playwright/test";
import { tsImport } from "tsx/esm/api";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const { newLife, choose, advance, meet, SAVE_KEY } = await tsImport(
  "../src/core.ts",
  import.meta.url,
);
const base = process.env.GAME_URL || "http://127.0.0.1:4194/";
const browser = await chromium.launch({ headless: true });
const errors = [];
const reports = [];
const ready = (page) =>
  page.waitForFunction(() => window.lifeDiagnostics?.loading === false);
const diagnostic = (page) => page.evaluate(() => window.lifeDiagnostics);
async function open(options = {}, fixture) {
  const page = await browser.newPage(options);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  if (fixture)
    await page.addInitScript(
      ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
      { key: SAVE_KEY, state: fixture },
    );
  await page.goto(base);
  await ready(page);
  await page.locator(`[data-action=${fixture ? "continue" : "start"}]`).click();
  await ready(page);
  await page.locator('[role="dialog"] [data-action="close"]').last().click();
  return page;
}
async function travel(page, id) {
  if (
    ["briefing", "response", "pause"].includes((await diagnostic(page)).panel)
  )
    await page.locator('[role="dialog"] [data-action="close"]').last().click();
  await page.locator("[data-action=explore]").click();
  await page.locator(`[data-place="${id}"]`).click();
}
function fixture(chapter) {
  let state = newLife({ name: "Review", gender: "female", skin: 2 });
  while (state.chapter < chapter) {
    if (state.chapter === 7) for (let i = 0; i < 3; i++) state = meet(state, i);
    state = advance(choose(choose(state, 1, 0), 0, 0));
  }
  return state;
}
try {
  await mkdir("docs/captures", { recursive: true });
  const page = await open({ viewport: { width: 1280, height: 800 } });
  for (const i of [0, 1]) {
    await travel(page, `person:${i}`);
    await page.waitForFunction(() => window.lifeDiagnostics.panel === "choice");
    assert.equal(
      await page.locator(".screen-ui").evaluate((el) => el.inert),
      true,
    );
    await page.locator('[data-action=choose][data-index="0"]').click();
  }
  await travel(page, "discovery:0");
  await page.waitForFunction(() => window.lifeDiagnostics.discoveries === 1);
  await page.reload();
  await ready(page);
  await page.locator("[data-action=continue]").click();
  await ready(page);
  assert.equal((await diagnostic(page)).choices, 2);
  assert.equal((await diagnostic(page)).discoveries, 1);
  await travel(page, "exit");
  await page.waitForFunction(
    () =>
      !window.lifeDiagnostics.loading && window.lifeDiagnostics.chapter === 1,
  );
  reports.push({
    check: "nursery choices, discovery, continue and next chapter",
    state: await diagnostic(page),
  });
  await page.close();

  // Exercise a real delayed chapter load: blur must not save the old room position.
  const transition = await browser.newPage({
    viewport: { width: 1000, height: 750 },
  });
  transition.on("pageerror", (e) => errors.push(e.message));
  const completedToddler = choose(choose(fixture(1), 0, 0), 1, 0);
  await transition.addInitScript(
    ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
    { key: SAVE_KEY, state: completedToddler },
  );
  let releaseRoom;
  const gate = new Promise((resolve) => {
    releaseRoom = resolve;
  });
  await transition.route("**/school.glb*", async (route) => {
    await gate;
    await route.continue();
  });
  await transition.goto(base);
  await ready(transition);
  await transition.locator("[data-action=continue]").click();
  await ready(transition);
  await travel(transition, "exit");
  await transition.waitForFunction(
    () =>
      window.lifeDiagnostics.loading && window.lifeDiagnostics.chapter === 2,
  );
  await transition.evaluate(() => window.dispatchEvent(new Event("blur")));
  const loadingSave = await transition.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    SAVE_KEY,
  );
  assert.deepEqual(loadingSave.position, { x: 0, z: 2.6 });
  releaseRoom();
  await ready(transition);
  assert.equal((await diagnostic(transition)).panel, "pause");
  reports.push({
    check: "blur during chapter load preserves spawn and pause",
    state: await diagnostic(transition),
  });
  await transition.close();

  const adult = await open(
    { viewport: { width: 1280, height: 800 } },
    fixture(7),
  );
  await travel(adult, "person:1");
  await adult.waitForFunction(() => window.lifeDiagnostics.panel === "choice");
  assert.match(
    await adult.locator(".choice").first().innerText(),
    /Plan a shared life/,
  );
  assert.equal((await diagnostic(adult)).render.scale, 1);
  await adult.screenshot({ path: "docs/captures/refinement-adult.png" });
  reports.push({
    check: "home choice works before partner introductions",
    state: await diagnostic(adult),
  });
  await adult.close();

  const mobile = await open(
    { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    fixture(1),
  );
  const pad = mobile.locator('[data-pad="1,0"]');
  const rect = await pad.boundingBox();
  assert.ok(rect.width >= 44 && rect.height >= 44);
  await mobile.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await mobile.mouse.down();
  await mobile.waitForTimeout(120);
  await mobile.locator("#ui").dispatchEvent("pointerup", { pointerId: 900 });
  const before = (await diagnostic(mobile)).render.position;
  await mobile.waitForTimeout(150);
  const after = (await diagnostic(mobile)).render.position;
  assert.ok(
    Math.hypot(after.x - before.x, after.z - before.z) > 0.1,
    "An unrelated pointer release must not stop movement",
  );
  await mobile.mouse.up();
  await travel(mobile, "person:1");
  await mobile.waitForFunction(() => window.lifeDiagnostics.panel === "choice");
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await mobile.setViewportSize(viewport);
    await mobile.waitForTimeout(150);
    const world = await mobile.locator("#world").boundingBox(),
      dialog = await mobile.locator(".dialogue").boundingBox();
    assert.ok(world.height >= 60);
    assert.ok(
      world.y + world.height <= dialog.y,
      "Dialogue must not overlap the scene",
    );
    assert.equal(await mobile.locator(".context").isVisible(), true);
    assert.equal(
      await mobile.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await mobile.screenshot({
      path: `docs/captures/refinement-${viewport.width}.png`,
    });
  }
  await mobile.locator("[data-action=close]").click();
  assert.equal(
    await mobile.locator(".screen-ui").evaluate((el) => el.inert),
    false,
  );
  reports.push({
    check: "touch ownership and portrait/landscape story layout",
    state: await diagnostic(mobile),
  });
  await mobile.close();

  const corner = fixture(4);
  corner.position = { x: 5.849, z: 4.049 };
  const blocked = await open(
    { viewport: { width: 1000, height: 750 } },
    corner,
  );
  await blocked.keyboard.down("ArrowDown");
  await blocked.waitForTimeout(200);
  assert.equal(
    (await diagnostic(blocked)).render.walking,
    false,
    "Blocked input must not animate walking",
  );
  assert.equal((await diagnostic(blocked)).render.scale, 0.92);
  await blocked.keyboard.up("ArrowDown");
  await blocked.close();
  assert.deepEqual(errors, []);
  const result = {
    base,
    checkedAt: new Date().toISOString(),
    result: "pass",
    errors,
    reports,
  };
  await writeFile(
    "docs/refinement-smoke-result.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
