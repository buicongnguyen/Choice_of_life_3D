# The Life Run: Subway Surfers' mechanics, Kitehaven's story

Kitehaven 1.4.0 put Subway Surfers-style lane-stepping on the isometric diorama camera. That
was the wrong reading of the request. The camera still looked across the scene, so "moving"
meant drifting toward the top-right of the screen, and lanes on a diagonal floor were hard to
read. 2.0 makes the change the request actually asked for: **the camera sits behind you and
you run toward the top of the screen**, as in Subway Surfers. The 1.4 diorama lane-stepping is
removed, and walking in the dioramas is free movement again.

## 1. What Subway Surfers is made of

| Mechanism | How it works there | Why it works |
|---|---|---|
| Chase camera | Low, behind and above the runner, looking down the track | You always read the lanes and what's coming from far off |
| Auto-run | Speed is fixed and ramps up slowly | Your only decisions are *where* and *when* |
| 3 lanes | Swipe ←/→ snaps one lane, with a lean and a fast tween | One gesture, one result |
| Jump / roll | Swipe ↑ jumps low barriers, swipe ↓ rolls under high ones | Each obstacle has exactly one counter, readable from its shape |
| Obstacles | Barrier (jump), overhead (roll), train/block (change lane) | Three silhouettes, three answers |
| Coins | Lines and arcs along lanes, often across a lane change or over a jump | Coins *teach* the safe route |
| Power-ups | Jetpack (fly over everything, collect sky coins), magnet, super sneakers | Short bursts of a different game |
| Stumble | A side bump stumbles you; the next hit ends the run | One mistake is forgiven |
| Juice | Lean, dust, coin pop and chime, camera kick on a hit, speed lines | Every input feels physical |
| HUD | Coin count, score and multiplier, power-up timer | Kept to the corners, with the track left clear |

## 2. Our version: the same mechanisms, our story

| Subway Surfers | Kitehaven Life Run |
|---|---|
| Endless subway | A **chapter-long run** (about 35–45 s) down a street of Kitehaven themed by the chapter: cobbled town lanes, harbour pier planks, garden paths |
| Trains (dodge) | **Market carts** and **stacked kite crates** (block a lane, so change lane) |
| Barriers (jump) | **Low picket fences / toy-block walls** (jump) |
| Overhead signs (roll) | **Festival banners** strung low between posts (slide) |
| Coins | **Kite coins**: count toward *Savings* |
| (no equivalent) | **Sparks** (stars, toward *Joy*) and **hearts** (toward *Health*): your three life stats, collected on the run |
| Jetpack | **Kite lift**: grab a kite and it lifts you over the street for a few seconds, along a ribbon of sky sparks |
| Inspector chasing you | Nothing chases you: this is a life, not an escape. A hit is a **stumble** that costs a little health. After three stumbles you're *winded*: the street clears and you jog the rest of the way. A run never fails |
| Score | **What you carried**: coins, sparks, hearts and high-fives turn into a real story effect (§4) |
| (no equivalent) | **People on the street**: your chapter's friends stand in a lane and wave. Run through them for a **high-five**, which counts as time spent with them, so the bond doesn't cool |
| (no equivalent) | **The crossroads**: the chapter's big choice is the end of the run. The street widens into a plaza with one **gate per option**, each signed with its words. The run slows to a stop and the question appears. Move between gates with ←/→ and run through one (↑, Enter, tap or click) to choose. Gates for options you can't take yet are shut, with the reason on the sign |

The age of your body sets the pace. As in the dioramas, legs are speed-true (gait.ts), so the
runner's feet plant correctly at running speed:
- the baby crawls a slower, shorter run through the garden;
- children and adults run;
- elders jog more gently, with fewer obstacles.

## 3. Controls

| Input | Keyboard | Touch / mouse |
|---|---|---|
| Change lane | ←/→ or A/D (one press is one lane) | swipe left/right |
| Jump | ↑, W or Space | swipe up |
| Slide | ↓ or S | swipe down |
| At the crossroads | ←/→ choose a gate, ↑/Enter run through it | swipe, or tap a gate's card |
| Pause | Esc | pause button |

