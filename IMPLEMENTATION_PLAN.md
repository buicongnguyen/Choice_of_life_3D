# Choice of Life 3D — redesign and implementation plan

Date: 2026-09-10. Target: a complete, compact 3D life adventure in an independent repository.

## 1. Evaluation of the 2D foundation

Reference repository: `../Choice_of_life`, inspected at `7e10f03`.
The older `CHOICE_OF_LIFE_AAA_UPGRADE_PLAN.md` and `PHASE_0_BASELINE.md` provide the product history and recorded defects. The current code confirms a title → setup → ready → stage-start sequence; the ready screen exposes deterministic state and the runner laboratory to ordinary players. This delays the first meaningful action and makes the game feel like a collection of development screens. The prior measured production payload was about 102 MB, mostly character atlases. Its audit records cosmetic-only horizontal movement, identity continuity problems, inconsistent stage presentation, and large orchestration/view modules. Previously fixed defects must not be described as newly reproduced bugs.

The strongest retained ideas are the three life outcomes, recurring people, age progression, optional life routes, and choices with delayed consequences. Merely changing the renderer would leave the interaction and story problems intact.

## 2. New product direction

Working title: **Choice of Life — Little moments. A whole life.**

Make an explorable, miniature 3D storybook world. A fixed, friendly isometric camera frames a small room or garden. Move freely on the ground, tap destinations, discover objects, and approach people. Every chapter contains two short encounters, optional discoveries, and a visible gate to the next age. Chapters progress when the player is ready; there is no time pressure while reading.

The story follows the player, Mum, Dad, childhood friend Rowan, teachers, colleagues, and a chosen partner or community. A blue keepsake tin connects childhood curiosity to adult identity and retirement. Earlier choices return explicitly in later dialogue and the final memory book.

Only Health, Happiness, and Money are numeric life outcomes. Money means security, not literal currency. Careers, learning, support, relationships, and memories are named facts. Appearance never changes opportunity quality.

The first release is a complete stylized 3D edition with compact authored chapters. Commercial/AAA polish is a quality direction, not a claim that this first release has the budget, animation, or content depth of a large studio game.

## 3. User experience

- One Play action starts a new life directly with sensible defaults; optional character and pace settings live on the title screen.
- Continue resumes the last saved chapter and completed interactions.
- Movement: WASD/arrows, click/tap ground, and a four-way touch pad. Both axes affect the actual world position and interactions.
- E/Space interacts with the closest person or discovery. Clicking a person approaches and interacts automatically.
- An Explore list supplies a keyboard-friendly and low-dexterity path to every point of interest.
- Encounters pause movement and display two or three clearly labeled options. Immediate score changes and narrative hints appear before selection.
- A chapter objective shows completed encounters; optional discoveries are explicitly optional.
- A memory journal records what happened and provides the emotional reward for exploration.
- Pause, sound, reduced motion, title, and save status remain discoverable. No developer jargon belongs in the normal Play flow.
- Portrait and landscape layouts reserve separate space for dialogue and keep the 3D avatar visible.

## 4. Art and Blender pipeline

Use Blender 4.5 LTS in background mode with a checked-in Python authoring script. Produce editable `.blend` sources and runtime `.glb` files. Three.js loads those GLBs with GLTFLoader. Assets must be actual meshes, with real perspective, lights, and shadows.

Style: rounded low-poly clay/storybook shapes, warm timber, cream, sage/teal, coral, and golden sunlight. Cute characters use oversized heads, black eyes with highlights, rosy cheeks, small hands/shoes, hair silhouettes, and separate limb pivots. Male/female models and stage scaling remain explicit. Clothing meshes are opaque; mesh dimensions do not change during walking. Adults use job colors and visible profession accessories. Baby uses a seated rig. Older adults get gray hair and a slower gait.

Create six modular dioramas: nursery/home, school, campus/workshop, workplace, neighborhood/home, and legacy garden. All twelve chapters reuse these deliberately with different cast, palette accents, discoveries, and story. Reuse the original game's art direction and narrative themes; do not copy its entire atlas collection into the 3D runtime. The existing 2D art remains reference material; it cannot become a fully rigged 3D model through format conversion.

