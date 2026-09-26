// Word counts of every piece of story text a player sees at once (evaluated on real lives).
import { chapters, text } from "../src/content";
import { act, chapterOf, mainMoment, momentsOf, newLife, optionOpen, talkAction, visibleOptions, type Life } from "../src/core";
const words = (s = "") => (s.trim() ? s.trim().split(/\s+/).length : 0);
const rows: { where: string; kind: string; words: number }[] = [];
let l: Life = newLife({ name: "A", skin: 0, hair: 0, colour: 0 });
for (let c = 0; c < chapters.length; c++) {
  for (const g of chapterOf(l).guests ?? []) l = act(l, `meet:${g}`);
  rows.push({ where: `ch${c + 1}`, kind: "intro", words: words(text(chapterOf(l).intro, l)) });
  for (const m of momentsOf(l)) {
    const prompt = words(text(m.prompt, l)) + words(m.context?.(l));
    const opts = visibleOptions(l, m).reduce((t, [o]) => t + words(text(o.label, l)) + words(text(o.hint, l)), 0);
    rows.push({ where: m.id, kind: "dialog (prompt+context)", words: prompt });
    rows.push({ where: m.id, kind: "dialog total incl. options", words: prompt + opts });
    for (const [o] of visibleOptions(l, m)) rows.push({ where: `${m.id}:${text(o.label, l)}`, kind: "reply", words: words(text(o.reply, l)) });
  }
  const main = mainMoment(l);
  l = act(l, talkAction(main.id, visibleOptions(l, main).filter(([o]) => optionOpen(l, o))[0][1]));
  l = act(l, "next");
}
for (const kind of ["intro", "dialog (prompt+context)", "dialog total incl. options", "reply"]) {
  const r = rows.filter((x) => x.kind === kind).sort((a, b) => b.words - a.words);
  const avg = r.reduce((t, x) => t + x.words, 0) / r.length;
  console.log(`${kind}: n=${r.length} avg=${avg.toFixed(0)} max=${r[0].words} (${r[0].where}) >50 words: ${r.filter((x) => x.words > 50).length}`);
  console.log("   longest:", r.slice(0, 5).map((x) => `${x.where}=${x.words}`).join(", "));
}
