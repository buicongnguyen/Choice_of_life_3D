import { test } from "node:test";
import assert from "node:assert/strict";
import { chapters } from "./content";
import {
  newLife,
  choose,
  discover,
  hazard,
  advance,
  parseLife,
  chapterDone,
  biography,
  perform,
  undoActivity,
  assistActivity,
  meet,
} from "./core";
import {
  activity,
  record,
  conversation,
  scholarship,
  boatEnding,
} from "./journey";
const fresh = () => newLife({ gender: "female", skin: 0, name: "Ari" });
test("all three choice policies finish twelve chapters and preserve a valid save", () => {
  for (let policy = 0; policy < 3; policy++) {
    let s = fresh();
    for (let chapter = 0; chapter < 12; chapter++) {
      assert.equal(s.chapter, chapter);
      assert.equal(advance(s), s);
      if (chapter === 7) for (let i = 0; i < 3; i++) s = meet(s, i);
      for (const i of [1, 0]) {
        for (let choice = 0; choice < 3; choice++) {
          const branch = choose(s, i, choice);
          assert.equal(choose(branch, i, (choice + 1) % 3), branch);
          assert.ok(parseLife(JSON.stringify(branch)));
        }
        s = choose(s, i, policy);
        assert.ok(parseLife(JSON.stringify(s)));
      }
      for (let i = 0; i < 3; i++) s = discover(s, i);
      assert.ok(chapterDone(s));
      s = advance(s);
      assert.deepEqual(s.position, { x: 0, z: 2.6 });
    }
    assert.ok(s.complete);
    assert.equal(Object.keys(s.choices).length, 24);
    assert.equal(s.memories.length, 60);
    assert.ok(parseLife(JSON.stringify(s)));
    assert.ok(biography(s).length >= 5);
  }
});
test("discoveries and hazards resolve once, scores remain finite and bounded", () => {
  let s = fresh();
  s = discover(s, 0);
  assert.equal(discover(s, 0), s);
  s = hazard(s);
  assert.equal(hazard(s), s);
  assert.equal(s.hazards.length, 0, "nursery has no hazard");
  for (let chapter = 0; chapter < 2; chapter++)
    s = advance(choose(choose(s, 0, 0), 1, 0));
  const before = s.scores.health;
  s = hazard(s);
  assert.equal(s.scores.health, before - 3);
  assert.equal(hazard(s), s);
  assert.ok(parseLife(JSON.stringify(s)));
  for (const score of Object.values(s.scores))
    assert.ok(Number.isFinite(score) && score >= 0 && score <= 100);
  assert.equal(discover(s, -1), s);
  assert.equal(choose(s, 4, 0), s);
});

test("saves reject duplicate, noncanonical and mismatched activity records", () => {
  const valid = discover(choose(fresh(), 0, 0), 1);
  const edits = [
    (s: typeof valid) => {
      s.choices["00:0"] = s.choices["0:0"];
      delete s.choices["0:0"];
    },
    (s: typeof valid) => {
      s.discoveries = ["00:1"];
    },
    (s: typeof valid) => {
      s.memories[0].id = "invented";
    },
    (s: typeof valid) => {
      s.memories[0].effect.health = Infinity;
    },
    (s: typeof valid) => {
      s.memories[0].effect.health = -1;
    },
    (s: typeof valid) => {
      s.memories[1] = structuredClone(s.memories[0]);
    },
    (s: typeof valid) => {
      s.memories = [];
    },
    (s: typeof valid) => {
      s.hazards = [0, 0];
    },
  ];
  for (const edit of edits) {
    const broken = structuredClone(valid);
    edit(broken);
    assert.equal(parseLife(JSON.stringify(broken)), null);
  }
  // Original 0.1.0 discovery prose remains a supported save format.
  valid.memories[1].text =
    "You made a little time for something that mattered.";
  assert.ok(parseLife(JSON.stringify(valid)));
});
test("invalid or tampered saves are rejected without mutation", () => {
  const s = fresh(),
    raw = JSON.stringify(s);
  assert.ok(parseLife(raw));
  assert.equal(parseLife("{broken"), null);
  for (const patch of [
    { chapter: 12 },
    { version: 2 },
    { scores: { health: null, happiness: 2, money: 2 } },
    { position: { x: 1e8, z: 0 } },
    { complete: true },
    { facts: { education: "university" } },
  ])
    assert.equal(parseLife(JSON.stringify({ ...s, ...patch })), null);
  assert.equal(JSON.stringify(s), raw);
});
test("every encounter has distinct options and every chapter has three discoveries", () => {
  assert.equal(chapters.length, 12);
  for (const c of chapters) {
    assert.equal(c.encounters.length, 2);
    assert.equal(c.discoveries.length, 3);
    for (const e of c.encounters) {
      assert.equal(e.options.length, 3);
      assert.equal(new Set(e.options.map((o) => o.label)).size, 3);
      assert.ok(e.options.every((o) => o.memory.length > 20));
    }
  }
});

