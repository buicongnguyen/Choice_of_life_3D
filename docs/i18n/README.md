# Translating Kitehaven

The game logic never changes with the language. A translation is a TypeScript overlay that
replaces text only. Everything to translate is listed in `docs/i18n/template.json`, which is
regenerated with `npx tsx scripts/i18n-template.mts`:

- `story`: 830 paths. Each has either `text` (an English string) or `function` (the English
  function source, for lines that depend on earlier choices).
- `ui`: 294 interface strings (from `src/i18n.ts`).
- The **lexicon** (kite colours, careers, vote allies, keepsakes, ending titles and the
  ending epilogue function) is in `src/content.ts` at `export const lexicon = {`.

## Files (xx = `vi` or `ko`)
```
src/lang/xx/index.ts     assembles and default-exports the Overlay
src/lang/xx/ui.ts        export default { "title.kicker": "…", … }   (all 294 keys)
src/lang/xx/lexicon.ts   export default { kite, career, ally, keepsake, archetype, endingLines }
src/lang/xx/story-1.ts   export default { "ch1.title": "…", … }  chapters 1–6 (+ their activities and finds)
src/lang/xx/story-2.ts   chapters 7–12 (+ their activities and finds)
src/lang/xx/people.ts    all "p.*" paths
```
`index.ts`:
```ts
import type { Overlay } from "../../localize";
import ui from "./ui";
import lexicon from "./lexicon";
import story1 from "./story-1";
import story2 from "./story-2";
import people from "./people";
const overlay: Overlay = { code: "xx", ui, lexicon, text: { ...story1, ...story2, ...people } };
export default overlay;
```
Story files have type `Record<string, OverlayText>` (`import type { OverlayText } from "../../localize"`).
Dynamic lines are functions with **exactly the same conditions** as the English, using the
helpers exported from `../../content` (`kiteName`, `career`, `interest`, `partnered`,
`partnerName`, `pipIsYours`, `pierState`, `allies`) and `import type { Life } from "../../core"`.
Examples:
```ts
"c2.dad.prompt": (l: Life) => `Bố đã làm lại con diều ${kiteName(l)} của bạn…`,
"c5.nana.context": (l: Life) => (l.facts.nanaStory === "yes" ? "…" : undefined),
"a4.sky.result": (_l: Life, r: { grade?: string }) => (r.grade === "soar" ? "…" : r.grade === "steady" ? "…" : "…"),
```
`kiteName(l)`, `career(l)` and `allies(l)` already return words from **your** lexicon. Don't
use the English `aOrAn`. Function paths must stay functions; string paths may be strings.

## Rules
- Keep every `{placeholder}` exactly, and keep HTML (`<kbd>`, `<b>`, `<small>`, `<br>`) and
  emoji/symbols (★ … ✦ ▸ ↺ ♫ ❤ 💔 ☀ ⌖ ▤ → ⤒ ×) intact.
- Speech uses curly quotes “ ” (always balanced within one string). The game splits long text
  into short beats at sentence ends and never inside “ ”.
- Keep lines about as long as the English, or shorter. Punchy lines stay punchy.
- Voice: warm, literary, wry, second person, present tense. Keep the humour and the ache.
- Ids, fact values and option order never change.

## Glossary
| English | Vietnamese | Korean |
| --- | --- | --- |
| Kitehaven | Kitehaven | 카이트헤이븐 |
| the Old Pier | Cầu Tàu Cũ | 옛 부두 |
| Mum / Dad | Mẹ / Bố | 엄마 / 아빠 |
| Nana June | Bà June | 준 할머니 |
| Ms Lin | Cô Lin | 린 선생님 |
| Rowan, Maya, Tobias Voss, Sam, Avery, Quinn, Morgan, Pip | unchanged | 로완, 마야, 토비아스 보스, 샘, 에이버리, 퀸, 모건, 핍 |
| Mrs Pepper | bà Pepper | 페퍼 부인 |
| the Marigold (boat) | tàu Marigold | 메리골드호 |
| Voss Marina / Voss Harbour Holdings | Bến du thuyền Voss / Tập đoàn Cảng Voss | 보스 마리나 / 보스 항만 홀딩스 |
| free time (hours) | thời gian rảnh (giờ) | 자유 시간 (시간) |
| Health / Joy / Savings | Sức khỏe / Niềm vui / Tiền tiết kiệm | 건강 / 기쁨 / 저축 |
| keepsake | kỷ vật | 기념품 |
| the golden gate | cổng vàng | 황금 문 |

Vietnamese: address the player as "bạn". Korean: narration in the literary plain style
(-다); speech in natural register (children and friends 반말, to elders 존댓말). Leave "you"
unstated where Korean naturally omits it.

## Check
`npx tsx --test src/lang-xx.test.ts` must pass. It checks completeness and placeholders,
renders every line across 90 random lives, and flags text left in English.
