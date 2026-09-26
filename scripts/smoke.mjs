// End-to-end smoke test through the real UI (no cheat API; saves are built with the real rules).
// GAME_URL (default http://127.0.0.1:4196/) · GPU=1 to use the hardware GPU.
import { chromium } from "@playwright/test";
import { tsImport } from "tsx/esm/api";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const core = await tsImport("../src/core.ts", import.meta.url);
const base = process.env.GAME_URL || "http://127.0.0.1:4196/";
const args = process.env.GPU ? ["--use-angle=d3d11", "--ignore-gpu-blocklist"] : [];
const browser = await chromium.launch({ headless: true, args });
const errors = [];
const checks = [];
await mkdir("docs/captures", { recursive: true });
const identity = { name: "Ari", skin: 2, hair: 3, colour: 1 };
const check = (name) => {
  checks.push(name);
  console.log("✓", name);
};

function lifeTo(chapter, pickMain = () => 0) {
  let l = core.newLife(identity);
  const go = (a) => {
    const n = core.act(l, a);
    if (n === l) throw new Error(`refused ${a}`);
    l = n;
  };
  for (let c = 0; c < chapter; c++) {
    for (const g of core.chapterOf(l).guests ?? []) go(`meet:${g}`);
    for (const m of core.momentsOf(l).filter((m) => m.kind === "side").slice(0, 2))
      if (core.canTalk(l, m)) go(core.talkAction(m.id, core.visibleOptions(l, m).find(([o]) => core.optionOpen(l, o))[1]));
    const main = core.mainMoment(l);
    const open = core.visibleOptions(l, main).filter(([o]) => core.optionOpen(l, o));
    go(core.talkAction(main.id, open[Math.min(pickMain(c), open.length - 1)][1]));
    go("next");
  }
  return l;
}

