// Foot-slip probe: do the player's feet stay planted on the floor while they run?
// Opens chapters with a kid, an adult and an elder body, runs with the keyboard, and reads the
// soles every rendered frame through the ?gaitprobe test hook (World.recordGait).
//   GAME_URL (default http://127.0.0.1:4263/) · GPU=1 · BROWSER=webkit
// Slip = how far a planted sole moves along the floor, as a share of how far the body moved.
// 0% is perfectly planted. Medians, because headless frame stalls spoil a mean.
import { chromium, webkit } from "@playwright/test";
import { tsImport } from "tsx/esm/api";

const core = await tsImport("../src/core.ts", import.meta.url);
const base = process.env.GAME_URL || "http://127.0.0.1:4263/";
const engine = process.env.BROWSER === "webkit" ? webkit : chromium;
const args = process.env.GPU && engine === chromium ? ["--use-angle=d3d11", "--ignore-gpu-blocklist"] : [];
const browser = await engine.launch({ headless: true, args });
const FLOOR = 0.004; // a sole this close to y = 0 is on the floor
const LIFT = 0.015; // and it must rise this high before its next touchdown counts as a step
const SETTLE = 0.45; // seconds after a key press: the turn and the speed-up, measured apart

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
const median = (xs) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

function analyse(trace) {
  const slips = [],
    steady = [];
  let frames = 0,
    contact = 0,
    lowest = Infinity,
    onsets = 0,
    dist = 0,
    time = 0;
  // a foot has to leave the floor before its next touchdown counts as a step
  const lifted = [false, false, false, false];
  let steadyDist = 0,
    steadyTime = 0,
    steadyOnsets = 0;
  for (let i = 1; i < trace.length; i++) {
    const a = trace[i - 1],
      b = trace[i];
    const db = Math.hypot(b.x - a.x, b.z - a.z),
      dt = (b.t - a.t) / 1000;
    if (db < 1e-4 || dt <= 0) continue; // standing still
    frames++;
    dist += db;
    time += dt;
    const settled = b.since > SETTLE;
    if (settled) {
      steadyDist += db;
      steadyTime += dt;
    }
    let any = false;
    for (let f = 0; f < b.feet.length; f++) {
      const p = a.feet[f],
        q = b.feet[f];
      lowest = Math.min(lowest, q.y);
      const down = q.y < FLOOR;
      if (down) any = true;
      if (q.y > LIFT) lifted[f] = true;
      if (down && lifted[f]) {
        onsets++;
        if (settled) steadyOnsets++;
        lifted[f] = false;
      }
      if (down && p.y < FLOOR && db > 0.004) {
        const slip = Math.hypot(q.x - p.x, q.z - p.z) / db;
        slips.push(slip);
        if (settled) steady.push(slip);
      }
    }
    if (any) contact++;
  }
  // cadence and step length over steady running only (after the turn and the speed-up)
  const speed = steadyDist / steadyTime;
  const steps = steadyOnsets / steadyTime;
  const p75 = (xs) => (xs.length ? [...xs].sort((x, y) => x - y)[Math.floor(xs.length * 0.75)] : NaN);
  return {
    speed: speed.toFixed(2),
    "steps/s": steps.toFixed(2),
    "step length": (speed / steps).toFixed(2),
    "on floor %": Math.round((100 * contact) / Math.max(1, frames)),
    "slip running %": Math.round(100 * median(steady)),
    "slip p75 %": Math.round(100 * p75(steady)),
    "slip incl. turns %": Math.round(100 * median(slips)),
    "lowest sole": lowest.toFixed(3),
  };
}

/** The townsperson strolls on their own; measure the planted slip while they move. */
function walkerSlip(trace) {
  const slips = [];
  let moved = 0;
  for (let i = 1; i < trace.length; i++) {
    const a = trace[i - 1].walker,
      b = trace[i].walker;
    if (!a || !b) continue;
    const db = Math.hypot(b.x - a.x, b.z - a.z);
    if (db < 0.004) continue;
    moved++;
    for (let f = 0; f < 2; f++) if (a.feet[f].y < FLOOR && b.feet[f].y < FLOOR) slips.push(Math.hypot(b.feet[f].x - a.feet[f].x, b.feet[f].z - a.feet[f].z) / db);
  }
  return moved ? `${Math.round(100 * median(slips))}% (${moved} frames)` : "-";
}

const rows = [];
for (const [label, chapter, pace] of [
  ["baby (hands+knees)", 0, "normal"],
  ["kid", 2, "normal"],
  ["adult", 6, "normal"],
  ["adult gentle", 6, "gentle"],
  ["adult brisk", 6, "brisk"],
  ["elder", 10, "normal"],
].filter(([l]) => !process.env.ONLY || l.startsWith(process.env.ONLY))) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.addInitScript(
    ({ key, save, pace }) => {
      if (sessionStorage.getItem("seeded")) return;
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem(key, save);
      localStorage.setItem("choice-of-life-settings", JSON.stringify({ pace }));
    },
    { key: core.SAVE_KEY, save: core.serialise(lifeTo(chapter)), pace },
  );
  await page.goto(`${base}?gaitprobe`);
  await page.waitForFunction(() => window.lifeDiagnostics && !window.lifeDiagnostics.loading, null, { timeout: 60000 });
  await page.locator('[data-action="continue"]').click();
  await page.waitForFunction(() => window.lifeDiagnostics.panel === "briefing" && !window.lifeDiagnostics.loading, null, { timeout: 60000 });
  await page.locator('.cinema [data-action="close"]').last().click();
  await page.waitForFunction(() => window.lifeDiagnostics.panel === "none");
  await page.waitForTimeout(2200); // the camera's opening sweep
  await page.evaluate(() => window.lifeDiagnostics.render.gait); // discard
  const trace = [];
  for (const key of ["d", "a"]) {
    await page.keyboard.down(key);
    await page.waitForTimeout(1600);
    const part = await page.evaluate(() => window.lifeDiagnostics.render.gait);
    for (const s of part) s.since = (s.t - part[0].t) / 1000;
    trace.push(...part);
    if (process.env.DUMP && label.startsWith(process.env.DUMP)) {
      const low = part.map((s) => s.feet.map((f) => f.y));
      const worst = low.flat().reduce((m, y) => Math.min(m, y), 0);
      const at = low.findIndex((ys) => ys.some((y) => y === worst));
      console.log(label, "lowest", worst.toFixed(3), "at frame", at, "of", part.length, "since", part[at]?.since.toFixed(2), "limbs", low[at]?.map((y) => y.toFixed(3)).join("/"));
    }
    if (false) console.log(label, part.slice(40, 75).map((s, i, all) => `${i ? Math.hypot(s.x - all[i - 1].x, s.z - all[i - 1].z).toFixed(3) : "-"}:${s.feet.map((f) => f.y.toFixed(3)).join("/")}`).join(" "));
    await page.keyboard.up(key);
    await page.waitForTimeout(400);
    await page.evaluate(() => window.lifeDiagnostics.render.gait);
  }
  rows.push({ body: label, ...analyse(trace), "townsfolk slip": walkerSlip(trace) });
  await page.close();
}
await browser.close();
console.table(rows);
