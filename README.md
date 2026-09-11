# Choice of Life 3D

Little moments. A whole life. A self-paced 3D life adventure built with **Blender 4.5** and **Three.js**, reimagined from Choice of Life 2D.

- [Play the game](https://buicongnguyen.github.io/Choice_of_life_3D/)
- [Inspect the actual 3D assets up close](https://buicongnguyen.github.io/Choice_of_life_3D/asset-gallery.html)
- [Crafted-realism art direction](art/ART_DIRECTION.md)
- [Detailed redesign and implementation plan](IMPLEMENTATION_PLAN.md)
- [Refined game design: UI, map, movement, activities and all twelve stages](GAME_DESIGN.md)
- [0.1.1 code and logic review](docs/REVIEW_2026-09-11.md)
- [Playable-story implementation plan, 0.3.0](docs/STORY_EXPERIENCE_PLAN_0.3.0.md)
- [Story release review, 0.3.0](docs/STORY_REVIEW_0.3.0.md)
- [Mobile graphics profiles and review, 0.3.1](docs/MOBILE_GRAPHICS_0.3.1.md)
- [Automatic pickup and compact choices, 0.3.2](docs/INTERACTION_UI_0.3.2.md)
- [Implementation and review record](docs/IMPLEMENTATION_STATUS.md)

Explore twelve chapters from a family nursery to a legacy garden. Meet recurring people, discover small treasures, choose an education and career, decide what home means to you, and open a book of memories at the end. Health, Happiness, and Money remain separate outcomes.

## Controls

WASD or arrows move in both directions on the actual 3D ground. Click/tap a destination to walk there, or use the four-way touch pad. E/Space interacts with the nearest point of interest. Clicking a person walks over and opens their conversation. **Explore** offers a list of destinations and automatic walking. **Esc** pauses. Reading a choice always pauses movement.

Each chapter starts with a persistent briefing. **Story** reopens it. Teal activity labels lead to an untimed search, sequence or planning board; all twelve are optional and offer assistance. Ordinary discoveries give a small +1 reward. The title's **Make it yours** section offers a name, male/female character, four skin tones, and gentle/normal/brisk walking pace. Appearance changes no story opportunities. Sound and reduced motion are optional; Pause also offers large text and conversation framing. Continue resumes the saved 3D life on the same device and browser, including unfinished activities.

## Development

Node.js 22.12+ is required (Node 22 is used in CI).

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

`npm test` runs focused core, activity, compatibility and navigation tests. `npm run smoke` reviews the three flagship activities, direct partner introductions/continuity, the ending, and mobile panels against port 4196 (or `GAME_URL`). The separate movement/save-race review remains available as `node scripts/refinement-smoke.mjs` against port 4194.

The checked-in GLBs make Blender optional for running or deploying the game. To rebuild the art, install Blender 4.5 LTS and run:

```sh
blender --background --python art/build_assets.py
```

Editable `.blend` files live in `art/`. Runtime models, collider metadata, and an asset manifest live in `public/models/`. `build_assets.py` runs the detailed generator in `build_crafted_assets.py`. After a full build, an individual model can be re-exported with `blender --background --python art/build_assets.py -- boat` (replace `boat` with the model name). The local portable Blender runtime is ignored in `.tools/` and is not published. Geometry and small embedded texture maps are original and procedurally authored; no external art service or model pack is required. Fonts are self-hosted under their included SIL Open Font Licenses. Three.js attribution is included in `public/THREE-LICENSE.txt`.

Version 0.2.0 rebuilds all twenty assets with construction details, differentiated materials, woven/wood/stone surface maps, improved character features, and calibrated reflection lighting. The model viewer uses the same GLBs and lighting as the game; drag to inspect or pinch to zoom. `node scripts/art-smoke.mjs` checks embedded materials, animation pivots, all model loads, mobile layout and a short playable save/continue flow. Art URLs include the package version to invalidate older browser-cached GLBs after updates.

For the bounded story browser check, start the production preview and run:

```powershell
$env:GAME_URL = 'http://127.0.0.1:4173/'
npm run smoke
```

The story smoke uses valid isolated chapter fixtures and real UI/pathfinding for the reviewed interactions. It checks partial activity save/reload, planner undo, supported tuition, the clinic workday, partner introductions, later partner presence and a twelve-chapter ending. `node scripts/smoke.mjs` retains the longer all-encounter route. Neither runs a seed matrix. Screenshots are local review artifacts in `docs/captures/`.

## Mobile graphics

Nearby collectible items now pick up automatically while you walk. Talking,
activities and chapter exits remain deliberate. Choice cards show a short question,
three options and their effects; **More details** opens the full explanation without
enlarging the window. Your journal keeps the complete story.

Open **Make it yours → Graphics detail** on the title screen or **Pause → Graphics
detail** while playing. Low detail uses simpler models, lower 3D resolution, lighter
lighting and a 30 FPS rendering limit. Text, controls and story content are unchanged.
Phones start with Low detail unless you have already saved another preference.
Switching saves the life and reloads the title; choose **Continue** to resume.

The full-detail models remain available. Regenerate their lightweight counterparts
after changing the art with `blender --background --python art/build_low_detail.py`.
The focused mobile check is `node scripts/graphics-smoke.mjs` against port 4196 or
`GAME_URL`. See [the graphics record](docs/MOBILE_GRAPHICS_0.3.1.md) for budgets and
the distinction between emulated browser checks and real-phone performance.

## Publishing

SSH origin: `git@github.com:buicongnguyen/Choice_of_life_3D.git`.

Pushes to `main` run focused core tests and the production build, then deploy the resulting `dist` artifact through GitHub Pages. `/release.json` contains the exact commit SHA. Relative asset URLs support the GitHub project subpath. To roll back, revert the affected source commit and push the revert normally; do not rewrite the branch history.

## Current scope

Version 0.3.0 adds twelve optional activity boards to the six scene families and twenty GLBs from 0.2.0. There are 24 main encounters, 72 choices, 24 ordinary discovery points, three directly approachable partner candidates, later partner check-ins, a keepsake shelf and illustrated journal, and a twelve-chapter personal chronicle. The old middle discovery in each room is now the activity anchor. Old discovery records remain valid.

Rowan's boat has search/repair/help/lending outcomes. A three-afternoon exam planner can unlock supported tuition; club and school-project history can improve field opportunities. The first workday has care, software and business variants. Care planning has explicit costs. Positive choice rewards are reduced, not retroactively applied to old saves. Characters use articulated mesh pivots with distance-driven walking, restrained acknowledgement and a seated baby scoot, rather than full armature animation clips.

The original 2D repositories and their save keys are independent. This edition intentionally replaces scrolling lanes with self-paced exploration. Full physics minigames, wider profession wardrobes, facial rigs/voice acting, larger career environments, ambient NPC schedules, physical mobile performance tuning, and a dedicated nonvisual play mode remain follow-up work. Balance is forgiving and some outcomes can reach the cap; the UI shows actual choice changes. The activity planner shows its nominal preview until commitment, then reports the actual clamped result.
