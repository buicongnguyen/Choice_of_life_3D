import { chromium } from "@playwright/test";
import { tsImport } from "tsx/esm/api";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const { newLife, choose, advance, SAVE_KEY } = await tsImport(
  "../src/core.ts",
  import.meta.url,
);
const base = process.env.GAME_URL || "http://127.0.0.1:4196/";
const browser = await chromium.launch({ headless: true });
const errors = [],
  checks = [];
await mkdir("docs/captures", { recursive: true });
async function open(chapter = 0) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    screen: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  page.setDefaultTimeout(20000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  let s = newLife({ name: "Ari", gender: "female", skin: 0 });
  for (let i = 0; i < chapter; i++) s = advance(choose(choose(s, 0, 1), 1, 1));
  s.position = chapter === 0 ? { x: 3.3, z: 1.9 } : { x: 0, z: 2.6 };
  await page.addInitScript(
    ({ s, key }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(s));
      localStorage.setItem(
        "choice-of-life-3d-settings",
        JSON.stringify({ graphics: "low" }),
      );
    },
    { s, key: SAVE_KEY },
  );
  await page.goto(base);
  await page.waitForFunction(() => window.lifeDiagnostics?.loading === false);
  await page.locator('[data-action="continue"]').click();
  await page.waitForFunction(
    () =>
      !window.lifeDiagnostics.loading &&
      window.lifeDiagnostics.panel === "briefing",
  );
  return page;
}
async function close(page) {
  await page.locator('[role="dialog"] [data-action="close"]').last().click();
}
async function travel(page, id, panel) {
  await page.locator('[data-action="explore"]').click();
  await page.locator(`[data-place="${id}"]`).click();
  await page.waitForFunction(
    (panel) => window.lifeDiagnostics.panel === panel,
    panel,
  );
}
async function layout(page, label) {
  await page.waitForTimeout(200);
  const value = await page.evaluate(() => {
    const box = document.querySelector(".dialogue").getBoundingClientRect();
    const scene = document.querySelector("#world").getBoundingClientRect();
    return {
      height: box.height,
      screen: innerHeight,
      scene: scene.height,
      overlap: scene.bottom > box.top + 1,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      visibleChoices: [...document.querySelectorAll(".choice")].every((el) => {
        const r = el.getBoundingClientRect();
        return r.top >= box.top && r.bottom <= box.bottom;
      }),
    };
  });
  assert.equal(value.overflow, false);
  assert.equal(value.overlap, false);
  assert.ok(value.height <= value.screen * 0.46 + 1);
  assert.ok(value.scene > 100);
  await page.screenshot({ path: `docs/captures/interaction-${label}.png` });
  checks.push({ label, ...value });
  return value;
}
try {
  const page = await open();
  await layout(page, "briefing");
  assert.equal(
    await page.evaluate(() => window.lifeDiagnostics.discoveries),
    0,
  );
  await close(page);
  await page.keyboard.down("ArrowUp");
  await page.waitForFunction(() => window.lifeDiagnostics.discoveries === 1);
  const first = await page.evaluate(
    () => window.lifeDiagnostics.render.position,
  );
  await page.waitForTimeout(350);
  const second = await page.evaluate(
    () => window.lifeDiagnostics.render.position,
  );
  await page.keyboard.up("ArrowUp");
  assert.ok(
    Math.hypot(second.x - first.x, second.z - first.z) > 0.2,
    "movement continues after pickup",
  );
  assert.equal(await page.evaluate(() => window.lifeDiagnostics.panel), "none");
  const picked = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    SAVE_KEY,
  );
  assert.deepEqual(picked.discoveries, ["0:2"]);
  assert.equal(picked.scores.money, 46);
  await travel(page, "person:0", "choice");
  assert.equal((await layout(page, "choice-390")).visibleChoices, true);
  await page.setViewportSize({ width: 375, height: 667 });
  assert.equal((await layout(page, "choice-375")).visibleChoices, true);
  await page.locator(".choice-details summary").focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.locator(".choice-details").getAttribute("open"), "");
  await layout(page, "details");
  await page.locator(".choice-details summary").click();
  await page.locator('[data-action="choose"][data-index="0"]').click();
  await layout(page, "response");
  await page.reload();
  await page.waitForFunction(() => !window.lifeDiagnostics?.loading);
  assert.equal(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)).scores.money,
      SAVE_KEY,
    ),
    46,
  );
  await page.close();
  const guests = await open(7);
  await close(guests);
  await travel(guests, "person:0", "choice");
  assert.equal(await guests.locator(".choice:disabled").count(), 3);
  assert.equal(
    await guests.locator(".choice small", { hasText: "Meet first" }).count(),
    3,
  );
  await layout(guests, "guests");
  await guests.setViewportSize({ width: 375, height: 667 });
  assert.equal((await layout(guests, "guests-375")).visibleChoices, true);
  await guests.close();
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      { pickupPreservesMovement: true, rewardSavedOnce: true, checks, errors },
      null,
      2,
    ),
  );
  await writeFile(
    "docs/interaction-smoke-result.json",
    JSON.stringify(
      { pickupPreservesMovement: true, rewardSavedOnce: true, checks, errors },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