Geometry rules: ground is Y=0 in Three.js, assets use Blender Z-up before glTF conversion, foot origins sit at ground level, collision rectangles come from authored prop placement, and walking paths remain clear. Furniture sits at room edges; trees and walls frame the action. Record generated model counts and file sizes. Model roots and limb names form a stable animation contract.

## 5. Twelve chapters and authored content

| Chapter | Location | First encounter | Second encounter / consequence |
|---|---|---|---|
| 1. A small beginning | Nursery | Mum responds to comfort, curiosity, or routine | Dad introduces the blue keepsake tin |
| 2. A bigger little world | Home/playroom | Rowan needs help finding a toy | Explore, rest, or share a small discovery |
| 3. The first school day | School | Welcome a lonely classmate or join an activity | Teacher notices curiosity or kindness |
| 4. Finding your people | School | Rowan invites the player to a club | Balance friendship, practice, and family |
| 5. The exam season | School | Prepare intensely, steadily, or support family | A mentor offers a way forward for every grade |
| 6. A road of your own | Campus/workshop | University, practical training, or direct work | Choose a field: care, craft, technology, or enterprise |
| 7. Your first badge | Workplace | A qualified career follows the field | Overtime, boundaries, or helping a colleague |
| 8. Someone to come home to | Neighborhood | Meet several distinct partner candidates or stay single | Build a home around partnership, friendship, or community |
| 9. The busy middle | Home | Parent needs support; work also needs attention | Ask for help, reduce work, or coordinate care |
| 10. What experience gives | Workplace | Mentor someone or pursue responsibility | Continue, change pace, or invest in community |
| 11. Room to breathe | Garden | Choose retirement rhythm | Rowan returns with a memory of childhood |
| 12. The things we leave | Garden | Open the keepsake tin | Choose a legacy; receive a personalized ending |

Each chapter has optional objects representing health, happiness, and security; each can resolve only once. A moving environmental inconvenience appears in suitable later stages, is forgiving, and can affect the player only once per chapter. Exploration must not turn into infinite score farming. A zero score never ends the story; supportive choices and optional discoveries remain available. Optional discoveries never gate the story.

## 6. Story and consequence design

Every choice stores an immutable record: chapter, encounter, option, actual score delta, memory text, and named facts. Later encounters read those facts. Examples: a comfort memory changes Mum's later dialogue; study changes the education introduction; education changes a job title; Rowan remembers shared play; career boundaries return during caregiving; final pages name the selected partner and vocation.

No path requires university, marriage, children, or maximum money. The player can choose a partner of the opposite gender in the initial declared relationship design, or pursue a single/community route. Distinct candidates have stable identity, different appearances, and dialogue. All options reach the full ending. There is no one combined life score.

## 7. Architecture

- `src/content.ts`: typed chapter/encounter/discovery data and contextual writing.
- `src/core.ts`: pure state transitions, validation, choices, chapters, biography, and save codec.
- `src/world.ts`: Three.js scene, GLB loading, real movement, animation, collision, raycasts, and effects.
- `src/main.ts`: semantic HTML UI, input coordination, audio, lifecycle, and persistence adapter.
- `src/style.css`: responsive shell and accessible controls.
- `art/build_assets.py`: deterministic Blender source and GLB generation.
- `scripts/smoke.mjs`: bounded desktop/mobile runtime checks and screenshots.

Separate render state from saved domain state. Use fixed-step movement with capped catch-up. Save after every choice/discovery/transition, and save position at a throttled interval. Save schema uses a separate `choice-of-life-3d-v1` namespace; invalid data is preserved until the user explicitly starts a new life. Never overwrite the original 2D game or its saves.

## 8. Implementation phases and completion gates

### A. Foundation and reviewed redesign
Deliver this plan, isolated Vite/TypeScript/Three.js project, asset authoring script, git ignore rules, and release workflow. Review the plan for scope contradictions. Gate: a clean production build with a real Blender-exported scene.

### B. 3D interaction and first chapter
Deliver camera, lighting/shadows, grounded avatar, solid prop collisions, two-axis movement, click/touch approach, clear Play, pause, and first dialogue. Gate: title → Play → both nursery encounters → next chapter works on keyboard and mobile.

