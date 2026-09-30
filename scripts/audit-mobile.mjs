// Mobile-first UI audit: every screen (title, customise, chapter card, HUD, dialog, journal
// tabs incl. the kite workshop, pause/settings, go-to, ending, album) at phone, tablet and PC
// sizes, with measurements a phone player feels: tap targets under 44 px, text under 12 px,
// sideways scrolling, and controls pushed off-screen.
// GAME_URL (default http://127.0.0.1:4197/) · OUT (default docs/captures/mobile) · SIZES · LANGS · GPU=1
import { chromium } from "@playwright/test";
import { tsImport } from "tsx/esm/api";
import { mkdir, writeFile } from "node:fs/promises";

const core = await tsImport("../src/core.ts", import.meta.url);
const base = process.env.GAME_URL || "http://127.0.0.1:4197/";
const out = process.env.OUT || "docs/captures/mobile";
await mkdir(out, { recursive: true });
const args = process.env.GPU ? ["--use-angle=d3d11", "--ignore-gpu-blocklist"] : [];
const browser = await chromium.launch({ headless: true, args });
const sizes = (process.env.SIZES || "390x844m,360x740m,844x390m,820x1180m,1366x768").split(",").map((s) => {
  const mobile = s.endsWith("m");
  const [w, h] = s.replace("m", "").split("x").map(Number);
  return { w, h, mobile };
});
const langs = (process.env.LANGS || "en").split(",");
const identity = { name: "Ari", skin: 2, hair: 3, colour: 1 };

function lifeTo(chapter, finish = false) {
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
    const m = core.mainMoment(l);
    go(core.talkAction(m.id, core.visibleOptions(l, m).filter(([o]) => core.optionOpen(l, o))[0][1]));
    if (finish && c === core.chapterOf(l) && false) break;
    go("next");
  }
  return l;
}
function finished() {
  let l = lifeTo(11);
  const go = (a) => {
    const n = core.act(l, a);
    if (n === l) throw new Error(`refused ${a}`);
    l = n;
  };
  for (const m of core.momentsOf(l)) if (core.canTalk(l, m)) go(core.talkAction(m.id, core.visibleOptions(l, m).filter(([o]) => core.optionOpen(l, o))[0][1]));
  go("next");
  return l;
}

