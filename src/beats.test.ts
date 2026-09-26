import { test } from "node:test";
import assert from "node:assert/strict";
import { beats, sentences, BEAT_WORDS, wordCount } from "./beats";
import { chapters, text } from "./content";
import { newLife, act, chapterOf, momentsOf, visibleOptions, mainMoment, optionOpen, talkAction, type Life } from "./core";

test("speech is never cut in half and nothing is lost", () => {
  const t = "Sam drops a folder. “Voss wants the pier. Yachts, jobs,” Sam says. “Think about it.” He leaves.";
  assert.deepEqual(sentences(t), ["Sam drops a folder.", "“Voss wants the pier. Yachts, jobs,” Sam says.", "“Think about it.”", "He leaves."]);
  const b = beats(t, 8);
  assert.equal(b.join(" "), t);
  for (const x of b) assert.equal((x.match(/“/g) ?? []).length, (x.match(/”/g) ?? []).length, x);
});

test("every line of the story fits in short beats, with speech kept whole", () => {
  let l: Life = newLife({ name: "A", skin: 0, hair: 0, colour: 0 });
  let longest = 0;
  for (let c = 0; c < chapters.length; c++) {
    for (const g of chapterOf(l).guests ?? []) l = act(l, `meet:${g}`);
    const all = [text(chapterOf(l).intro, l)];
    for (const m of momentsOf(l)) {
      all.push(text(m.prompt, l));
      for (const [o] of visibleOptions(l, m)) all.push(text(o.reply, l));
    }
    for (const t of all) {
      const b = beats(t);
      assert.equal(b.join(" ").replace(/\s+/g, " "), t.replace(/\s+/g, " "), "beats keep every word");
      for (const x of b) {
        assert.equal((x.match(/“/g) ?? []).length, (x.match(/”/g) ?? []).length, `quote split: ${x}`);
        // A beat only runs long when one sentence is long on its own.
        if (wordCount(x) > BEAT_WORDS + 8) assert.equal(sentences(x).length, 1, x);
        longest = Math.max(longest, wordCount(x));
      }
    }
    const main = mainMoment(l);
    l = act(l, talkAction(main.id, visibleOptions(l, main).filter(([o]) => optionOpen(l, o))[0][1]));
    l = act(l, "next");
  }
  assert.ok(longest <= 60, `longest beat ${longest} words`);
});