test("all twelve activities save incremental progress, award once and allow a full life", () => {
  let s = fresh();
  for (let chapter = 0; chapter < 12; chapter++) {
    assert.equal(activity(s).title.length > 5, true);
    s = assistActivity(s);
    assert.ok(record(s).complete);
    assert.equal(assistActivity(s), s);
    assert.equal(perform(s, "finish"), s);
    assert.ok(
      parseLife(JSON.stringify(s)),
      `chapter ${chapter + 1} activity save`,
    );
    if (chapter === 7) for (let i = 0; i < 3; i++) s = meet(s, i);
    s = advance(choose(choose(s, 1, 1), 0, 1));
  }
  assert.ok(s.complete);
  assert.equal(
    s.memories.filter((m) => m.id.startsWith("activity:")).length,
    12,
  );
  assert.ok(parseLife(JSON.stringify(s)));
});
test("search remembers distinct solutions; planner undo and supported tuition work", () => {
  let s = advance(choose(choose(fresh(), 0, 0), 1, 0));
  assert.equal(perform(s, "repair"), s, "cannot repair an undiscovered boat");
  s = perform(s, "sofa");
  assert.equal(perform(s, "sofa"), s);
  assert.ok(parseLife(JSON.stringify(s)), "partial search saves");
  for (const solution of ["repair", "dad", "lend"]) {
    const branch = perform(perform(s, "basket"), solution);
    assert.ok(record(branch).complete);
    assert.ok(boatEnding(branch).length > 30);
    assert.ok(parseLife(JSON.stringify(branch)));
  }
  for (let c = 1; c < 4; c++) s = advance(choose(choose(s, 0, 1), 1, 1));
  const baseline = { ...s.scores };
  s = perform(perform(s, "work"), "study");
  s = undoActivity(s);
  assert.deepEqual(record(s).actions, ["work"]);
  s = perform(perform(s, "study"), "study");
  assert.deepEqual(s.scores, baseline, "planning is a preview until confirmed");
  s = perform(s, "finish");
  assert.ok(scholarship(s));
  s = advance(choose(choose(s, 0, 1), 1, 1));
  assert.equal(conversation(s, 0).options[0].effect.money, -4);
  s = choose(s, 0, 0);
  assert.ok(parseLife(JSON.stringify(s)));
});
test("old saves migrate additively and malformed activity histories are rejected", () => {
  const s = choose(fresh(), 0, 0);
  const old = JSON.parse(JSON.stringify(s));
  delete old.activities;
  delete old.meetings;
  const restored = parseLife(JSON.stringify(old))!;
  assert.deepEqual(restored.scores, s.scores);
  assert.deepEqual(restored.activities, {});
  for (const activities of [
    null,
    [],
    { "0": { actions: ["share"], complete: true } },
    { "12": { actions: [], complete: false } },
    { "0": { actions: ["listen"], complete: true } },
  ])
    assert.equal(parseLife(JSON.stringify({ ...s, activities })), null);
});
test("partner introductions are required only for the relevant commitment and persist", () => {
  let s = fresh();
  for (let c = 0; c < 7; c++) s = advance(choose(choose(s, 0, 0), 1, 0));
  assert.equal(choose(s, 0, 0), s);
  s = choose(s, 1, 0); // Dad may discuss home before introductions.
  s = meet(s, 0);
  assert.equal(meet(s, 0), s);
  assert.equal(choose(s, 0, 1), s);
  s = choose(s, 0, 0);
  assert.ok(chapterDone(s));
  assert.ok(parseLife(JSON.stringify(s)));
  assert.equal(advance(s).facts.partner, "Avery");
});

test("early interests change field opportunities without invalidating save effects", () => {
  let s = fresh();
  for (let c = 0; c < 5; c++) {
    s = choose(s, 0, c === 3 ? 2 : 0);
    s = choose(s, 1, c === 2 ? 2 : 0);
    s = advance(s);
  }
  assert.equal(conversation(s, 1).options[1].effect.money, 5);
  assert.equal(conversation(s, 1).options[2].effect.money, 3);
  for (const i of [0, 1, 2])
    assert.ok(parseLife(JSON.stringify(choose(s, 1, i))));
});
