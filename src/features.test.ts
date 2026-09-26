import { test } from "node:test";
import assert from "node:assert/strict";
import { chapters, type Moment } from "./content";
import { act, canStartActivity, canTalk, chapterOf, endingKey, mainMoment, momentsOf, newLife, optionOpen, parseLife, record, serialise, talkAction, visibleOptions, type Life } from "./core";
import { PATTERNS, TRIMS, isPattern, kiteLook, lookOf, unlocked } from "./kite-art";
import { ENDINGS, emptyAlbum, endingsFound, keepLife, noteChoices, parseAlbum } from "./album";
import { explored, pathRows } from "./paths";
import { MOODS, MOOD_IDS, askingMood, replyMood } from "./moods";
import { score } from "./audio";
import { SEASONS, WALKERS, FIREWORKS } from "./town";
import { EN_UI, type UIKey } from "./i18n";

const id = { name: "Ari", skin: 2, hair: 3, colour: 1 };
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) % 4294967296), seed / 4294967296);
}
/** Play a whole random life (every activity done when `activities` is true). */
function life(seed: number, activities = true, stopBefore = chapters.length): Life {
  const r = rng(seed);
  let l = newLife(id);
  const go = (a: string) => {
    const n = act(l, a);
    assert.notEqual(n, l, a);
    l = n;
  };
  for (let c = 0; c < stopBefore; c++) {
    for (const g of chapterOf(l).guests ?? []) go(`meet:${g}`);
    const talk = (m: Moment) => {
      const open = visibleOptions(l, m).filter(([o]) => optionOpen(l, o)).map(([, i]) => i);
      go(talkAction(m.id, open[Math.floor(r() * open.length)]));
    };
    if (activities && canStartActivity(l)) {
      const a = chapterOf(l).activity;
      go("start");
      if (a.kind === "hunt") a.items!.forEach((_, i) => go(`hunt:${i}`));
      else if (a.kind === "plan") {
        for (let k = 0; k < 3; k++) go(`plan:${a.blocks![0].id}`);
        go("commit");
      } else go("kite:soar");
    }
    for (const m of momentsOf(l).filter((m) => m.kind === "side")) if (canTalk(l, m)) talk(m);
    talk(mainMoment(l));
    if (c === chapters.length - 1) for (const m of momentsOf(l)) if (canTalk(l, m)) talk(m);
    go("next");
  }
  return l;
}

test("kite patterns are earned by what you did, and a design survives saving", () => {
  const fresh = newLife(id);
  assert.deepEqual(
    PATTERNS.filter((p) => unlocked(fresh, p)),
    ["plain"],
  );
  const busy = life(3, true);
  for (const p of ["stripes", "waves", "stars", "sunburst", "checks"] as const) assert.ok(unlocked(busy, p), p);
  const lazy = life(3, false, 6);
  assert.ok(!unlocked(lazy, "stripes") && !unlocked(lazy, "waves"), "no activities, no patterns from them");
  // choose a design, save, load
  const styled = { ...busy, style: { pattern: "stars", trim: 3 } };
  const back = parseLife(serialise(styled))!;
  assert.deepEqual(back.style, { pattern: "stars", trim: 3 });
  assert.equal(kiteLook(back).pattern, "stars");
  assert.equal(kiteLook(back).trim, `#${TRIMS[3]}`);
  // an unearned or unknown pattern shows as plain; a bad trim is dropped
  assert.equal(kiteLook({ ...lazy, style: { pattern: "checks", trim: 0 } }).pattern, "plain");
  const tampered = JSON.parse(serialise(styled));
  tampered.style = { pattern: "<script>", trim: 99 };
  assert.deepEqual(parseLife(JSON.stringify(tampered))!.style, { pattern: "plain", trim: 0 });
  assert.ok(isPattern("hearts") && !isPattern("dragons"));
  assert.equal(lookOf("blue", "nonsense", 42).pattern, "plain");
  // every pattern and hint has words
  for (const p of PATTERNS) {
    assert.ok(EN_UI[`kite.pattern.${p}` as UIKey], p);
    if (p !== "plain") assert.ok(EN_UI[`kite.how.${p}` as UIKey], p);
  }
});

test("the album keeps each finished life once and remembers every choice", () => {
  const a = emptyAlbum();
  const unfinished = life(5, true, 4);
  assert.equal(keepLife(a, unfinished), false, "only finished lives are kept");
  assert.ok(noteChoices(a, unfinished));
  assert.equal(noteChoices(a, unfinished), false, "nothing new the second time");
  const lives = [11, 12, 13, 14, 15, 16].map((s) => life(s, s % 2 === 0));
  for (const l of lives) assert.ok(keepLife(a, l));
  assert.equal(keepLife(a, lives[0]), false, "the same life is kept once");
  assert.equal(a.lives.length, 6);
  assert.ok(endingsFound(a).size >= 1);
  for (const x of a.lives) assert.ok(ENDINGS.includes(x.ending));
  assert.equal(a.lives[0].ending, endingKey(lives[0]));
  // round trip, and hostile input is cleaned
  const back = parseAlbum(JSON.stringify(a));
  assert.deepEqual(back, a);
  const bad = parseAlbum(JSON.stringify({ v: 1, lives: [{ id: "x", ending: "villain", name: "Z" }, { id: "y", ending: "keeper", name: 5 }], choices: { "c1.kite": [0, 99, -1, "a"], "nope.id": [0] } }));
  assert.equal(bad.lives.length, 0);
  assert.deepEqual(bad.choices, { "c1.kite": [0] });
  assert.deepEqual(parseAlbum("{broken"), emptyAlbum());
  assert.deepEqual(parseAlbum(null), emptyAlbum());
});

