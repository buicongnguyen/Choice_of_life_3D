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
      if (settings && !sessionStorage.getItem("settings-seeded")) {
        localStorage.setItem("choice-of-life-settings", settings);
        sessionStorage.setItem("settings-seeded", "1");
      }
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
  // settings from the title: switches flip and stick
  await page.locator('.title-dock [data-action="settings"]').click();
  await panel(page, "settings");
  const motion = page.locator('[data-action="toggle"][data-key="reduced"]');
  const motionBefore = await motion.getAttribute("aria-checked");
  await motion.click();
  assert.notEqual(await motion.getAttribute("aria-checked"), motionBefore, "the reduced-motion switch flips");
  assert.equal(await page.evaluate(() => document.body.classList.contains("reduced")), motionBefore === "false");
  await motion.click();
  await page.locator('.sheet [data-action="close"]').click();
  await panel(page, "none");
  // make it yours: a sheet with the avatar framed above it
  await page.locator('.title-dock [data-action="customise"]').click();
  await panel(page, "customise");
  await page.locator('[data-action="hair"][data-value="5"]').click();
  await page.locator('input[name="name"]').fill("Ari");
  await page.locator('.sheet header [data-action="close"]').click();
  await panel(page, "none");
  check("title: settings switches, and the customise sheet");
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
  assert.ok(await page.locator(".stick").isVisible(), "phones get the thumb stick");
  {
    // drag the stick up and the character walks
    const box = await page.locator(".stick").boundingBox();
    const from = (await diag(page)).render.position;
    const cx = box.x + box.width / 2,
      cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy - box.height * 0.45, { steps: 4 });
    await page.waitForTimeout(700);
    await page.mouse.up();
    const to = (await diag(page)).render.position;
    assert.ok(Math.hypot(to.x - from.x, to.z - from.z) > 0.4, `the stick walks the player (${JSON.stringify(from)} → ${JSON.stringify(to)})`);
  }
  // the kite button in the dock opens the workshop; a locked pattern explains itself
  await page.locator('.hud-bottom [data-action="kite-open"]').click();
  await panel(page, "journal");
  assert.equal(await page.locator('[data-tab="kite"]').getAttribute("aria-selected"), "true");
  const locked = page.locator(".pattern.locked");
  if (await locked.count()) {
    await locked.first().click();
    assert.ok(await page.locator(".kite-hint.on").isVisible(), "tapping a locked pattern shows how to earn it");
  }
  await page.locator('[role="dialog"] [data-action="close"]').first().click();
  await panel(page, "none");
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

