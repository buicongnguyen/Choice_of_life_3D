# Choice of Life: Kitehaven — evaluation and redesign (1.0.0)

This release replaces the 0.3 "little world of choices" with a new story, new rules,
twelve new Blender dioramas, new characters, a new renderer look and a new interface.
This document records why, what changed, and how it was verified.

## 1. What was wrong with 0.3

### Story
- **No conflict.** Every one of the 72 options was a pleasant thing to do ("Reach for a
  cuddle", "Build steady foundations"). Nothing could go wrong, so no choice carried weight.
- **No people.** Twelve names with a colour each. Only Rowan's toy boat came back later.
  Nobody had wants of their own, changed over time, or could be let down.
- **No spine.** Twelve disconnected vignettes ("a small beginning", "the busy middle") with
  no dramatic question running through them, and one warm ending with three title variants.

### Systems
- **Meaningless numbers.** Health, Happiness and Money climbed to 100 by the middle of the
  game and gated nothing. Money came from "+1" pickups.
- **No opportunity cost.** You could see everyone and do everything in every chapter.
- **Busywork activities.** Nine of the twelve "activities" were three buttons pressed in order.

### Art
- **Pastel and beige.** A sage/cream palette under ACES tone mapping, which desaturates further.
- **The same room twelve times.** Six "scene families" built from one template (a plank floor,
  two walls, three windows), re-dressed with a few props.
- **Tiny, far-away characters.** A distant orthographic camera; the world filled about a third
  of the screen inside an empty ellipse.
- **Gamey labels.** "♥ Health / ✦ Joy / ● Money" floated over every collectable.
- **Heavy for what it showed.** 29 MB of GLBs plus 17 MB of `.blend` files.

## 2. The redesign

### The story: *Kitehaven*
One life in one bright harbour town, from a cot under the eaves to the clifftop at the last
kite festival. The spine is the question the title asks: **who is still holding the string
with you at the end?**

- **A town with a fight in it.** A storm wrecks the Old Pier when you are sixteen. For the
  rest of your life Voss Harbour Holdings wants to replace it with a marina. Your career can
  help build that marina, fight it from inside, or refuse it. At fifty-something the town
  votes, and the outcome depends on **allies you earned decades earlier**. Rowan's co-op,
  Maya's drawings, Councillor Quinn, your own record, the grudging respect of the bully you
  once stood up to, and the neighbours you rallied that day all count. The pier's fate then
  changes the view from every later chapter.
- **People with arcs.** Rowan, the boy through the gap in the fence, becomes a fisherman
  and your conscience. Maya, the new girl with the rocket lunchbox, becomes the architect who
  can save the harbour. Tobias Voss, the bully, grows up to run the company, and remembers
  who told him no. Nana June keeps the lighthouse. Mum and Dad get older and need you. Your
  partner (Avery, Quinn or Morgan, met on a rooftop, or nobody, and your friends are your
  family) has a dream that costs you something. Pip is your child or your godchild.
- **Real dilemmas with a price.** A lie about a toy boat at four resurfaces at seventy. Stand
  up to a bully or look at your shoes. Save your best friend's boat in a storm, or sit your
  exam. Take the city scholarship, the harbour apprenticeship, or Rowan's fishing boat. Take
  the promotion or care for Mum at home. Reopen Dad's kite shop, give the keys away, or sell
  it and travel.
- **Six endings, decided by the shape of your whole life:** The Keeper of the Light, The
  Heart of the House, The Wanderer, The Builder, The Friend, or A Whole, Ordinary Life. Each
  ending has a nine-to-twelve-line epilogue built from your actual choices. The people
  standing on the clifftop at the end are the ones you kept close.

### The rules
- **Free time is a budget.** Each chapter has one main moment (always free) and several side
  moments and an activity that cost an hour each, usually **two hours per chapter**. You
  cannot see everyone. The final chapter has no clock: "There's time today for everyone who came."
- **Relationships need tending.** Four bonds (Family, Rowan, Maya, Partner; 0–5 hearts). If
  someone is right there in a chapter and you spend no time with them, the bond cools by a
  heart and your joy dips.
- **Life has upkeep.** Rent and living costs from eighteen, income by career, ageing from
  twenty-five, and joy that settles back to everyday life between chapters. The balance report
  (`npx tsx scripts/balance.mts`) plays 400 random lives. Savings end anywhere from 2 to 99,
  bonds from 0 to 5, and all six endings occur. In 0.3, every stat pinned at 100.
- **Gates that mean something.** A worn-out teenager can't go out onto the pontoon (Health 35).
  You can't care for Mum at home without savings, can't lend Rowan money you don't have, and
  can't share the care without someone close enough to share it with. Locked options stay
  visible with the reason, so you can see what an earlier choice cost.
- **Activities you play.** 3D hunts (walk the diorama to find three glowing things: your
  first steps, Rowan's boat parts, the storm lantern, the party cake, the town's signatures),
  a kite-flying mini-game (hold to pull, release to let out, keep the line in the bright band;
  "Steady hands" assist and a skip), and three-block planners.
- **Saves are replays.** A life is an append-only log of actions replayed from a fresh start
  (`src/core.ts`), so a save can only contain states the game itself could have produced. Old
  0.3 saves are left untouched and the title explains that Kitehaven begins fresh.

### The art: toy dioramas (Blender)
- **Twelve unique dioramas**, one per chapter: attic nursery, two back gardens with a gap in the
  fence, the schoolyard, the Old Pier at the festival, the harbour at midnight in a storm, the
  clifftop station, a workplace with three fit-outs chosen by your trade, a rooftop party at
  sunset, the family kitchen, the town square before the vote, Nana's thatched cottage, and the
  clifftop at the last festival. The harbour backdrop is reused across scenes and shows the pier
  in four states: old, ruined, restored, or marina.
- **Characters for every age** (baby, kid, adult, elder): chunky toy proportions, glossy eyes
  with highlights, eight hairstyles, beards, glasses, hats, aprons, stethoscopes, a cane. Every
  townsperson has a look per life stage and ages with you.
- **Vertex colour, not textures.** Every surface is coloured per face, with ambient occlusion
  ray-traced at build time and baked in. A diorama needs only a handful of materials (Matte,
  Satin, Gloss, Metal, Glass, Water, Glow). Draco compression brings all eighteen GLBs to
  **5.6 MB** at full detail and **3.3 MB** in the phone set, down from 29 MB.
- **Built headless and reproducibly** with Blender 4.5 LTS from `art/kitehaven/*.py`. The build
  validates the layout contract: every anchor must be on walkable ground, clear of furniture,
  and reachable from the spawn point, or the build fails. See `art/ART_DIRECTION.md`.

### The look in the browser
- Khronos **Neutral tone mapping** instead of ACES, so saturated toy colours stay saturated.
- Eleven time-of-day presets: sky gradient, warm key, cool fill, rim light, fog and exposure.
  A very dark blue storm night lets the lamps carry the colour; the sunset rooftop has
  blooming string lights.
- **Selective bloom.** Light levels are calibrated so lit surfaces sit below the bloom
  threshold and only lamps, windows and string lights glow. Soft shadows, animated water,
  swaying kites, bobbing boats, a sweeping lighthouse beam, rain, confetti and floating motes.
- **Living characters.** Walk cycles, idle breathing, blinking, people turning to look at you,
  a wave when you arrive with something to say, talking mouths and nods.
- A **follow camera** with an establishing shot per chapter and close-ups for conversations
  (the frame shifts above the dialog). Quest markers: gold **!** for the main story, blue **…**
  for free-time moments, pink **?** for people to meet, teal **✦** for activities, and a
  golden gate when you can move on.
- A bold, chunky interface: storybook serif titles, chip-coloured effects, bond hearts, a
  chapter card for each stage of life, a three-tab journal, and an ending page. Phones hide
  the HUD during conversations so you can see who you are talking to.

## 3. Verification

| Check | Result |
| --- | --- |
| `npm test` (23 tests) | Rules, save replay and tamper rejection, the free-time budget, gates, the vote, activities, callbacks, all six endings reachable, 260 random lives finishing and replaying exactly, content integrity against the Blender layout, and navigation reachability for every anchor in every workplace fit-out |
| `node scripts/smoke.mjs` (13 checks, real UI) | Customise and begin; walk to Nana and choose a kite; a hunt started, walked and completed; free time running out; a discovery; reload and continue; the golden gate, with the new chapter starting at its spawn; the journal; the kite game; the planner closed and reopened mid-plan; the last kite and the ending; a finished life reopening on its ending; the phone layout with light graphics. Passed against both the dev server and `vite preview` of `dist/`, with no page errors |
| `node scripts/capture.mjs` | All twelve chapters opened from real saves, with no page errors |
| `node scripts/perf.mjs` | RTX 4080 (ANGLE D3D11), 1280×800: 60 FPS locked in every chapter measured, p95 16.8 ms. Full detail uses 126–380 draw calls and 133k–504k triangles including the shadow pass. Light mode uses 61–192 calls and 29k–86k triangles |

An independent code review before release found and fixed these issues:
- A half-made plan could not be reopened.
- A new chapter could start beside the previous chapter's exit.
- Repeated plan-undo could grow a save past its limit.
- Time spent with someone already at five hearts still counted as neglect.
- Bonds cooled without the player being told; the chapter card now says so.
- Councillor Quinn counted as an ally even if you'd asked Quinn to wait.
- Several facts that were set were never read back. The town now remembers them.
- "Make it yours" collapsed after every tap.
- Continuing a finished life showed the last chapter card.

Each fix has a unit or browser test.

Phones start in light mode: simpler models, no shadows or bloom, 1× pixels, 30 FPS painting.
Real-phone profiling has not been done; the numbers above come from desktop emulation.

## 4. Not in this release
- Voice, music and authored skeletal animation (characters use procedural pivots).
- Portraits rendered from the 3D models (dialogs use coloured initials).
- A dedicated non-visual play mode. All UI is keyboard-reachable and labelled, but the 3D
  world itself is not narrated.