**Explore on foot** is kept, both as an accessibility path and for the side stories: the
chapter card offers *Run* (primary) and *Explore on foot*. After the run, you arrive in the
chapter's diorama with the big choice made. The side stories, the activity and the golden gate
are all still there.

## 4. Rules (src/runner-core.ts: pure, deterministic, tested)

- **Track:** a run is generated from a seed (the chapter number and how many lives you've
  lived), so it's reproducible. Its rows are laid out in **patterns**, as Subway Surfers does
  it: never three blocked lanes, always a coin line that teaches a safe route, at least
  about 1 s of reaction distance at the current speed, and difficulty that ramps with the
  chapter and the distance run.
- **Physics:** lane tween 0.14 s with a lean; jump peak 1.35 over 0.62 s; slide 0.7 s; low
  hurdle 0.6 tall (jump), banner from 1.0 to 2.0 (slide), crate 1.5 and cart 2.1 tall (change
  lane).
- **Hit:** costs one stumble, gives 1.2 s of invulnerability and a brief slowdown. The third
  stumble makes you *winded*: obstacles ahead are cleared and you jog.
- **Result:** one logged action, `run:<coins>-<sparks>-<hearts>-<stumbles>:<who,…>`. It's
  allowed once per chapter and logged right after the choice made at the gate (so the gates are judged against the same life they showed). All values are bounded so a hand-edited
  save can't mint stats.
  - Savings: ⌊coins/5⌋, up to 8.
  - Joy: ⌊sparks/3⌋, up to 6.
  - Health: 2 × (hearts − stumbles), between −4 and +4.
  - High-fives tend those bonds (`tended`, the same rule as talking to someone).
  - It's written as a journal memory, "The run".
- **Choice:** the gate you run through is logged as the existing `talk:<main>:<i>` action, so
  every story consequence is unchanged.

## 5. Assets (Blender: art/kitehaven/runner.py → public/models/runner.glb, full + phone)

Every piece is a single node `Run_<name>`, built from the same toy kit as the town:
- **Track tiles**, 12 units long:
  - `Run_track_town`: cobbles, kerbs, pavements, painted lane dashes;
  - `Run_track_pier`: planks, rails, water beyond;
  - `Run_track_garden`: a sandy path through the lawn, with flower borders;
  - `Run_plaza`: the wide crossroads.
- **Street dressing**, placed on both sides and recycled:
  - `Run_house0–3`: houses in four colourways;
  - `Run_tree`, `Run_lamp`, `Run_stall` (a market awning), `Run_bunting` (over the road).
- **Obstacles:** `Run_crate`, `Run_cart`, `Run_hurdle`, `Run_banner`.
- **Pickups:** `Run_coin`, `Run_spark`, `Run_heart`, `Run_kite` (the kite lift).
- **The crossroads:** `Run_gate`. Its sign is drawn at runtime with the option's text in the
  current language.

## 6. Code

| File | What it does |
|---|---|
| `src/runner-core.ts` (+ `runner-core.test.ts`) | Plan generation, step simulation, collisions, results |
| `src/runner-view.ts` | The 3D run: recycled track and dressing, items, chase camera, lean, dust, pickup pops, speed lines, crossroads framing. It reuses World's renderer, lighting presets, bloom, characters and speed-true gait |
| `src/core.ts` | The `run:` action |
| `src/main.ts` / `src/ui.ts` / `src/design.css` | The run HUD, the crossroads card and the result, in English, Vietnamese and Korean |
| `src/world.ts` | 1.4 lane-stepping and lane guides removed |

## 7. Acceptance

- Unit tests:
  - generated tracks are always passable (no fully blocked row, reaction distance respected);
  - jump clears hurdles and not crates; slide clears banners;
  - the third stumble winds you;
  - results are bounded;
  - the `run:` action is accepted once, before the big choice;
  - the crossroads maps every visible option to a gate.
- Browser smoke:
  - Run from the chapter card;
  - lane change, jump and slide each change the runner's state;
  - reach the crossroads, choose a gate, see the response, then arrive in the diorama with the
    big choice made;
  - "Explore on foot" still behaves exactly as before (the existing 19 checks).
- Screenshots: the run in the town, on the pier and in the garden, plus the crossroads, on
  desktop and on a phone in portrait.
- Performance: 60 fps on desktop, with phone (low) materials on low graphics.
