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
} from "./core";
const fresh = () => newLife({ gender: "female", skin: 0, name: "Ari" });
test("all three choice policies finish twelve chapters and preserve a valid save", () => {
  for (let policy = 0; policy < 3; policy++) {
    let s = fresh();
    for (let chapter = 0; chapter < 12; chapter++) {
      assert.equal(s.chapter, chapter);
      assert.equal(advance(s), s);
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
    assert.equal(biography(s).length, 5);
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