test("paths show your choice, the ones not taken, and other lives' choices", () => {
  const a = emptyAlbum();
  const other = life(21);
  keepLife(a, other);
  const now = life(22, true, 5);
  const rows = pathRows(now, a);
  assert.equal(rows.length, chapters.length);
  for (const r of rows.slice(0, 5)) {
    assert.ok(r.reached, `chapter ${r.chapter + 1} reached`);
    assert.equal(r.options.filter((o) => o.status === "chosen").length, 1);
    assert.ok(r.title.length > 0);
  }
  for (const r of rows.slice(6)) assert.ok(!r.reached);
  // the other life's choice shows where it differs
  const differs = rows.slice(0, 5).some((r) => r.options.some((o) => o.status === "other"));
  const same = rows.slice(0, 5).every((r) => now.done[r.id] === other.done[r.id]);
  assert.ok(differs || same);
  const ex = explored(a, now);
  assert.ok(ex.n >= 12 && ex.n <= ex.total, `${ex.n}/${ex.total}`);
  assert.equal(ex.total, chapters.reduce((n, c) => n + c.moments.find((m) => m.kind === "main")!.options.length, 0));
});

test("paths preserve historical eligibility after ageing changes health", () => {
  let l = newLife(id);
  for (let c = 0; c < chapters.length; c++) {
    const m = mainMoment(l);
    if (c === 4) assert.equal(optionOpen(l, m.options[0]), true);
    if (c === 10) assert.equal(optionOpen(l, m.options[2]), true);
    const first = visibleOptions(l, m).find(([o]) => optionOpen(l, o))![1];
    l = act(l, talkAction(m.id, c === 4 ? 1 : first));
    l = act(l, "next");
  }
  assert.ok(l.complete && l.stats.health < 30);
  const rows = pathRows(l, emptyAlbum());
  assert.equal(rows[4].options[0].status, "open", "saving the boat was available when offered");
  assert.equal(rows[10].options[2].status, "open", "travelling was available before ageing");
  assert.equal(rows[5].options[2].status, "locked", "an unavailable road stays locked");
  assert.deepEqual(pathRows(parseLife(serialise(l))!, emptyAlbum()), rows);
});

test("moods: every moment id in the mood table exists, replies follow the effect", () => {
  const ids = new Set(chapters.flatMap((c) => c.moments.map((m) => m.id)));
  for (const c of chapters) for (const m of c.moments) assert.ok(MOODS.includes(askingMood(m.id)));
  assert.equal(askingMood("c5.storm"), "worried");
  assert.equal(askingMood("unknown"), "neutral");
  for (const k of MOOD_IDS) assert.ok(ids.has(k), `mood for unknown moment ${k}`);
  assert.equal(replyMood({ rowan: 2 }), "happy");
  assert.equal(replyMood({ rowan: -1 }), "cross");
  assert.equal(replyMood({ family: -1, joy: -5 }), "sad");
  assert.equal(replyMood({ health: -3 }), "worried");
  assert.equal(replyMood({}), "neutral");
});

test("the music box grows: more voices in later chapters, minor in the storm", () => {
  const voices = (s: Parameters<typeof score>[0]) => new Set(score(s).notes.map((n) => n.voice));
  assert.deepEqual([...voices(0)], ["box"]);
  assert.ok(voices(1).has("bass"));
  assert.ok(voices(3).has("arp"));
  assert.ok(voices(11).has("pad") && voices(11).has("bell"));
  assert.ok(voices(10).has("warm"), "old age sings lower");
  const storm = score(4).notes.filter((n) => n.voice === "box").map((n) => n.f);
  const calm = score(1).notes.filter((n) => n.voice === "box").map((n) => n.f);
  assert.notDeepEqual(storm, calm);
  for (const st of [0, 5, 11, "title", "end"] as const) {
    const s = score(st);
    assert.equal(s.beats, 54);
    assert.ok(s.notes.every((n) => n.at >= 0 && n.at < s.beats && n.f > 40 && n.f < 5000 && n.dur > 0));
  }
});

test("the living town has a season for every chapter and valid walkers", () => {
  assert.equal(SEASONS.length, chapters.length);
  for (const s of SEASONS) assert.ok(EN_UI[`season.${s}` as UIKey]);
  for (const scene of Object.keys(WALKERS)) assert.ok(chapters.some((c) => c.scene === scene), scene);
  for (const c of FIREWORKS) assert.ok(c >= 0 && c < chapters.length);
  // the story's own words: "Now it's summer" at the station, the voyage "leaves in spring" after the kitchen
  assert.equal(SEASONS[chapters.findIndex((c) => c.scene === "station")], "summer");
  assert.equal(SEASONS[chapters.findIndex((c) => c.scene === "kitchen")], "winter");
});

test("a finished life still replays after choosing a kite (style is not part of the log)", () => {
  const l = life(31);
  assert.ok(l.complete);
  const styled = { ...l, style: { pattern: "stripes", trim: 2 } };
  const back = parseLife(serialise(styled))!;
  assert.ok(back.complete);
  assert.deepEqual(back.log, l.log);
  assert.ok(record(back, 0).complete);
});