const rows = [];
async function measure(page, name, tag) {
  await page.waitForTimeout(650);
  const m = await page.evaluate(() => {
    const vw = innerWidth,
      vh = innerHeight;
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && !el.closest("[inert]") && Number(s.opacity) > 0.05;
    };
    const small = [];
    for (const el of document.querySelectorAll("#ui button, #ui select, #ui summary, #ui input, #ui [data-action]")) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.height < 44 || r.width < 44) small.push(`${(el.dataset.action || el.name || el.tagName).toLowerCase()} ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    const tiny = new Set();
    for (const el of document.querySelectorAll("#ui *")) {
      if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      if (!visible(el)) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 12) tiny.add(`${el.className || el.tagName} ${fs}px`);
    }
    const offscreen = [];
    for (const el of document.querySelectorAll("#ui button, #ui select")) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      const inScroller = el.closest(".tab-body,.ending,.places,.modal,.title-card,.dialog-body,.options,.sheet-body");
      if (!inScroller && (r.right > vw + 1 || r.left < -1 || r.bottom > vh + 1 || r.top < -1)) offscreen.push(`${el.dataset.action || el.name} @${Math.round(r.left)},${Math.round(r.top)}`);
    }
    const panel = document.querySelector(".dialog,.modal,.cinema,.title-card,.ending");
    const pr = panel?.getBoundingClientRect();
    return {
      overflowX: document.documentElement.scrollWidth > vw + 1 || document.body.scrollWidth > vw + 1,
      small: small.slice(0, 40),
      smallCount: small.length,
      tiny: [...tiny].slice(0, 12),
      offscreen,
      panel: pr ? `${Math.round(pr.width)}×${Math.round(pr.height)} @${Math.round(pr.top)}` : "",
    };
  });
  rows.push({ tag, name, ...m });
  await page.screenshot({ path: `${out}/${tag}-${name}.png` });
}

async function open({ w, h, mobile }, lang, save) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => rows.push({ tag: "error", name: e.message }));
  await page.addInitScript(
    ({ key, save, settings }) => {
      if (sessionStorage.getItem("seeded")) return;
      sessionStorage.setItem("seeded", "1");
      if (save) localStorage.setItem(key, save);
      localStorage.setItem("choice-of-life-settings", settings);
    },
    { key: core.SAVE_KEY, save: save ? core.serialise(save) : null, settings: JSON.stringify({ lang }) },
  );
  await page.goto(base);
  await page.waitForFunction(() => window.lifeDiagnostics && !window.lifeDiagnostics.loading, null, { timeout: 60000 });
  return page;
}
const panel = (page, p) => page.waitForFunction((p) => window.lifeDiagnostics.panel === p, p, { timeout: 30000 });
async function tap(page, sel) {
  const el = page.locator(sel).first();
  await el.scrollIntoViewIfNeeded();
  await el.click();
}

for (const lang of langs) {
  for (const size of sizes) {
    const tag = `${lang}-${size.w}x${size.h}`;
    // title (fresh) and customise
    let page = await open(size, lang, null);
    await measure(page, "01-title", tag);
    await tap(page, '[data-action="customise"]');
    await panel(page, "customise");
    await page.waitForTimeout(900);
    await measure(page, "02-customise", tag);
    await tap(page, '.sheet header [data-action="close"]');
    await panel(page, "none");
    await tap(page, '[data-action="settings"]');
    await panel(page, "settings");
    await measure(page, "02b-settings-title", tag);
    await page.close();
    // a life in chapter 7: title with save, chapter card, HUD, dialog, journal, pause, go-to
    page = await open(size, lang, lifeTo(6));
    await measure(page, "03-title-saved", tag);
    await tap(page, '[data-action="continue"]');
    await page.waitForFunction(() => !window.lifeDiagnostics.loading && window.lifeDiagnostics.panel === "briefing", null, { timeout: 60000 });
    await measure(page, "04-chapter-card", tag);
    const skip = page.locator('.cinema [data-action="close"]');
    await skip.last().click();
    await panel(page, "none");
    await page.waitForTimeout(1500);
    await measure(page, "05-hud", tag);
    await tap(page, '[data-action="explore"]');
    await panel(page, "explore");
    await measure(page, "06-goto", tag);
    await tap(page, '[data-place="person:sam"]');
    await panel(page, "moment");
    await page.waitForTimeout(1500);
    await measure(page, "07-dialog", tag);
    const all = page.locator('[data-action="beat-all"]');
    if (await all.count()) await all.click();
    await measure(page, "08-choices", tag);
    await page.locator('[role="dialog"] [data-action="close"]').first().click();
    await panel(page, "none");
    await tap(page, '[data-action="journal"]');
    await panel(page, "journal");
    await measure(page, "09-journal-people", tag);
    await tap(page, '[data-tab="kite"]');
    await measure(page, "10-kite-workshop", tag);
    const locked = page.locator('.pattern.locked');
    if (await locked.count()) {
      await locked.first().click();
      await measure(page, "10b-kite-locked-hint", tag);
    }
    await tap(page, '[data-tab="paths"]');
    await measure(page, "11-paths", tag);
    await page.locator('[role="dialog"] [data-action="close"]').first().click();
    await panel(page, "none");
    await tap(page, '[data-action="pause"]');
    await panel(page, "pause");
    await measure(page, "12-pause", tag);
    await tap(page, '.tiles [data-action="settings"]');
    await panel(page, "settings");
    await measure(page, "12b-settings", tag);
    await page.close();
    // the ending and the album
    page = await open(size, lang, finished());
    await tap(page, '[data-action="continue"]');
    await page.waitForFunction(() => !window.lifeDiagnostics.loading && window.lifeDiagnostics.mode === "ending", null, { timeout: 60000 });
    await measure(page, "13-ending", tag);
    await page.evaluate(() => document.querySelector(".ending")?.scrollTo(0, 1e5));
    await measure(page, "14-ending-bottom", tag);
    const album = page.locator('[data-action="album"]');
    if (await album.count()) {
      await tap(page, '[data-action="album"]');
      await panel(page, "album");
      await measure(page, "15-album", tag);
    }
    await page.close();
    console.log("audited", tag);
  }
}
await browser.close();
await writeFile(`${out}/audit.json`, JSON.stringify(rows, null, 2));
const summary = rows.map((r) => ({ tag: r.tag, name: r.name, overflowX: r.overflowX, small: r.smallCount, tiny: r.tiny?.length, off: r.offscreen?.length, panel: r.panel }));
console.table(summary);
