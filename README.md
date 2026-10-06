# Choice of Life: Kitehaven

One whole life in one bright harbour town, from your first kite in an attic nursery to the
last festival on the clifftop. Every summer Kitehaven flies kites off the Old Pier. Every
choice you make decides who is still holding the string with you at the end.

- [Play the game](https://buicongnguyen.github.io/Choice_of_life_3D/)
- [Inspect every model](https://buicongnguyen.github.io/Choice_of_life_3D/asset-gallery.html)
- [Why and how the game was redesigned (1.0 → 2.0)](docs/KITEHAVEN_REDESIGN.md)
- [The Life Run: Subway Surfers' mechanics, our story](docs/LIFE_RUN_PLAN.md)
- Play in English, **Tiếng Việt** or **한국어** (title screen → Make it yours → Language)
- [Art direction and the Blender pipeline](art/ART_DIRECTION.md)

## The game
- **Every chapter is a run.** As in Subway Surfers, the camera sits behind you and you run up
  the screen through Kitehaven: the cobbled lanes, the harbour pier, the garden paths. Switch
  between three lanes, jump fences, slide under festival banners and dodge kite crates and
  market carts. Coins, sparks and hearts become your savings, joy and health. Grab a kite to
  fly over the street for a few seconds, and high-five the people you love as you pass them.
  A stumble costs a little health, but a run never fails: this is a life, not an escape.
- **The big choice is a crossroads.** Each run ends in a plaza with one gate per option, each
  signed with its words. You run through the one you choose. Shut gates tell you what you'd
  need first.
- **Then the town is yours to explore.** After the run you arrive in the chapter's diorama to
  meet people, find things and take on the chapter's activity. You can also skip the run and
  explore on foot from the chapter card.
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
- **Faces that react:** people beam, frown, worry or look surprised as they talk and as they
  take your answer.
- **Your kite, your way:** earn patterns from what you did, paint it in the workshop, and
  watch it fly over every outdoor chapter.
- **A living town:** townsfolk on their own walks, seasons, and fireworks at the parties.
- **A music box that grows up with you**, from lullaby to the full festival band.
- **An album of lives:** every ending you've found, who came to each last festival, and a
  picture card to save or share. The journal's **Paths** tab shows the roads not taken.
- **Three languages:** English, Vietnamese and Korean, the whole story included.
- **Touch-first interface:** a thumb stick, an icon dock, sheets for settings and customising,
  and 3D toy icons rendered in Blender (`art/ui`).

## Controls
**On a run:** ←/→ or A/D change lane (one press, one lane), ↑/W/Space jump, ↓/S slide. On a
touch screen, swipe. At the crossroads, ←/→ chooses a gate and ↑ or Enter runs through it; you
can also tap a gate's card, or press 1–5.

**Exploring:** WASD or the arrow keys to walk, or tap or click the ground (on touch screens, drag the thumb stick). **E** or **Space** to talk or act.
In conversations, **click, Space or Enter** shows the next line and **1–5** chooses; **J** for the journal, **Esc** to pause. **Go to…** walks you to anyone or
anything automatically. On touch screens, use the pad or tap to walk. The kite game: hold to
pull the line in, release to let it out. It has a "Steady hands" assist and a skip.

Make it yours: name, hairstyle, skin tone and favourite colour. Graphics: Full detail, or
Light for phones (the default on phones). Language: English, Tiếng Việt or 한국어 (it follows
your browser at first). Reduced motion, large text, conversation close-ups, sound and music
are in Pause.

## Development
Node.js 22 or newer.

```sh
npm ci
npm run dev          # http://127.0.0.1:5173
npm test             # rules, saves, endings, content, beats, navigation, features, gait, vi/ko packs (48 tests)
npm run build        # type-check, bundle, write dist/release.json
npm run preview
```

Browser checks (Playwright; `GPU=1` uses the hardware GPU through ANGLE; `BROWSER=webkit`
runs Safari's engine for iPhone/iPad behaviour). The scripts default to port 4263:

```sh
npm run build && npx vite preview --host 127.0.0.1 --port 4263 --strictPort
GPU=1 node scripts/smoke.mjs                  # 19 end-to-end checks (also BROWSER=webkit)
GPU=1 node scripts/audit-mobile.mjs           # every screen at phone/tablet/PC sizes: tap targets,
                                              # text under 12 px, WCAG contrast, overflow (LANGS=vi,ko)
GPU=1 node scripts/capture.mjs                # screenshots of all 12 chapters
GPU=1 node scripts/perf.mjs                   # frame times, draw calls
GPU=1 node scripts/gait-probe.mjs             # do feet (and the baby's hands and knees) stay planted?
npx tsx scripts/balance.mts                   # 400 random lives: stats and endings
npx tsx scripts/textstats.mts                 # how much text each screen shows
node scripts/audit-ui.mjs                     # message sizes at PC resolutions
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
earlier 0.3 edition are left untouched; Kitehaven is a new story and begins fresh. Your kite
design is saved beside the log. Finished lives and every choice you've made are kept in a
separate album (`choice-of-life-album`) that survives beginning a new life.

## Publishing
SSH origin: `git@github.com:buicongnguyen/Choice_of_life_3D.git`. Pushing to `main` runs the
tests and the production build, then deploys `dist` to GitHub Pages. `/release.json` contains
the deployed commit. To roll back, revert the commit and push; don't rewrite history.
