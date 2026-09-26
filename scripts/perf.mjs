// Frame-time probe: open chapters from real saves and sample requestAnimationFrame for 4 s.
// GAME_URL, GPU=1 (hardware) · QUALITY=low|high.
import { chromium } from "@playwright/test";
import { tsImport } from "tsx/esm/api";
const core = await tsImport("../src/core.ts", import.meta.url);
const base = process.env.GAME_URL || "http://127.0.0.1:4197/";
const args = process.env.GPU ? ["--use-angle=d3d11", "--ignore-gpu-blocklist"] : [];
const browser = await chromium.launch({ headless: true, args });
const quality = process.env.QUALITY || "high";
function lifeTo(chapter) {
  let l = core.newLife({ name: "P", skin: 1, hair: 2, colour: 0 });
  for (let c = 0; c < chapter; c++) {
    for (const g of core.chapterOf(l).guests ?? []) l = core.act(l, `meet:${g}`);
    const main = core.mainMoment(l);
    const open = core.visibleOptions(l, main).filter(([o]) => core.optionOpen(l, o));
    l = core.act(l, core.talkAction(main.id, open[0][1]));
    l = core.act(l, "next");
  }
  return l;
}
const rows = [];
for (const c of [0, 3, 4, 7, 11]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.addInitScript(({ k, v, q }) => { localStorage.setItem(k, v); localStorage.setItem("choice-of-life-settings", JSON.stringify({ graphics: q })); }, { k: core.SAVE_KEY, v: core.serialise(lifeTo(c)), q: quality });
  await page.goto(base);
  await page.waitForFunction(() => window.lifeDiagnostics && !window.lifeDiagnostics.loading, null, { timeout: 60000 });
  await page.locator('[data-action="continue"]').click();
  await page.waitForFunction(() => window.lifeDiagnostics.panel === "briefing" && !window.lifeDiagnostics.loading, null, { timeout: 60000 });
  await page.locator('[role="dialog"] [data-action="close"]').click();
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => new Promise((res) => {
    const t = []; let last = performance.now(); const end = last + 4000;
    const f = (now) => { t.push(now - last); last = now; if (now < end) requestAnimationFrame(f); else { t.sort((a, b) => a - b); res({ avg: t.reduce((a, b) => a + b) / t.length, p95: t[Math.floor(t.length * 0.95)], n: t.length }); } };
    requestAnimationFrame(f);
  }));
  const d = await page.evaluate(() => window.lifeDiagnostics.render);
  rows.push({ chapter: c + 1, quality, avgMs: +r.avg.toFixed(2), p95Ms: +r.p95.toFixed(2), drawCalls: d.drawCalls, triangles: d.triangles });
  await page.close();
}
console.table(rows);
await browser.close();