async function open({ viewport = { width: 1280, height: 800 }, save, mobile = false, settings } = {}) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, hasTouch: mobile, isMobile: mobile });
  page.setDefaultTimeout(30000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("response", (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
  await page.addInitScript(
    ({ key, save, settings }) => {
      if (save && !sessionStorage.getItem("seeded")) {
        localStorage.setItem(key, save);
        sessionStorage.setItem("seeded", "1");
      }
      if (settings) localStorage.setItem("choice-of-life-settings", settings);
    },
    { key: core.SAVE_KEY, save: save ? core.serialise(save) : null, settings: settings ? JSON.stringify(settings) : null },
  );
  await page.goto(base);
  await ready(page);
  return page;
}
const diag = (page) => page.evaluate(() => window.lifeDiagnostics);
const ready = (page) => page.waitForFunction(() => window.lifeDiagnostics && window.lifeDiagnostics.loading === false, null, { timeout: 60000 });
const panel = (page, p) => page.waitForFunction((p) => window.lifeDiagnostics.panel === p, p, { timeout: 30000 });
/** Text arrives in beats; a player can skip straight to the choice or the outcome. */
async function skipBeats(page) {
  const skip = page.locator('[role="dialog"] [data-action="beat-all"]');
  if (await skip.count()) await skip.first().click();
}
async function closePanel(page) {
  await skipBeats(page);
  await page.locator('[role="dialog"] [data-action="close"]').last().click();
  await panel(page, "none");
}
async function travel(page, id) {
  await page.locator('[data-action="explore"]').click();
  await panel(page, "explore");
  await page.locator(`[data-place="${id}"]`).click();
}
async function continueSaved(page) {
  await page.locator('[data-action="continue"]').click();
  await ready(page);
  await panel(page, "briefing");
  await closePanel(page);
}

// ---------------------------------------------------------------------------
// 1. A new life through the real UI, chapter 1
// ---------------------------------------------------------------------------
{
  const page = await open();
  await page.locator('[data-action="hair"][data-value="5"]').click();
  await page.locator('input[name="name"]').fill("Ari");
  await page.locator('[data-action="start"]').click();
  await ready(page);
  await panel(page, "briefing");
  assert.match(await page.locator(".cinema h2").innerText(), /Under the Eaves/);
  await closePanel(page);
  check("title → customise → begin a new life → chapter card");

  await travel(page, "person:nana");
  await panel(page, "moment");
  assert.equal((await diag(page)).moment, "c1.kite");
  await skipBeats(page);
  await page.locator('[data-action="choose"]').first().click();
  await panel(page, "response");
  let d = await diag(page);
  assert.equal(d.facts.kite, "red");
  assert.equal(d.free, 2, "the main story costs no free time");
  await closePanel(page);
  check("walk to Nana June, choose the first kite, the main story is free");

  await travel(page, "activity");
  await panel(page, "activity");
  await page.locator('[data-action="task-start"]').click();
  await panel(page, "none");
  d = await diag(page);
  assert.equal(d.free, 1);
  for (const i of [0, 1, 2]) {
    await travel(page, `hunt:${i}`);
    await page.waitForFunction((i) => window.lifeDiagnostics.activity.found.includes(i) || window.lifeDiagnostics.activity.complete, i, { timeout: 30000 });
    if (i < 2) await page.waitForFunction(() => window.lifeDiagnostics.panel === "none");
  }
  await panel(page, "response");
  assert.equal((await diag(page)).activity.complete, true);
  await page.screenshot({ path: "docs/captures/smoke-keepsake.png" });
  await closePanel(page);
  check("the first-steps hunt: start costs an hour, three items found by walking, keepsake awarded");

  await travel(page, "person:mum");
  await panel(page, "moment");
  await skipBeats(page);
  await page.locator('[data-action="choose"]').nth(1).click();
  await panel(page, "response");
  await closePanel(page);
  assert.equal((await diag(page)).free, 0);
  await travel(page, "person:dad");
  await page.waitForFunction(() => /no free time/.test(document.querySelector("#toast")?.textContent ?? ""), null, { timeout: 30000 });
  assert.equal((await diag(page)).panel, "none");
  check("free time runs out: Dad waves, and the moment stays closed");

  const before = (await diag(page)).found;
  await travel(page, "find:0");
  await page.waitForFunction((n) => window.lifeDiagnostics.found > n, before, { timeout: 30000 });
  check("a discovery is picked up by walking over it");

  await page.reload();
  await ready(page);
  await continueSaved(page);
  d = await diag(page);
  assert.equal(d.chapter, 0);
  assert.equal(d.free, 0);
  assert.equal(d.facts.kite, "red");
  check("reload + Continue restores the same life from its action log");

  await travel(page, "exit");
  await page.waitForFunction(() => window.lifeDiagnostics.chapter === 1 && window.lifeDiagnostics.panel === "briefing" && !window.lifeDiagnostics.loading, null, { timeout: 60000 });
  assert.match(await page.locator(".cinema h2").innerText(), /Gap in the Fence/);
  const pos = (await diag(page)).render.position;
  assert.ok(Math.hypot(pos.x - -1.2, pos.z - 2.8) < 0.3, `chapter 2 starts at its spawn, not by the old gate (${JSON.stringify(pos)})`);
  check("the golden gate leads to chapter 2, starting at the new scene's spawn");
  await page.locator('[data-action="close"]').first().click();
  await page.keyboard.press("j");
  await panel(page, "journal");
  await page.locator('[data-tab="keepsakes"]').click();
  assert.match(await page.locator(".tab-body").innerText(), /First shoes/);
  await page.locator('[data-tab="story"]').click();
  assert.match(await page.locator(".tab-body").innerText(), /Under the Eaves/i);
  check("journal: people, keepsakes and the story so far");
  await page.close();
}

// ---------------------------------------------------------------------------
// 2. The kite game (chapter 4) and the planner (chapter 6)
// ---------------------------------------------------------------------------
{
  const page = await open({ save: lifeTo(3) });
  await continueSaved(page);
  await travel(page, "activity");
  await panel(page, "activity");
  await page.locator('[data-action="task-start"]').click();
  await page.waitForSelector("#kite-canvas");
  const hold = page.locator('[data-action="kite-hold"]');
  const box = await hold.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "docs/captures/smoke-kite.png" });
  await page.locator('[data-action="kite-skip"]').click();
  await panel(page, "response");
  assert.equal((await diag(page)).activity.grade, "steady");
  check("the kite game opens, responds to holding the line, and can be skipped with a fair result");
  await page.close();
}
{
  const page = await open({ save: lifeTo(5) });
  await continueSaved(page);
  await travel(page, "activity");
  await panel(page, "activity");
  await page.locator('[data-action="task-start"]').click();
  await page.locator('[data-action="task-plan"][data-step="work"]').click();
  await closePanel(page);
  await travel(page, "activity");
  await panel(page, "activity");
  assert.deepEqual((await diag(page)).activity.plan, ["work"], "a half-made plan can be reopened");
  for (const b of ["friends", "rest"]) await page.locator(`[data-action="task-plan"][data-step="${b}"]`).click();
  await page.locator('[data-action="task-undo"]').click();
  await page.locator('[data-action="task-plan"][data-step="family"]').click();
  await page.locator('[data-action="task-commit"]').click();
  await panel(page, "response");
  assert.deepEqual((await diag(page)).activity.plan, ["work", "friends", "family"]);
  check("the planner: close and reopen mid-plan, three blocks, undo, commit");
  await page.close();
}