// ---------------------------------------------------------------------------
// 5. Kitehaven 1.2: the kite workshop, paths, the living town, the album, languages
// ---------------------------------------------------------------------------
function lifeWithActivities(chapter) {
  let l = core.newLife(identity);
  const go = (a) => {
    const n = core.act(l, a);
    if (n === l) throw new Error(`refused ${a}`);
    l = n;
  };
  for (let c = 0; c < chapter; c++) {
    for (const g of core.chapterOf(l).guests ?? []) go(`meet:${g}`);
    const a = core.chapterOf(l).activity;
    if (core.canStartActivity(l)) {
      go("start");
      if (a.kind === "hunt") a.items.forEach((_, i) => go(`hunt:${i}`));
      else if (a.kind === "plan") {
        for (let k = 0; k < 3; k++) go(`plan:${a.blocks[0].id}`);
        go("commit");
      } else go("kite:soar");
    }
    const main = core.mainMoment(l);
    const open = core.visibleOptions(l, main).filter(([o]) => core.optionOpen(l, o));
    go(core.talkAction(main.id, open[0][1]));
    go("next");
  }
  return l;
}
{
  // chapter 3, the schoolyard: autumn, townsfolk, your kite over the playground
  const page = await open({ save: lifeWithActivities(2) });
  await continueSaved(page);
  let d = await diag(page);
  assert.ok(d.render.walkers >= 2, `townsfolk stroll through the schoolyard (${d.render.walkers})`);
  assert.ok(d.render.skyKite?.startsWith("plain:"), `your kite flies over an outdoor chapter (${d.render.skyKite})`);
  assert.ok(await page.locator(".chapter-chip .season.s-autumn").isVisible(), "the HUD shows the season");
  const before = await page.evaluate(() => window.lifeDiagnostics.render.walkers);
  await page.waitForTimeout(2500);
  check("the living town: walkers, the season chip and your kite in the sky");

  await page.locator('[data-action="journal"]').click();
  await panel(page, "journal");
  await page.locator('[data-tab="kite"]').click();
  assert.ok(await page.locator('.pattern:not(.locked)[data-value="stripes"]').count(), "first steps earned stripes");
  assert.ok(await page.locator('.pattern.locked[data-value="checks"]').count(), "the rooftop pattern is still locked");
  await page.locator('[data-action="kite-pattern"][data-value="waves"]').click();
  await page.locator('[data-action="kite-trim"][data-value="1"]').click();
  d = await diag(page);
  assert.deepEqual(d.style, { pattern: "waves", trim: 1 });
  assert.ok(d.render.skyKite.startsWith("waves:"), "the sky kite is repainted");
  await page.screenshot({ path: "docs/captures/smoke-kite-workshop.png" });
  await page.locator('[data-tab="paths"]').click();
  assert.equal(await page.locator(".path-ch.reached").count(), 2, "two big choices so far");
  assert.equal(await page.locator(".path-ch .st-chosen").count(), 2);
  await page.screenshot({ path: "docs/captures/smoke-paths.png" });
  await closePanel(page);
  await page.reload();
  await ready(page);
  assert.deepEqual((await diag(page)).style, { pattern: "waves", trim: 1 }, "the design is saved");
  check("kite workshop: earned patterns, a second colour, saved; paths show the big choices");
  void before;
  await page.close();
}
{
  // the last festival: fireworks, the ending, the album and the picture card
  const l = lifeTo(11);
  const page = await open({ save: l });
  await continueSaved(page);
  assert.ok((await diag(page)).render.fireworks, "fireworks over the last festival");
  await travel(page, "self");
  await panel(page, "moment");
  await skipBeats(page);
  await page.locator('[data-action="choose"]').first().click();
  await panel(page, "response");
  await closePanel(page);
  await travel(page, "exit");
  await page.waitForFunction(() => window.lifeDiagnostics.mode === "ending");
  let d = await diag(page);
  assert.equal(d.album.lives, 1, "the finished life is kept in the album");
  const download = page.waitForEvent("download");
  await page.locator('[data-action="card-save"]').click();
  const file = await download;
  const path = await file.path();
  const { statSync } = await import("node:fs");
  assert.ok(statSync(path).size > 60000, "the picture card is a real image");
  await file.saveAs("docs/captures/smoke-life-card.png");
  await page.locator('[data-action="album"]').click();
  await panel(page, "album");
  assert.equal(await page.locator(".ending-card.got").count(), 1);
  assert.equal(await page.locator(".lives li").count(), 1);
  await page.screenshot({ path: "docs/captures/smoke-album.png" });
  await page.keyboard.press("Escape");
  await panel(page, "none");
  await page.locator('[data-action="title"]').click();
  await page.waitForFunction(() => window.lifeDiagnostics.mode === "title");
  assert.ok(await page.locator('.title-dock [data-action="album"]').isVisible(), "the album is on the title screen");
  check("fireworks, the ending, the picture card and the album of lives");
  await page.close();
}
for (const [code, pattern, chapterTitle] of [
  ["vi", /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i, /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i],
  ["ko", /[가-힣]/, /[가-힣]/],
]) {
  const page = await open({ save: lifeTo(1), settings: { lang: code } });
  assert.equal(await page.evaluate(() => document.documentElement.lang), code);
  assert.match(await page.locator(".title-card").innerText(), pattern, `${code}: the title screen is translated`);
  const font = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  assert.ok(code === "vi" ? /Be Vietnam Pro/.test(font) : /Malgun|Gothic|Noto Sans KR/.test(font), `${code}: font stack ${font}`);
  await page.locator('[data-action="continue"]').click();
  await ready(page);
  await panel(page, "briefing");
  assert.match(await page.locator(".cinema h2").innerText(), chapterTitle, `${code}: the chapter card is translated`);
  await closePanel(page);
  await travel(page, "person:rowan");
  await panel(page, "moment");
  await skipBeats(page);
  const option = await page.locator('[data-action="choose"]').first().innerText();
  assert.match(option, pattern, `${code}: choices are translated`);
  await page.screenshot({ path: `docs/captures/smoke-${code}.png` });
  await page.locator('[data-action="choose"]').first().click();
  await panel(page, "response");
  await closePanel(page);
  await page.locator('[data-action="journal"]').click();
  await panel(page, "journal");
  assert.match(await page.locator(".journal").innerText(), pattern);
  await closePanel(page);
  // switch language from the pause menu: the page reloads in the new language, same life
  const logBefore = (await diag(page)).done;
  await page.keyboard.press("Escape");
  await panel(page, "pause");
  await page.locator('.tiles [data-action="settings"]').click();
  await panel(page, "settings");
  const next = code === "vi" ? "ko" : "en";
  await Promise.all([page.waitForNavigation(), page.locator(`[data-action="set"][data-key="lang"][data-value="${next}"]`).click()]);
  await ready(page);
  assert.equal(await page.evaluate(() => document.documentElement.lang), next);
  await page.locator('[data-action="continue"]').click();
  await ready(page);
  assert.equal((await diag(page)).done, logBefore, "the same life continues in another language");
  check(`${code === "vi" ? "Vietnamese" : "Korean"}: title, chapter card, choices and journal translated; switching language keeps the life`);
  await page.close();
}

await browser.close();
await writeFile("docs/smoke-result.json", JSON.stringify({ at: new Date().toISOString(), base, checks, errors: [...new Set(errors)] }, null, 2));
if (errors.length) {
  console.log("PAGE ERRORS:\n" + [...new Set(errors)].join("\n"));
  process.exit(1);
}
console.log(`smoke: ${checks.length} checks passed, no page errors`);
