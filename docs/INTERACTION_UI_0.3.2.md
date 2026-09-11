# Automatic pickup and compact choices — 0.3.2

## Behavior

- Walk within 1.25 world units of a collectible to pick it up. The ground between
  player and item must be clear; objects cannot be collected through furniture.
- Only ordinary discovery items auto-collect. People, activities, guests and exits
  still require a deliberate interaction or a destination selected in Explore.
- Pickups update the score display, journal count, save and a short notification.
  They do not rebuild the UI or clear held keyboard/touch movement. If the item was
  the explicit destination, its route ends; unrelated routes continue.
- Paused, loading, dialogue and ending states cannot collect. Existing discovery
  IDs make rewards idempotent across frames and save/reload. The activity anchor
  (discovery slot 1 in old saves) is never collected automatically.

## Compact UI

- All 24 decisions have an authored short question and three short option labels.
  Option ordering, effects, facts, requirements and journal memories are unchanged.
- Health, Happiness and Money effects remain visible as matching icons and values,
  with descriptive accessible names. Full explanations and context remain under
  **More details**. Locked partner options visibly say **Meet first**.
- Dialogue cards are at most 680 CSS pixels wide and 46% of viewport height,
  constrained further on short screens. They reserve space for the 3D scene.
- Mobile choices use short rows; expanded details scroll inside the card rather
  than covering more of the scene. Text is not ellipsized or hidden behind clipping.
- Briefings, activity instructions and response panels are also shorter. Full
  responses remain expandable and journal entries retain the complete story.
- Large-text settings remain supported. Keyboard focus now includes expandable
  summaries; choice buttons keep mobile-friendly hit areas.

## Focused review

- Checked the collection callback against render/input resets, duplicate rewards,
  pending routes, pause guards, line-of-sight and the optional activity slot.
- Checked all short labels against the original option meanings and dynamic work
  and friendship variants. No changes to life progression or saved facts.
- `npm test`: 19 focused tests pass, including all short-copy entries and pickup
  obstruction/range checks. Production TypeScript/Vite build passes.
- `node scripts/interaction-smoke.mjs`: isolated mobile checks for held movement
  through pickup, one saved reward, nursery choices at 390×844 and 375×667,
  expandable details, compact responses and locked guest choices. Results are in
  `docs/interaction-smoke-result.json`; local screenshots are ignored in Git.
- This is an emulated-browser layout/interaction check, not a physical-phone
  performance benchmark or a long all-chapter gameplay run.

Only the 3D repository is changed. Existing 2D/v4/v5 references remain untouched.
