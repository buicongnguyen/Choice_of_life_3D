// Screenshots of the 1.2 features for review: faces, the sky kite, townsfolk, seasons,
// fireworks, the workshop and the translated UI. GAME_URL (default http://127.0.0.1:4263/), GPU=1.
import { chromium } from "@playwright/test";
import { tsImport } from "tsx/esm/api";
import { mkdir } from "node:fs/promises";

const core = await tsImport("../src/core.ts", import.meta.url);
const base = process.env.GAME_URL || "http://127.0.0.1:4263/";
const args = process.env.GPU ? ["--use-angle=d3d11", "--ignore-gpu-blocklist"] : [];
const browser = await chromium.launch({ headless: true, args });
await mkdir("docs/captures", { recursive: true });
const identity = { name: "Ari", skin: 2, hair: 3, colour: 1 };

function lifeTo(chapter, style) {
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
  if (style) l.style = style;
  return l;
}

async function open(save, settings) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  await page.addInitScript(
    ({ key, save, settings }) => {
      localStorage.setItem(key, save);
      if (settings) localStorage.setItem("choice-of-life-settings", settings);
    },
    { key: core.SAVE_KEY, save: core.serialise(save), settings: settings ? JSON.stringify(settings) : null },
  );
  await page.goto(base);
  await page.waitForFunction(() => window.lifeDiagnostics && !window.lifeDiagnostics.loading, null, { timeout: 60000 });
  await page.locator('[data-action="continue"]').click();
  await page.waitForFunction(() => !window.lifeDiagnostics.loading && window.lifeDiagnostics.mode !== "title", null, { timeout: 60000 });
  const skip = page.locator('[role="dialog"] [data-action="beat-all"]');
  if (await skip.count()) await skip.first().click();
  const close = page.locator('.cinema [data-action="close"]');
  if (await close.count()) await close.last().click();
  await page.waitForTimeout(2500);
  return page;
}
async function talk(page, id) {
  await page.locator('[data-action="explore"]').click();
  await page.locator(`[data-place="${id}"]`).click();
  await page.waitForFunction(() => window.lifeDiagnostics.panel === "moment", null, { timeout: 30000 });
  await page.waitForTimeout(2200);
}

const shots = [
  // chapter 5: the storm, Rowan worried
  async () => {
    const p = await open(lifeTo(4));
    await talk(p, "person:rowan");
    await p.screenshot({ path: "docs/captures/v12-face-worried.png" });
    await p.locator(".dialog header .portrait img").screenshot({ path: "docs/captures/v12-portrait-worried.png" });
    const skip = p.locator('[data-action="beat-all"]');
    if (await skip.count()) await skip.click();
    await p.locator('[data-action="choose"]').first().click();
    await p.waitForTimeout(1600);
    await p.screenshot({ path: "docs/captures/v12-face-reply.png" });
    await p.locator(".dialog header .portrait img").screenshot({ path: "docs/captures/v12-portrait-reply.png" });
    await p.close();
  },
  // chapter 3: schoolyard in autumn with walkers and a striped kite
  async () => {
    const p = await open(lifeTo(2, { pattern: "stripes", trim: 1 }));
    await p.screenshot({ path: "docs/captures/v12-schoolyard-autumn.png" });
    await p.close();
  },
  // chapter 4: the festival with your stars kite
  async () => {
    const p = await open(lifeTo(3, { pattern: "stars", trim: 0 }));
    await p.screenshot({ path: "docs/captures/v12-festival-kite.png" });
    await p.close();
  },
  // chapter 8: rooftop fireworks
  async () => {
    const p = await open(lifeTo(7, { pattern: "sunburst", trim: 2 }));
    await p.waitForTimeout(3000);
    for (let k = 0; k < 4; k++) {
      await p.screenshot({ path: `docs/captures/v12-rooftop-fireworks${k ? "-" + k : ""}.png` });
      await p.waitForTimeout(450);
    }
    await p.close();
  },
  // chapter 12: last festival fireworks
  async () => {
    const p = await open(lifeTo(11));
    await p.waitForTimeout(3000);
    for (let k = 0; k < 4; k++) {
      await p.screenshot({ path: `docs/captures/v12-last-festival${k ? "-" + k : ""}.png` });
      await p.waitForTimeout(450);
    }
    await p.close();
  },
  // Vietnamese, chapter 2 with Rowan, happy/sad faces
  async () => {
    const p = await open(lifeTo(1), { lang: "vi" });
    await talk(p, "person:rowan");
    await p.screenshot({ path: "docs/captures/v12-vi-dialog.png" });
    await p.locator(".dialog header .portrait img").screenshot({ path: "docs/captures/v12-portrait-sad.png" });
    await p.close();
  },
  async () => {
    const p = await open(lifeTo(6), { lang: "ko" });
    await p.locator('[data-action="journal"]').click();
    await p.locator('[data-tab="kite"]').click();
    await p.waitForTimeout(600);
    await p.screenshot({ path: "docs/captures/v12-ko-workshop.png" });
    await p.locator('[data-tab="paths"]').click();
    await p.waitForTimeout(400);
    await p.screenshot({ path: "docs/captures/v12-ko-paths.png" });
    await p.close();
  },
];
const only = process.argv[2] ? process.argv[2].split(",").map(Number) : null;
for (const [i, s] of shots.entries()) {
  if (only && !only.includes(i)) continue;
  await s();
  console.log("captured", i);
}
await browser.close();
