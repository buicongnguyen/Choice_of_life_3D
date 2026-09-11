# Choice of Life 3D

Little moments. A whole life. A self-paced 3D life adventure built with **Blender 4.5** and **Three.js**, reimagined from Choice of Life 2D.

- [Play the game](https://buicongnguyen.github.io/Choice_of_life_3D/)
- [Inspect the actual 3D assets up close](https://buicongnguyen.github.io/Choice_of_life_3D/asset-gallery.html)
- [Crafted-realism art direction](art/ART_DIRECTION.md)
- [Detailed redesign and implementation plan](IMPLEMENTATION_PLAN.md)
- [Refined game design: UI, map, movement, activities and all twelve stages](GAME_DESIGN.md)
- [0.1.1 code and logic review](docs/REVIEW_2026-09-11.md)
- [Implementation and review record](docs/IMPLEMENTATION_STATUS.md)

Explore twelve chapters from a family nursery to a legacy garden. Meet recurring people, discover small treasures, choose an education and career, decide what home means to you, and open a book of memories at the end. Health, Happiness, and Money remain separate outcomes.

## Controls

WASD or arrows move in both directions on the actual 3D ground. Click/tap a destination to walk there, or use the four-way touch pad. E/Space interacts with the nearest point of interest. Clicking a person walks over and opens their conversation. **Explore** offers a list of destinations and automatic walking. **Esc** pauses. Reading a choice always pauses movement.

Play starts immediately. The title's **Make it yours** section offers a name, male/female character, four skin tones, and gentle/normal/brisk walking pace. Appearance changes no story probabilities. Sound and reduced motion are optional. Continue resumes the saved 3D life on the same device and browser.

## Development

Node.js 22.12+ is required (Node 22 is used in CI).

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

For the shorter movement, save-race and responsive UI regression review, run `node scripts/refinement-smoke.mjs` against a production preview on port 4194 (or set `GAME_URL`). The nine pure test groups include safe navigation and save compatibility; they finish in under a second on the development machine.

The checked-in GLBs make Blender optional for running or deploying the game. To rebuild the art, install Blender 4.5 LTS and run:

```sh
blender --background --python art/build_assets.py
```

Editable `.blend` files live in `art/`. Runtime models, collider metadata, and an asset manifest live in `public/models/`. `build_assets.py` runs the detailed generator in `build_crafted_assets.py`. After a full build, an individual model can be re-exported with `blender --background --python art/build_assets.py -- boat` (replace `boat` with the model name). The local portable Blender runtime is ignored in `.tools/` and is not published. Geometry and small embedded texture maps are original and procedurally authored; no external art service or model pack is required. Fonts are self-hosted under their included SIL Open Font Licenses. Three.js attribution is included in `public/THREE-LICENSE.txt`.

Version 0.2.0 rebuilds all twenty assets with construction details, differentiated materials, woven/wood/stone surface maps, improved character features, and calibrated reflection lighting. The model viewer uses the same GLBs and lighting as the game; drag to inspect or pinch to zoom. `node scripts/art-smoke.mjs` checks embedded materials, animation pivots, all model loads, mobile layout and a short playable save/continue flow. Art URLs include the package version to invalidate older browser-cached GLBs after updates.

For one bounded full-life browser check, start the production preview and run:

```powershell
$env:GAME_URL = 'http://127.0.0.1:4173/'
npm run smoke
```

The smoke script walks to every encounter through the real UI and pathfinder, makes 24 choices, reaches the ending, checks save/reload, and checks mobile dialogue layout. It does not run a large seed matrix. Screenshots are local review artifacts in `docs/captures/`.

## Publishing

SSH origin: `git@github.com:buicongnguyen/Choice_of_life_3D.git`.

Pushes to `main` run focused core tests and the production build, then deploy the resulting `dist` artifact through GitHub Pages. `/release.json` contains the exact commit SHA. Relative asset URLs support the GitHub project subpath. To roll back, revert the affected source commit and push the revert normally; do not rewrite the branch history.

## First-release scope

This is a compact complete 3D edition, version 0.2.0. It contains six scene families, twenty GLB assets, 24 authored encounters, 72 options, 36 optional discoveries, three partner candidates, and a personalized ending. Story consequences use named facts and recurring dialogue. Characters use articulated mesh pivots with distance-driven walking and a seated baby scoot, rather than full armature animation clips.

The original 2D repositories and their save keys are independent. This edition intentionally replaces scrolling lanes with self-paced exploration. Wider profession wardrobes, more expressive acting, longer partner stories, richer activities, mobile device performance tuning, and a dedicated nonvisual play mode are follow-up work. Balance is deliberately forgiving; some late-game outcomes can reach the score cap, and the UI shows the actual available change.
