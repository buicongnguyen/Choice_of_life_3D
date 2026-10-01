// UI size audit: screenshots of the heaviest messages at common PC sizes, plus panel/viewport ratios.
import { chromium } from "@playwright/test";
import { tsImport } from "tsx/esm/api";
import { mkdir } from "node:fs/promises";
const core = await tsImport("../src/core.ts", import.meta.url);
const base = process.env.GAME_URL || "http://127.0.0.1:4263/";
const out = process.env.OUT || "docs/captures/audit";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--use-angle=d3d11"] });
function lifeTo(chapter) {
  let l = core.newLife({ name: "Ari", skin: 2, hair: 3, colour: 1 });
  for (let c = 0; c < chapter; c++) {
    for (const g of core.chapterOf(l).guests ?? []) l = core.act(l, `meet:${g}`);
    const m = core.mainMoment(l);
    l = core.act(l, core.talkAction(m.id, core.visibleOptions(l, m).filter(([o]) => core.optionOpen(l, o))[0][1]));
    l = core.act(l, "next");
  }
  return l;
}
const sizes = (process.env.SIZES || "1366x768,1920x1080").split(",").map((s) => s.split("x").map(Number));
const rows = [];
for (const [w, h] of sizes) {
  const shot = async (page, name) => {
    await page.waitForTimeout(700);
    const box = await page.evaluate(() => {
      const el = document.querySelector(".dialog,.cine-text,.modal") ?? document.querySelector(".toast.show");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), words: el.innerText.split(/\s+/).length };
    });
    rows.push({ size: `${w}x${h}`, name, ...(box ?? {}), pct: box ? Math.round((box.w * box.h * 100) / (w * h)) : 0 });
    await page.screenshot({ path: `${out}/${w}-${name}.png` });
  };
  const open = async (chapter) => {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.addInitScript(({ k, v }) => localStorage.setItem(k, v), { k: core.SAVE_KEY, v: core.serialise(lifeTo(chapter)) });
    await page.goto(base);
    await page.waitForFunction(() => window.lifeDiagnostics && !window.lifeDiagnostics.loading);
    await page.locator('[data-action="continue"]').click();
    await page.waitForFunction(() => window.lifeDiagnostics.panel === "briefing" && !window.lifeDiagnostics.loading, null, { timeout: 60000 });
    return page;
  };
  const talk = async (page, who) => {
    await page.locator('[role="dialog"] [data-action="close"]').first().click();
    await page.waitForFunction(() => window.lifeDiagnostics.panel === "none");
    await page.waitForTimeout(1200);
    await page.locator('[data-action="explore"]').click();
    await page.locator(`[data-place="${who}"]`).click();
    await page.waitForFunction(() => window.lifeDiagnostics.panel === "moment", null, { timeout: 30000 });
  };
  let p = await open(0);
  await shot(p, "card-ch1");
  await p.close();
  p = await open(9);
  await shot(p, "card-ch10");
  await talk(p, "person:tobias");
  await shot(p, "dialog-c10-vote-beat1");
  await p.locator('[data-action="beat-all"]').click();
  await shot(p, "dialog-c10-vote-choices");
  await p.close();
  p = await open(6);
  await talk(p, "person:sam");
  await shot(p, "dialog-c7-voss-beat1");
  await p.locator('[data-action="beat-all"]').click();
  await shot(p, "dialog-c7-voss-choices");
  await p.close();
  p = await open(2);
  await talk(p, "person:maya");
  await p.locator('[data-action="beat-all"]').click();
  await shot(p, "dialog-c3-choices");
  await p.locator('[data-action="choose"]').first().click();
  await p.waitForFunction(() => window.lifeDiagnostics.panel === "response");
  await p.waitForTimeout(900);
  await shot(p, "response-c3-beat1");
  await p.locator('[data-action="beat-all"]').click();
  await shot(p, "response-c3-end");
  await p.locator('[role="dialog"] [data-action="close"]').first().click();
  await p.locator('[data-action="explore"]').click();
  await p.locator('[data-place="find:0"]').click();
  await p.waitForFunction(() => document.querySelector(".toast.show"), null, { timeout: 30000 });
  await shot(p, "toast");
  await p.close();
}
console.table(rows);
await browser.close();
