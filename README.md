# Choice of Life: Kitehaven

One whole life in one bright harbour town, from your first kite in an attic nursery to the
last festival on the clifftop. Every summer Kitehaven flies kites off the Old Pier. Every
choice you make decides who is still holding the string with you at the end.

- [Play the game](https://buicongnguyen.github.io/Choice_of_life_3D/)
- [Inspect every model](https://buicongnguyen.github.io/Choice_of_life_3D/asset-gallery.html)
- [Why and how the game was redesigned (1.0.0)](docs/KITEHAVEN_REDESIGN.md)
- [Art direction and the Blender pipeline](art/ART_DIRECTION.md)

## The game
- **Twelve chapters, twelve places:** the attic nursery, the gap in the garden fence, the
  schoolyard, the kite festival, the storm, the last train, your first job, a rooftop party,
  the busy kitchen, the town vote, Nana's cottage, and the last festival.
- **Choices with a price:** a lie about a toy boat, a bully on the playground, a friend's boat
  in a storm on the night before your exams, the city or the harbour, the marina or the pier,
  your career or your mother's care.
- **Free time is a budget.** The main story is always free. Everything else costs one of your
  two hours per chapter, so you can't see everyone. Relationships you don't tend will cool.
- **The town remembers.** A vote in chapter ten is decided by the allies you earned decades
  earlier. The pier's fate changes the view for the rest of your life.
- **Six endings**, and the people you kept close come to the last festival.
- **Made to be read comfortably:** story text arrives in short beats with 3D portraits of
  whoever is speaking, choices sit side by side, and each chapter opens like a film.

## Controls
WASD or the arrow keys to walk, or tap or click the ground. **E** or **Space** to talk or act.
In conversations, **click, Space or Enter** shows the next line and **1–5** chooses; **J** for the journal, **Esc** to pause. **Go to…** walks you to anyone or
anything automatically. On touch screens, use the pad or tap to walk. The kite game: hold to
pull the line in, release to let it out. It has a "Steady hands" assist and a skip.

Make it yours: name, hairstyle, skin tone and favourite colour. Graphics: Full detail, or
Light for phones (the default on phones). Reduced motion, large text and conversation
close-ups are in Pause.

## Development
Node.js 22 or newer.

```sh
npm ci
npm run dev          # http://127.0.0.1:5173
npm test             # rules, saves, balance, endings, content, beats and navigation (25 tests)
npm run build        # type-check, bundle, write dist/release.json
npm run preview
```

Browser checks (Playwright; `GPU=1` uses the hardware GPU through ANGLE):

```sh
npx vite --host 127.0.0.1 --port 4196    # or: npm run build && npx vite preview --port 4197
GAME_URL=http://127.0.0.1:4196/ GPU=1 node scripts/smoke.mjs     # 13 end-to-end UI checks
GAME_URL=http://127.0.0.1:4196/ GPU=1 node scripts/capture.mjs   # screenshots of all 12 chapters
GAME_URL=http://127.0.0.1:4197/ GPU=1 node scripts/perf.mjs      # frame times, draw calls
npx tsx scripts/balance.mts                                       # 400 random lives: stats and endings
npx tsx scripts/textstats.mts                                     # how much text each screen shows
GAME_URL=http://127.0.0.1:4197/ node scripts/audit-ui.mjs        # message sizes at PC resolutions
```

Screenshots go to `docs/captures/`, which is git-ignored.

## Art
All models are original. Blender 4.5 LTS generates them headlessly from `art/kitehaven/`. The
checked-in GLBs mean Blender is optional for playing or deploying. To rebuild:

```sh
blender --background --factory-startup --python art/kitehaven/build.py
```

This writes `public/models/*.glb` (full detail), `public/models/low/*.glb` (phones),
`layout.json` (anchors and colliders for every scene) and `manifest.json`. The build fails if
any story anchor is unreachable. Colour is stored per vertex with baked ambient occlusion, and
the GLBs are Draco-compressed: 5.6 MB at full detail and 3.3 MB for phones.

Fonts are self-hosted under their SIL Open Font Licenses. The Three.js licence is in
`public/THREE-LICENSE.txt`.

## Saves
A life is saved as an action log (`choice-of-life-kitehaven-v1` in local storage) and replayed
on load, so a save can only contain states the game could have produced. Lives from the
earlier 0.3 edition are left untouched; Kitehaven is a new story and begins fresh.

## Publishing
SSH origin: `git@github.com:buicongnguyen/Choice_of_life_3D.git`. Pushing to `main` runs the
tests and the production build, then deploys `dist` to GitHub Pages. `/release.json` contains
the deployed commit. To roll back, revert the commit and push; don't rewrite history.