// ---------------------------------------------------------------------------
// 3. The last festival and the ending
// ---------------------------------------------------------------------------
{
  const page = await open({ save: lifeTo(11) });
  await continueSaved(page);
  await travel(page, "self");
  await panel(page, "moment");
  assert.equal((await diag(page)).moment, "c12.last");
  await skipBeats(page);
  await page.locator('[data-action="choose"]').last().click();
  await panel(page, "response");
  await closePanel(page);
  await travel(page, "exit");
  await page.waitForFunction(() => window.lifeDiagnostics.mode === "ending", null, { timeout: 30000 });
  const text = await page.locator(".ending").innerText();
  assert.match(text, /A whole life in Kitehaven/i);
  assert.match(text, /At the last festival/i);
  await page.screenshot({ path: "docs/captures/smoke-ending.png", fullPage: false });
  check("the last kite, the golden gate and a full ending");
  await page.reload();
  await ready(page);
  assert.match(await page.locator('[data-action="continue"]').innerText(), /Read your story/);
  await page.locator('[data-action="continue"]').click();
  await page.waitForFunction(() => window.lifeDiagnostics.mode === "ending" && window.lifeDiagnostics.panel === "none" && !window.lifeDiagnostics.loading, null, { timeout: 60000 });
  check("a finished life reopens on its ending, not on the last chapter card");
  await page.close();
}

// ---------------------------------------------------------------------------
// 4. Phone: touch layout, light graphics
// ---------------------------------------------------------------------------
{
  const page = await open({ viewport: { width: 390, height: 844 }, mobile: true, save: lifeTo(4) });
  const d0 = await diag(page);
  assert.equal(d0.render.quality, "low", "phones start on light graphics");
  assert.equal(d0.render.bloom, false);
  await continueSaved(page);
  assert.ok(await page.locator(".dpad").isVisible());
  await travel(page, "person:rowan");
  await panel(page, "moment");
  assert.equal(await page.locator('[data-action="choose"]').count(), 0, "the storm arrives in beats; choices wait for the last one");
  for (let i = 0; i < 6 && !(await page.locator('[data-action="choose"]').count()); i++) {
    await page.locator(".beat").first().tap();
    await page.waitForTimeout(250);
  }
  assert.ok(await page.locator('[data-action="choose"]').count(), "tapping the line moves through the beats to the choice");
  await page.waitForTimeout(700); // let the dialog and its choices finish rising into place
  const box = await page.locator(".dialog").boundingBox();
  await page.screenshot({ path: "docs/captures/smoke-phone-dialog.png" });
  console.log("phone dialog box", JSON.stringify(box), await page.evaluate(() => [innerWidth, innerHeight]));
  assert.ok(box.y >= 0 && box.y + box.height <= 844 && box.x >= 0 && box.x + box.width <= 390, "dialog fits the phone");
  await page.screenshot({ path: "docs/captures/smoke-phone-dialog.png" });
  check("phone: light graphics, touch pad, tap-through beats, the dialog fits a 390×844 screen");
  await page.close();
}

await browser.close();
await writeFile("docs/smoke-result.json", JSON.stringify({ at: new Date().toISOString(), base, checks, errors: [...new Set(errors)] }, null, 2));
if (errors.length) {
  console.log("PAGE ERRORS:\n" + [...new Set(errors)].join("\n"));
  process.exit(1);
}
console.log(`smoke: ${checks.length} checks passed, no page errors`);
