import { chromium } from "@playwright/test";
import { tsImport } from "tsx/esm/api";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const { newLife, choose, advance, meet, assistActivity, SAVE_KEY } =
  await tsImport("../src/core.ts", import.meta.url);
const base = process.env.GAME_URL || "http://127.0.0.1:4196/";
const browser = await chromium.launch({ headless: true });
const errors = [],
  checks = [];
await mkdir("docs/captures", { recursive: true });
function fixture(chapter, field = 0, completedActivities = false) {
  let s = newLife({ name: "Ari", gender: "female", skin: 2 });
  for (let c = 0; c < chapter; c++) {
    if (completedActivities) s = assistActivity(s);
    if (c === 7) for (let i = 0; i < 3; i++) s = meet(s, i);
    s = choose(s, 0, 1);
    s = choose(s, 1, c === 5 ? field : c === 7 ? 0 : 1);
    s = advance(s);
  }
  return s;
}
async function ready(page) {
  await page.waitForFunction(() => window.lifeDiagnostics?.loading === false);
}
async function closePanel(page) {
  await page.locator('[role="dialog"] [data-action="close"]').last().click();
}
async function open(chapter, mobile = false, completedActivities = false) {
  console.log(`Opening chapter ${chapter + 1}`);
  const page = await browser.newPage({
    viewport: mobile
      ? { width: 390, height: 844 }
      : { width: 1280, height: 800 },
  });
  page.setDefaultTimeout(10000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  await page.addInitScript(
    ({ key, state }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(state));
    },
    { key: SAVE_KEY, state: fixture(chapter, 0, completedActivities) },
  );
  await page.goto(base);
  await ready(page);
  await page.locator('[data-action="continue"]').click();
  await ready(page);
  await page.waitForFunction(() => window.lifeDiagnostics.panel === "briefing");
  await closePanel(page);
  return page;
}
async function travel(page, id, panel) {
  console.log(`Travel: ${id}`);
  await page.locator('[data-action="explore"]').click();
  await page.locator(`[data-place="${id}"]`).click();
  if (panel)
    await page.waitForFunction(
      (value) => window.lifeDiagnostics.panel === value,
      panel,
      { timeout: 20000 },
    );
}
async function decide(page, index, option) {
  await travel(page, `person:${index}`, "choice");
  await page.locator(`[data-action="choose"][data-index="${option}"]`).click();
  await page.waitForFunction(() => window.lifeDiagnostics.panel === "response");
  await closePanel(page);
}
async function next(page, chapter) {
  await travel(page, "exit");
  await page.waitForFunction(
    (c) =>
      window.lifeDiagnostics.chapter === c && !window.lifeDiagnostics.loading,
    chapter,
  );
  await closePanel(page);
}
async function layout(page, label) {
  const values = await page.evaluate(() => {
    const dialog = document.querySelector(".dialogue").getBoundingClientRect();
    const canvas = document.querySelector("#world").getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      overlap: canvas.bottom > dialog.top + 1,
      sceneHeight: canvas.height,
      diagnostics: window.lifeDiagnostics,
    };
  });
  assert.equal(values.overflow, false, label + " horizontal overflow");
  assert.equal(values.overlap, false, label + " dialogue covers scene");
  assert.ok(values.sceneHeight >= 90);
  checks.push({ label, ...values });
}
try {
  const boat = await open(1);
  await travel(boat, "activity:0", "activity");
  await boat.locator('[data-step="sofa"]').click();
  await boat.reload();
  await ready(boat);
  await boat.locator('[data-action="continue"]').click();
  await ready(boat);
  await closePanel(boat);
  assert.equal(
    await boat.evaluate(() => window.lifeDiagnostics.activitySteps),
    1,
  );
  await travel(boat, "activity:0", "activity");
  await boat.locator('[data-step="basket"]').click();
  await layout(boat, "boat search / saved clue");
  await boat.screenshot({ path: "docs/captures/story-boat.png" });
  await boat.locator('[data-step="repair"]').click();
  console.log("Boat repaired");
  assert.equal(await boat.evaluate(() => window.lifeDiagnostics.activities), 1);
  await closePanel(boat);
  await decide(boat, 0, 0);
  await decide(boat, 1, 1);
  await next(boat, 2);
  await boat.close();

  const exam = await open(4, true);
  await travel(exam, "activity:0", "activity");
  await exam.locator('[data-step="work"]').click();
  await exam.locator('[data-action="task-undo"]').click();
  for (const step of ["study", "study", "rest"])
    await exam.locator(`[data-step="${step}"]`).click();
  await layout(exam, "phone exam planner");
  await exam.screenshot({ path: "docs/captures/story-exams-mobile.png" });
  await exam.locator('[data-step="finish"]').click();
  await closePanel(exam);
  await decide(exam, 0, 1);
  await decide(exam, 1, 1);
  await next(exam, 5);
  await travel(exam, "person:0", "choice");
  assert.match(
    await exam.locator('[data-index="0"]').innerText(),
    /costs 4 Money/,
  );
  await layout(exam, "phone scholarship conversation");
  await exam.close();

  const work = await open(6);
  await travel(work, "activity:0", "activity");
  assert.match(
    await work.locator('[role="dialog"]').innerText(),
    /community clinic/,
  );
  for (const step of ["service", "quality", "rest"])
    await work.locator(`[data-step="${step}"]`).click();
  await layout(work, "clinic workday");
  await work.screenshot({ path: "docs/captures/story-career.png" });
  await work.locator('[data-step="finish"]').click();
  await closePanel(work);
  await decide(work, 0, 1);
  await decide(work, 1, 1);
  await work.close();

  const guests = await open(7);
  await travel(guests, "person:0", "choice");
  assert.equal(await guests.locator('[data-index="0"]').isEnabled(), false);
  await closePanel(guests);
  for (let i = 0; i < 3; i++) {
    await travel(guests, `guest:${i}`, "response");
    await closePanel(guests);
  }
  await decide(guests, 1, 0);
  await decide(guests, 0, 0);
  await next(guests, 8);
  await travel(guests, "companion:0", "response");
  assert.match(await guests.locator('[role="dialog"]').innerText(), /Avery/);
  await layout(guests, "partner continuity");
  await guests.close();

  const ending = await open(11, false, true);
  await travel(ending, "activity:0", "activity");
  await ending.locator('[data-action="task-assist"]').click();
  await closePanel(ending);
  await decide(ending, 0, 1);
  await decide(ending, 1, 1);
  await travel(ending, "exit");
  await ending.waitForFunction(() => window.lifeDiagnostics.mode === "ending");
  assert.equal(await ending.locator(".keepsake-card").count(), 13);
  await ending.locator(".ending-chapters summary").click();
  assert.equal(await ending.locator(".life-timeline article").count(), 12);
  await ending.screenshot({ path: "docs/captures/story-ending.png" });
  checks.push({
    label: "twelve-chapter ending",
    diagnostics: await ending.evaluate(() => window.lifeDiagnostics),
  });
  await ending.close();
  assert.deepEqual(errors, []);
  const result = {
    base,
    checkedAt: new Date().toISOString(),
    result: "pass",
    checks,
    errors,
  };
  await writeFile(
    "docs/story-smoke-result.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
