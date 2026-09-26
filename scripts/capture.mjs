// Visual review captures: the title, then every chapter opened from a real saved life.
// GAME_URL (default http://127.0.0.1:4196/) · GPU=1 uses the hardware GPU through ANGLE.
// Writes docs/captures/kitehaven-*.png (git-ignored review artefacts).
import { chromium } from "@playwright/test";
import { tsImport } from "tsx/esm/api";
import { mkdir } from "node:fs/promises";

const core = await tsImport("../src/core.ts", import.meta.url);
const content = await tsImport("../src/content.ts", import.meta.url);
const base = process.env.GAME_URL || "http://127.0.0.1:4196/";
const only = process.env.ONLY ? process.env.ONLY.split(",").map(Number) : null;
const args = process.env.GPU ? ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu-rasterization"] : [];
const browser = await chromium.launch({ headless: true, args });
await mkdir("docs/captures", { recursive: true });
const errors = [];
const identity = { name: "Ari", skin: 2, hair: 3, colour: 1 };

/** Play a sensible life up to the start of `chapter` (sides first, then the main moment). */
function lifeTo(chapter) {
  let l = core.newLife(identity);
  const go = (a) => {
    const n = core.act(l, a);
    if (n === l) throw new Error(`refused ${a}`);
    l = n;
  };
  for (let c = 0; c < chapter; c++) {
    for (const g of core.chapterOf(l).guests ?? []) go(`meet:${g}`);
    const sides = core.momentsOf(l).filter((m) => m.kind === "side");
    for (const m of sides.slice(0, 2)) if (core.canTalk(l, m)) go(core.talkAction(m.id, core.visibleOptions(l, m).find(([o]) => core.optionOpen(l, o))[1]));
    const main = core.mainMoment(l);
    const open = core.visibleOptions(l, main).filter(([o]) => core.optionOpen(l, o));
    go(core.talkAction(main.id, open[c === 7 ? 0 : 0][1]));
    go("next");
  }
  return l;
}

async function page(viewport, save) {
  const p = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  p.on("pageerror", (e) => errors.push(`${e.message}`));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  if (save) await p.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: core.SAVE_KEY, value: save });
  await p.goto(base);
  await p.waitForFunction(() => window.lifeDiagnostics && window.lifeDiagnostics.loading === false, null, { timeout: 60000 });
  return p;
}
const settle = (p, ms = 1800) => p.waitForTimeout(ms);

if (!only) {
  const p = await page({ width: 1440, height: 900 });
  await settle(p, 2500);
  await p.screenshot({ path: "docs/captures/kitehaven-title.png" });
  const gl = await p.evaluate(() => {
    const c = document.createElement("canvas").getContext("webgl2");
    const d = c && c.getExtension("WEBGL_debug_renderer_info");
    return d ? c.getParameter(d.UNMASKED_RENDERER_WEBGL) : "unknown";
  });
  console.log("renderer:", gl);
  await p.close();
}

for (let c = 0; c < content.chapters.length; c++) {
  if (only && !only.includes(c + 1)) continue;
  const l = lifeTo(c);
  const p = await page({ width: 1440, height: 900 }, core.serialise(l));
  await p.locator('[data-action="continue"]').click();
  await p.waitForFunction(() => window.lifeDiagnostics.panel === "briefing" && !window.lifeDiagnostics.loading, null, { timeout: 60000 });
  await settle(p, 900);
  await p.screenshot({ path: `docs/captures/kitehaven-${String(c + 1).padStart(2, "0")}-card.png` });
  await p.locator('[role="dialog"] [data-action="close"]').first().click();
  await settle(p, 3200);
  await p.screenshot({ path: `docs/captures/kitehaven-${String(c + 1).padStart(2, "0")}-scene.png` });
  // Walk to the main moment and open it.
  const diag = await p.evaluate(() => window.lifeDiagnostics);
  console.log(`chapter ${c + 1}`, diag.render.drawCalls, "calls", diag.render.triangles, "tris", diag.render.points.join(" "));
  await p.locator('[data-action="explore"]').click();
  const main = p.locator(".place-row.main").first();
  if (await main.count()) {
    await main.click();
    await p.waitForFunction(() => window.lifeDiagnostics.panel === "moment" || window.lifeDiagnostics.panel === "response", null, { timeout: 20000 }).catch(() => errors.push(`chapter ${c + 1}: never reached the main moment`));
    await settle(p, 1400);
    await p.screenshot({ path: `docs/captures/kitehaven-${String(c + 1).padStart(2, "0")}-talk.png` });
  }
  await p.close();
}
await browser.close();
if (errors.length) {
  console.log("ERRORS:\n" + [...new Set(errors)].join("\n"));
  process.exitCode = 1;
} else console.log("capture: no page errors");
