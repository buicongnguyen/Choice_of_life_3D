# Adapting Subway Surfers' left/right lanes to Kitehaven

## 1. What Subway Surfers actually does (research)

- **Auto-run forward** on a fixed 3-lane track; the player never controls forward speed.
- **Swipe left/right** snaps instantly to an adjacent lane (a discrete step, not analog
  strafing). Swipe up jumps, swipe down rolls.
- **Obstacles** (trains, barriers) are the entire game: dodging them *is* the gameplay, and
  hitting one ends the run.
- **Coins** line the lanes; **power-ups** (jetpack, magnet, sneakers, 2x, hoverboard-as-extra-life)
  are the meta-progression.
- **Camera** sits close behind the runner and leans into each lane change for readability and
  juice.
- **Design goal:** a control scheme so simple (one axis, one gesture) that the *reading* of the
  scene — which lane is which, where the obstacle is — is never in doubt. That legibility, not
  the running, is the part worth borrowing.

Sources: [Subway Surfers gameplay](https://www.blog.udonis.co/mobile-marketing/mobile-games/subway-surfers), [Subway Surfers Wiki — Power-Ups](https://subwaysurf.fandom.com/wiki/Power-Ups).

## 2. What does *not* transfer, and why

Kitehaven is a talk-to-anyone, explore-at-your-own-pace story game: twelve dioramas, each with
several people, discoveries and an activity, reachable in any order within a free-time budget.
Porting the genre wholesale would mean:

- **auto-run** — incompatible with "talk to whoever you like, in whatever order";
- **fail-on-collision obstacles** — Kitehaven's dioramas are *furniture*, not hazards; bumping a
  bench should never end a life;
- **coins/score/power-ups** — there is no meta-currency here, and inventing one would be a
  different game.

So this plan borrows the **legibility of the control scheme** (a small number of parallel,
screen-aligned lanes you step between) and leaves the arcade systems out.

## 3. The adaptation: lane-stepping as the default ground control

- **Lanes are screen-relative, not world-X.** Kitehaven's camera is fixed isometric
  (`DIR`/`RIGHT`/`AWAY` in `world.ts`). Lanes are built along `RIGHT`, so on screen they always
  read as straight parallel tracks receding into the distance — the actual Subway Surfers look —
  regardless of which way a given diorama happens to be modelled in world space.
- **A/D or ←/→ (keydown edge, not held) steps one lane**, tweened over a few frames at a snappy
  lateral speed, with a small sideways lean for juice. Holding the key doesn't repeat-step (a
  real swipe is one gesture); this matches the genre and avoids turning exploration into a blur.
- **W/S (or the stick's forward axis) stays continuous**, exactly as before — this is still a
  walk-up-and-talk game, not an auto-runner, so forward motion must stay under the player's
  control.
- **Touch:** the existing thumb-stick's left/right axis becomes edge-triggered the same way
  (crossing a threshold, with hysteresis so it doesn't re-fire while held over); its forward axis
  is unchanged.
- **Tap-to-walk is untouched.** Clicking the ground or a person still frees-roams exactly as
  before via the existing pathfinder — lanes are a locomotion *aid* for keyboard/touch players,
  never a hard constraint on where you can stand.
- **Readability payoff:** a dashed lane guide on the floor (new Blender prop, see §4) and a
  snappy, discrete step make it immediately legible which lane you're in and that you moved,
  which is the actual thing "hard to observe" was pointing at.

## 4. Assets (Blender, `art/kitehaven/scenes.py` → the shared `props` pack)

Two new props, each a single merged mesh (one draw call per instance, matching how every other
prop in the pack is built):

- `Prop_lane_track` — a dashed strip along local Z (the lane's length), toy-styled, glowing
  softly so it reads at a glance without fighting the floor art.
- `Prop_lane_marker` — a small chevron/arrow pair at a lane's near and far ends, hinting the
  travel direction the way Subway Surfers' lane dividers do.

Runtime instances them per scene (one `lane_track` + two `lane_marker`s per lane, 5 lanes), laid
out along `RIGHT`/`AWAY` so they match the lane maths exactly. Indoor scenes keep the guides but
dimmer, since they're smaller rooms where the lanes matter less.

## 5. Execution

1. `src/navigation.ts` — `LANES` (five screen-relative offsets along `RIGHT`), `laneIndexNear`.
2. `art/kitehaven/scenes.py` — the two new props; rebuild with `--only props`.
3. `src/world.ts` — lane state, edge-triggered stepping (keyboard + pad), lane-tweened lateral
   movement composed with the existing continuous forward/back, a lean for juice, and the guide
   props per scene.
4. Tests: `src/navigation.test.ts` (lane maths), a smoke check that stepping a lane actually
   moves the player and that forward walking still works exactly as before.
5. Docs/i18n: a one-line control hint (English, Vietnamese, Korean).

## 6. Acceptance

- `npm test`, `npx tsc --noEmit`, the production build, and the full Playwright smoke suite all
  pass unchanged (existing flows — talk, discover, hunt, activities, exits — use tap-to-walk and
  are untouched).
- A new check confirms A/D steps exactly one lane per press and that holding the key doesn't
  repeat-step; W/S keeps moving continuously throughout.
- Visual screenshots of the lane guides in an outdoor and an indoor scene.
