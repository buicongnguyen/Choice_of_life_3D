import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chapters, people, text } from "./content";
import { newLife, act, talkAction, momentsOf, visibleOptions, chapterOf, type Life } from "./core";
import type { SceneLayout } from "./navigation";

const layouts: Record<string, SceneLayout> = JSON.parse(readFileSync(new URL("../public/models/layout.json", import.meta.url), "utf8"));
const manifest = JSON.parse(readFileSync(new URL("../public/models/manifest.json", import.meta.url), "utf8"));
const PROPS = ["kite", "toyboat", "lunchbox", "medal", "key", "tin", "shell", "apple", "book", "letter", "flower", "teddy", "blocks", "lantern", "spool", "seedling", "cupcake", "ticket", "glasses", "photo", "sandbag", "gate", "cat", "star", "heart", "coin", "compass", "scarf", "pills", "keys", "drawing", "camera"];

test("twelve chapters, each with exactly one main moment, a scene, an activity and three discoveries", () => {
  assert.equal(chapters.length, 12);
  const ids = new Set<string>();
  for (const [i, c] of chapters.entries()) {
    assert.equal(c.moments.filter((m) => m.kind === "main").length, 1, `chapter ${i + 1}`);
    assert.ok(layouts[c.scene], `scene ${c.scene} exists`);
    assert.ok(manifest.full[c.scene], `${c.scene}.glb was built`);
    assert.equal(c.finds.length, 3);
    for (const m of c.moments) {
      assert.ok(!ids.has(m.id), `duplicate moment ${m.id}`);
      ids.add(m.id);
      assert.ok(m.options.length >= 1 && m.options.length <= 5);
    }
  }
});

test("everyone who speaks stands somewhere the Blender layout provides", () => {
  for (const c of chapters) {
    const anchors = layouts[c.scene].anchors;
    for (const [who, slot] of c.cast) {
      assert.ok(people[who], `${who} is a person`);
      assert.ok(anchors[`npc${slot}`], `${c.scene} needs npc${slot} for ${who}`);
    }
    for (const m of c.moments) {
      if (m.who === "you" || m.who === "partner") continue;
      assert.ok(c.cast.some(([w]) => w === m.who), `${m.id}: ${m.who} is in the scene`);
    }
    for (const g of c.guests ?? []) assert.ok(c.cast.some(([w]) => w === g));
  }
});

test("activities and discoveries only use props that exist, and hunts fit the hunt anchors", () => {
  for (const c of chapters) {
    const a = c.activity;
    if (a.kind === "hunt") {
      assert.ok(a.items && a.items.length >= 1 && a.items.length <= 4);
      for (const it of a.items) assert.ok(PROPS.includes(it.prop), `prop ${it.prop}`);
    }
    if (a.kind === "plan") assert.ok(a.blocks && a.blocks.length >= 3);
    assert.ok(PROPS.includes(a.icon) || ["heart", "star"].includes(a.icon), `icon ${a.icon}`);
    for (const d of c.finds) assert.ok(PROPS.includes(d.prop), `find prop ${d.prop}`);
  }
});

test("all text renders for real lives without placeholders or undefined", () => {
  // Walk a few different lives and render every visible string on the way.
  for (const pick of [0, 1, 2]) {
    let l: Life = newLife({ name: "Sam", skin: 0, hair: 0, colour: 0 });
    for (let c = 0; c < chapters.length; c++) {
      for (const g of chapterOf(l).guests ?? []) l = act(l, `meet:${g}`);
      const strings = [text(chapterOf(l).intro, l), text(chapterOf(l).objective, l), text(chapterOf(l).activity.title, l), text(chapterOf(l).activity.intro, l)];
      for (const m of momentsOf(l)) {
        strings.push(text(m.prompt, l), text(m.title, l), m.context?.(l) ?? "");
        for (const [o] of visibleOptions(l, m)) strings.push(text(o.label, l), text(o.hint, l), text(o.reply, l), text(o.memory, l));
      }
      for (const s of strings) {
        assert.equal(typeof s, "string");
        assert.doesNotMatch(s, /undefined|NaN|\[object|\$\{/, s);
      }
      const main = chapterOf(l).moments.find((m) => m.kind === "main")!;
      const open = visibleOptions(l, main).filter(([o]) => !o.need || o.need.test(l));
      l = act(l, talkAction(main.id, open[Math.min(pick, open.length - 1)][1]));
      l = act(l, "next");
    }
    assert.ok(l.complete);
  }
});