### C. Whole-life story
Deliver twelve chapters, recurring cast, meaningful options, education/career/home facts, discoveries, journal, ending, and repeat-safe saves. Gate: every option is valid and every chapter reaches the ending; refresh cannot duplicate a reward.

### D. Character and visual polish
Deliver distinct gender/hair/clothes, baby and senior presentation, six decorated dioramas, walking/talking motion, particles, warm light, and coherent UI. Gate: real 3D models appear on every stage, feet stay grounded, people are recognizable, no missing GLB or transparent clothing.

### E. Usability and focused review
Deliver portrait/landscape layout, reduced motion, sound toggle, Explore navigation, real-time save notices, loading and WebGL errors. Do one code/logic review and a bounded end-to-end pass. Gate: build and focused core tests pass; desktop/mobile primary flows work; fix discovered blockers.

### F. Publish
Create `buicongnguyen/Choice_of_life_3D`, use an SSH origin, commit coherent work, push main, enable GitHub Pages Actions, verify exact deployed SHA and primary flow. Deliver playable URL, source URL, plan, actual limitations, and asset rebuild commands.

## 9. Plan review and revisions before implementation

1. A full open world would multiply art, pathfinding, and narrative scope. Use small connected dioramas and direct chapter transitions.
2. A new 3D runner would retain automatic-motion pressure and reading conflicts. Use self-paced exploration while preserving life choices and three outcomes.
3. Converting hundreds of 2D sprite poses is not an efficient character pipeline. Build a small real 3D rig family whose limbs animate continuously.
4. A screen-space pad with cosmetic motion would repeat the old defect. Both axes must use the same ground-space simulation as collisions and proximity.
5. Deep branching can create unreachable endings. Use a shared chronological backbone with facts that alter dialogue, career, relationships, and biography.
6. Cinematic cutscenes can hide the player on mobile. Reserve a separate bottom dialogue region and resize the camera to the remaining playfield.
7. Exhaustive seed matrices previously slowed delivery. Run small, relevant state tests and one complete-life browser pass; do not reproduce the 120,000-run pipeline.
8. Unbounded polish cannot be a release definition. Ship this compact complete edition, label its limitations, and keep advanced animation, voice acting, large job packs, and more locations as follow-up work.

## 10. Quality budgets and review

Initial budgets: GLB assets under 12 MB total, per-scene draw calls under 500, DPR capped at 1.5, small shadow maps, no post-processing chain, fixed-step simulation, compressed production JS under 300 KB target. Record actual figures rather than silently claiming they pass. Use instancing/merged static materials if an observed bottleneck warrants it.

Required logic checks: clamped finite scores, choice idempotency, age/chapter progression, all authored options reachable, no repeated discovery/hazard farming, stable identity, valid save shapes and bounded arrays, all full-life routes end. Required UI checks: Play, Continue, keyboard movement, real collision, NPC approach, choices, pause, settings, journal, portrait, landscape, restart and reload.

Review screenshots at 1280×800 and 390×844, and the smallest layout at 320×568. Keep feedback concrete: missing avatar, clipped button, unreadable text, covered player, wrong pose, unresponsive control, inconsistent score, unreachable action. A screenshot demonstrates appearance, not animation or route correctness.

## 11. Follow-up after the first 3D release

Human playtesting should answer: can the player enter the world immediately; do movement and interaction feel natural; can they name one consequence of a previous choice; which chapter feels repetitive? Prioritize fixes based on those answers. Subsequent releases may add Blender armature clips, more facial expressions, authored career meshes, deeper spouse conversations, indoor/outdoor transitions, more meaningful discoveries, localization, and accessibility narration. Do not claim those features exist before implementing them.

## Technical references

- [Three.js documentation](https://threejs.org/docs/) — runtime scene and rendering APIs.
- [Blender 4.5 LTS](https://www.blender.org/releases/4-5/) — authoring runtime.
- [Blender glTF export manual](https://docs.blender.org/manual/en/4.5/addons/import_export/scene_gltf2.html) — GLB export pipeline.
