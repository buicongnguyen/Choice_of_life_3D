# Mobile graphics detail — 0.3.1

## Player-facing behavior

Choose **Graphics detail** in the title screen's **Make it yours** section or the
in-game **Pause** menu. The two choices are **Low detail · faster on phones** and
**Full detail · richer visuals**. First-time coarse-pointer devices with a short
screen dimension at most 900 CSS pixels default to Low; a saved choice wins.

The setting is saved on this device, separately from the life save. Switching
saves the current life and position, then reloads the title to release the old
WebGL context and GPU resources. Press **Continue** to resume. An unstarted name,
gender, and skin selection are carried through a settings reload. If either save
write fails, the game stays open and explains the problem instead of reloading.

## Rendering profiles

| Feature | Low detail | Full detail |
| --- | --- | --- |
| Models | Simplified copies of all 20 models | Existing crafted models, unchanged |
| Materials | Constant colors, diffuse lighting | Textured physically based materials |
| 3D pixel ratio | Up to 0.85 | Up to 1.5 |
| Render-rate limit | 30 FPS | 60 FPS |
| Antialiasing | Off | On |
| Real-time shadows / reflection map | Off; simple character contact patches | On |
| Decorative particles / next-room prefetch | Off | On |
| Animated scene resize | Off | On |
| Gameplay, collisions, animations, UI | Same content and navigation | Same content and navigation |

Movement retains the same 60 Hz fixed simulation step in both modes; graphics
quality does not alter walking speed, rewards, or story choices. CSS text and
controls keep their normal resolution. Labels inside the 3D scene share its lower
resolution. The FPS figures are limits, not promises of performance on every phone.

Low-detail exports total **10,908,464 bytes** versus **18,446,868 bytes** for the
full-detail model set (about **41% smaller**). Their combined mesh triangle count
is **365,407** versus **482,531** (about **24% fewer**). A high-DPR phone draws about
68% fewer 3D pixels per frame at the same scene size, before the additional savings
from lower frame rate, simpler materials, and disabling the shadow pass. These are
asset/render budgets, not measured physical-phone FPS or battery-life improvements.

## Asset maintenance

`art/build_low_detail.py` opens existing crafted `.blend` sources, simplifies mesh
geometry, removes texture maps, and exports into `public/models/low/`. It does not
save or modify the source `.blend` files or replace the full-detail GLBs. Small
material groups retain their silhouette. Head and limb pivots and transforms are
preserved; both sets share `public/models/colliders.json`.

After rebuilding any crafted source, regenerate the low set:

```sh
blender --background --python art/build_low_detail.py
```

The asset gallery remains full detail. Runtime URLs retain the GitHub Pages base
path and package-version cache key. Missing low assets use the existing Retry
screen, not an automatic high-detail download that could overload the phone.

## Focused review

- Reviewed preference default/validation, title and pause controls, save failure,
  old preferences without a graphics field, actor recoloring, GPU material ownership,
  animation pivots, shared collision data, and frame-rate independence.
- Fixed over-aggressive room simplification found in visual review: collapsing
  already-batched architecture could remove parts of thin floors and walls. Rooms
  now use shape-preserving planar dissolve; characters and props use stronger
  simplification. The final budget numbers above reflect this safer asset set.
- Fixed a layout issue found in visual review: resizing cleared the canvas between
  capped frames. Resize now immediately repaints, and Low avoids animated resizing.
- `npm test`: 16 focused state, navigation, and graphics tests pass.
- `npm run build`: TypeScript and production build pass.
- `node scripts/graphics-smoke.mjs`: validates all 20 GLBs and animation pivots,
  checks a touch-phone nursery and adult office, movement, switching to Full and
  continuing at the saved position, retained adult decisions, and a blocked-storage
  case without discarding the running life. Captures are in ignored `docs/captures/`;
  compact evidence is in `docs/graphics-smoke-result.json`.
- Browser review is emulated, not a physical low-end Android/iPhone performance
  benchmark. No long seed simulation or all-chapter route is required for this change.

Only `Choice_of_life_3D` is changed. The 2D and v4/v5 reference repositories remain
untouched. Publication status should be checked against the deployed `/release.json`.
