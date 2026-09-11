import { test } from "node:test";
import assert from "node:assert/strict";
import { newLife } from "./core";
import { chapters } from "./content";
import { choiceCopy, responseSummary } from "./choice-copy";

test("all 24 decisions have three readable short labels without changing gameplay data", () => {
  const s = newLife({ gender: "female", skin: 0, name: "Ari" });
  const original = JSON.stringify(chapters);
  for (let chapter = 0; chapter < 12; chapter++) {
    for (let index = 0; index < 2; index++) {
      const copy = choiceCopy({ ...s, chapter }, index);
      assert.ok(copy.prompt.length <= 90);
      assert.equal(copy.labels.length, 3);
      assert.equal(new Set(copy.labels).size, 3);
      for (const label of copy.labels) assert.ok(label.length <= 28);
    }
  }
  assert.equal(JSON.stringify(chapters), original);
});

test("short responses keep a complete sentence, including its closing quote", () => {
  assert.equal(responseSummary("“Thank you!” Rowan smiles."), "“Thank you!”");
  assert.equal(
    responseSummary("A memory kept. More of the story."),
    "A memory kept.",
  );
  assert.equal(responseSummary("No punctuation"), "No punctuation");
});
