# Choice of Life 3D — detailed game design

Design revision: 11 September 2026. Target: the 0.1.1 refinement release.

Story amendment, 0.3.0: [`docs/STORY_EXPERIENCE_PLAN_0.3.0.md`](docs/STORY_EXPERIENCE_PLAN_0.3.0.md) supersedes the activity/reward/UI rules below where they differ. It adds optional activity boards in all twelve chapters, two ordinary +1 discoveries per room, reduced positive conversation rewards, supported tuition and interest-based opportunities, direct guest introductions, partner continuity, persistent briefings/responses, a keepsake shelf/journal and chronological ending. Existing chapter gates, movement, collider footprints and canonical conversation IDs remain. Old saves migrate additively; no historical score or memory is rewritten. Legacy puddle records remain readable, but the repeated puddle is no longer spawned. Career locations use the existing room kit with a sign/props; these are not entirely new Blender environments. The older sections below retain the original map and system contracts.

Art amendment, 0.2.0: [`art/ART_DIRECTION.md`](art/ART_DIRECTION.md) specifies the rebuilt, detailed Blender models, embedded surface textures, shared calibrated lighting and close-up asset viewer. The map, progression, scale and save contracts below remain unchanged. The previous flat-clay surface treatment is superseded by that art amendment.

This is the implementation contract for this repository, not a promise of an AAA-sized production. `IMPLEMENTATION_PLAN.md` records the original conversion plan. This document refines it into concrete UI, map, movement, activity, story, and reliability rules. Sections 1–9 define this release; section 10 is explicitly future work.

## 1. Experience and scope

A warm, miniature 3D life adventure: explore a small place, meet familiar people, make a meaningful decision, and see that decision remembered later. A complete life contains twelve self-paced chapters. The game is about trade-offs, not finding one perfect life or maximizing a single score.

- Preserve the original idea of Health, Happiness, and Money, but replace scrolling lanes with freely explored Blender dioramas.
- Make the next action obvious without covering the player with UI.
- Keep choices untimed. Reading, pausing, and changing tabs must not cause a penalty.
- Reward attention with optional discoveries, without requiring collection before progression.
- Let education, work, relationships, and family care affect both outcomes and remembered facts.
- Keep the original 2D repositories unchanged as references. This game has its own repository, deployment, assets, and save key.

### Core loop

`Enter chapter → explore → meet two people → choose once per conversation → optional discoveries → golden doorway → next chapter → final biography`

Two story moments are required per chapter. Each has three mutually exclusive choices. All three discoveries are optional. The doorway never starts a new chapter automatically just because the second conversation ended; the player decides when to leave. No lives, countdown, compulsory grinding, or purchase systems.

Expected pacing is a design target, not measured retention: approximately 1–3 minutes per chapter and 20–35 minutes per life for a first-time reader. Explore auto-walk supports a faster, low-dexterity path through the story.

## 2. UI design, screen by screen

### 2.1 Visual language

Use cream paper, dark teal text/buttons, coral for Health, warm gold for Happiness, and muted teal for Money. Serif chapter headings and restrained sans-serif controls keep the storybook feeling. Keep the existing rounded, softly lit clay dioramas. Decorative animation must not move or rescale the whole avatar.

Information priority: player and navigable floor → current people/objective → interaction action → three outcomes → chapter progress → secondary settings. Decorative copy is lower priority than usable controls.

### 2.2 Title

| Element | Behavior and detail |
| --- | --- |
| Main action | Play your story, or Continue your story when a valid save exists. Disabled until initial models load. One activation starts one load. |
| New life | Secondary when a save exists. Explicit replace confirmation; closing it preserves the save. |
| Make it yours | Name up to 24 characters; male/female body; four skin tones; Gentle/Normal/Brisk movement. Identity affects appearance, not opportunity or scores. |
| World | Show the nursery as a real rendered diorama, not an unrelated illustration. |
| Feedback | Loading, retryable asset error, saved chapter, and unreadable-save warning are separate states. Never claim saving succeeded after a storage failure. |
| Preferences | Sound off by default; reduced motion follows the device until explicitly changed. Persist separately from life progress. |

The new-life action is intentionally separate from Continue; editing the setup does not silently replace the current saved character.

### 2.3 Playing HUD

- Top: chapter number, broad age range, chapter name, location, and three 0–100 outcomes.
- Below the heading: twelve chapter marks and a two-moment objective. Also expose the optional discoveries count (0–3) so activities are discoverable rather than unexplained floating tokens.
- Ground-level labels identify people and rewards. Resolved people remain in the scene but are no longer active conversation targets.
- Bottom left: a four-direction pad; bottom right: a contextual Talk / Discover / Next chapter button. Each pad cell must be at least 44 × 44 CSS pixels on every supported breakpoint. Desktop and mobile share the same movement rules.
- Footer: Explore, Memories, save status, sound, pause. Money means financial security, not a bank balance in a real currency.
- Nearby interactions use a maximum 1.55-world-unit reach and cannot pass through furniture. The player does not have to overlap a person to speak.
- Short feedback reports the actual score change after clamping. A score already at zero is “at minimum,” not “full.” Keep discoveries and choice memories available in the journal when a toast is missed.

### 2.4 Choice panel

Anchor the panel below the scene, never centered over the avatar. Pause the simulation before it opens. Contents: speaker and role, relevant earlier-choice context, present dilemma, three choices with hints and exact immediate changes, and a close action that returns to exploration without choosing.

- Desktop: three choice cards across when width permits.
- Phone: stack cards, allow panel scrolling, and reserve a separate visible scene above it.
- Measure the actual panel top and header bottom to reserve the scene viewport; do not assume every dialogue has the same height.
- Retain story context on short screens instead of hiding it. Essential prompt/context text must remain readable and scrollable.
- Move keyboard focus into the dialog; keep background controls inert until it closes; return focus to the originating control when possible, otherwise the chapter heading.
- No input from the world or another footer action may leak through an open modal.

### 2.5 Explore, Memories, Pause, Ending

Explore lists unresolved people, uncollected discoveries, and the doorway when unlocked. Selecting an entry closes the panel, walks to a reachable interaction position, then interacts. Failed routing gives feedback and does not leave a stale pending interaction.

Memories lists newest first: chapter, choice/discovery title, and a short description. It preserves actual decisions even when an outcome reached its cap.

Pause freezes movement, hazards, idle animation, and auto-walk. It offers resume, motion/sound settings, and save-and-return-to-title. Its saving message must reflect storage availability. Browser blur/hidden also pauses; returning focus does not auto-resume.

Ending appears only after the final doorway. Show the character name, three separate outcomes, a personalized biography, the complete memory book, and an explicit new-life action. Do not grade the player as a good or bad person.

### 2.6 Responsive layout contract

| View | Layout refinement |
| --- | --- |
| Desktop, over 700 px wide | Horizontal header and outcome cards; centered diorama; three-column choices; peripheral controls. |
| Portrait, 320–700 px | Stacked compact header; full-width outcome strip; three-row choices; 44 px minimum movement targets. |
| Short landscape | Compact header; scrollable bottom dialogue; hide decoration, not causal story text; keep the scene and actions separate. |
| Large text / zoom | Re-measure dialogue/header and allow scrolling inside panels. Avoid clipping buttons or changing game state on resize. |

Do not rotate the camera or change the avatar scale when the viewport changes. Resize the orthographic view instead. Landscape phones will show a smaller diorama while reading; larger character portraits/close-up camera framing remain future work.

## 3. Map size and spatial rules

### 3.1 Coordinate system

One unit is a stylized world unit, approximately one meter for planning, not a realistic body simulation. X runs across the room, Y is height, Z is floor depth. An adult is roughly 2.5 units tall in this exaggerated clay style.

| Quantity | Exact contract |
| --- | --- |
| Diorama base | 13 X × 9.8 Z units |
| Floor mesh | 12.9 × 9.7 units |
| Walkable center bounds | Strictly inside X ±5.85 and Z ±4.05: 11.7 × 8.1 units before furniture |
| Player clearance | 0.24 units added to each furniture half-extent; same across stages for predictable routes |
| Spawn | X 0, Z 2.6; must be free in every room |
| Primary people | Person 1 at (−2.2, −0.7); person 2 at (2.2, −1.25) |
| Discoveries | Health (−3.1, 0.9); Happiness (0, 1.6); Money (3.3, 0.6) |
| Doorway | (5.2, −0.3), reachable without passing through a solid |
| Navigation grid | 0.35-unit spacing; four cardinal neighbors; clear segment checks |
| Manual interaction reach | 1.55 units, with clear ground between both points |
| Auto-walk arrival | Within 1.25 units, with a clear segment; stop before entering the person |

Room perimeter furniture creates landmarks while leaving the center clear. Tables, benches, crib, sofa, planters, tree trunks, plant pots, and toy blocks are solid where they meet the floor. Raised canopies are not full-width ground obstacles. Collision metadata must match `art/build_assets.py`, not be guessed from the scene image.

### 3.2 Scene families

| Room | Chapters | Main landmarks and navigation considerations |
| --- | --- | --- |
| Home | 1, 2, 9 | Sofa and crib at rear, central rug, corner plants and toy blocks. Keep lower-center spawn and rug crosswalk open. |
| School | 3, 4, 5 | Four perimeter desks, rear chalkboard, central reading mat. Classmates use the player's age scale. |
| Campus | 6 | School-family geometry with different mat; two advisers. A dedicated campus model is future art work. |
| Office | 7, 10 | Rear desks/monitors, side bench and plants. Center must remain accessible for career conversations. |
| Town | 8 | Small house, benches, planters, paths, three candidate guests. Distinguish social guests from the two interactive hosts. |
| Garden | 11, 12 | Fountain, benches, planters, trees, separate stepping stones. Walk between stones at grass height, not as if over an invisible raised strip. |

### 3.3 Grounding and camera

Indoor floor top Y = 0.10; home rug = 0.16; school/campus/office rug = 0.15. Outdoor grass = 0.06; path = 0.105; individual stone tops = 0.14. Stone centers are integral X positions from −5 to 5, width 0.72 and depth 0.55 at Z 1.65. Grounding must check both X and Z, including the gaps.

Avatar root height = local floor top minus `0.03 × stageScale` to account for the authored foot baseline. Rewards, cats, and doorway anchors also use the local surface. Only reward objects may gently float above their ground halo; people must not bob or scale while moving.

Fixed orthographic camera at (10, 14, 18), looking at (0, 0.2, 0). Vertical span is `max(10.8, 17.8 / aspect)`. No orbit, zoom input, perspective size change, or camera shake. Pixel ratio capped at 1.5; soft shadow map 1024².

## 4. Movement specification

### 4.1 Inputs and speed

- WASD / arrows and pad refer to screen directions, transformed to the floor: right = (0.874, −0.486), down = (0.486, 0.874).
- Normalize combined input so diagonals are not faster. Opposite directions cancel.
- Gentle = 2.35, Normal = 3.0, Brisk = 3.8 world units/second. These are movement preferences, not difficulty or hidden outcome modifiers.
- Keep those speeds available at every age; older players are not forced into slower controls. The newborn uses its authored seated/scooting body, not an adult scaled down.
- Simulate at 60 fixed steps/second; cap catch-up to 0.1 seconds after a stalled frame. Never charge the player for time spent away from the tab.

### 4.2 Collision and routing

Manual movement slides along a blocked axis. Walking animation must use actual traveled distance, not merely a held key: pushing into a wall should stop the feet. Gait cadence follows distance and body scale. Keep scale fixed for the entire chapter; turn using shortest-angle interpolation, without lateral root sway.

Tap-to-walk accepts a deliberate press/release with no more than 10 CSS px drift. A drag or canceled touch is not a destination. A new manual direction or destination cancels the previous route.

Routing joins the exact start and target to nearby reachable grid nodes, checks connecting segments, and checks every route edge. Do not round a valid target into a blocked grid cell and report failure. A loaded position inside furniture or beyond walkable bounds recovers to the nearest free floor point; if necessary use the known spawn. No teleport during ordinary play.

Only one touch owns the direction pad at a time. Releasing an unrelated second finger must not stop the first finger. Modal open, chapter load, blur, pointer cancel, and lost pointer capture all release movement safely.

## 5. Activities and consequence rules

### 5.1 Activity types

| Activity | Entry | Resolution | Consequence |
| --- | --- | --- | --- |
| Conversation | Reach an unresolved person | Choose one of three untimed options | Apply bounded outcome changes, one fact, one memory; cannot repeat |
| Discovery | Reach an uncollected reward | Interact once | +4 to its outcome, limited by 100; one chapter-specific memory |
| Minor hazard | Touch the visible purple puddle | Once in chapters 3–10 only | Up to −3 Health, no repeated damage or game over; disappears |
| Chapter transition | Both conversations resolved, reach doorway | Explicit interaction | Save next chapter with a fresh safe spawn; load matching room/body |
| Reflection | Final doorway | Ending and memory book | Read actual selected life, no fabricated partner or profession |

Discoveries represent short activities abstractly; a ball may represent exercise and a coin may represent budgeting. Do not claim a minigame occurred. Physical object labels should fit their mesh: for example, the apple should not be called a water bottle. Richer activity animations are future scope.

### 5.2 Chapter-by-chapter design

| # / age | Stage / scale | Required decisions | Optional activity intent | Later consequence |
| --- | --- | --- | --- | --- |
| 1 / 0–2 | Nursery / baby 1.00 | Mum: comfort, curiosity, rest. Dad: keepsake star, stone, coin. | Blanket, rattle, first savings. | Beginning recalled by Mum; keepsake returns in legacy. |
| 2 / 3–5 | Toddler / 0.62 | Rowan: friendship response. Mum: nature, making, organising. | Apple, missing toy boat, saved coins. | Rowan remembers friendship; boat returns in retirement. |
| 3 / 6–9 | First school / 0.70 | Maya: inclusion style. Ms Lin: garden, invention, stall. | Snack, storybook, lunch savings. | Memories establish learning and social identity. |
| 4 / 10–14 | Clubs / 0.80 | Rowan: arts, sport, technology. Dad: rest, friends, practice. | Exercise, invitation, saving by repairing. | Familiar friendship context and personal priorities. |
| 5 / 15–18 | Exams / 0.92 | Ms Lin: intense study, balance, paid work. Rowan: keeping contact. | Lunch break, friendly note, weekend earnings. | Grade changes adviser context; promise changes reunion. |
| 6 / 18–24 | Education / 1.00 | Alex: university, training, on-job learning. Noah: care, technology, enterprise. | Walk, idea, bursary. | Both facts determine profession; either conversation order is valid. |
| 7 / 25–32 | First career / 1.00 | Sam: ambition, steady work, helping. Maya: overtime, balance, caring. | Walk, welcome, savings. | Profession styling; boundaries referenced in midlife. |
| 8 / 33–40 | Home / 1.00 | Jamie: get to know Avery, Quinn, Morgan. Dad: partnered, independent, community home. | Garden, music, housing security. | Future biography reflects home choice. Dad can discuss a *future* partner before introductions. |
| 9 / 41–50 | Midlife / 1.02 | Mum: time, funded support, care network. Sam: promotion, lighter work, flexibility. | Rest, photograph, household budget. | Callbacks to childhood comfort and early boundaries. |
| 10 / 51–60 | Experience / 1.02 | Leah: mentor, guide, connect. Sam: final project, part-time, community. | Stretch, thank-you, pension contribution. | Memory book records what experience gave others. |
| 11 / 61–72 | Retirement / 0.98 | Jamie: garden, travel, creativity. Rowan: remember, new memory, pass on boat. | Herbs, novel, savings review. | Reunion reflects the earlier promise. |
| 12 / 73+ | Legacy / 0.95 | Rowan: people, work, ordinary days. Maya: belonging, knowledge, opportunity. | Sunlight, keepsake tin, gift. | Gift selects ending theme; complete biography and memories unlock. |

### 5.3 Fairness and story consistency

Start Health 65, Happiness 60, Money 45. Every effect is clamped to [0,100] and records its actual value. Money is a broad security resource: unaffordable choices do not create hidden debt or lock the story. This forgiving policy is intentional, not a realistic finance simulation.

Care + university → resident doctor; care + training → community nurse; care + on-job learning → care assistant. Technology → software engineer; enterprise → entrepreneur. Profession does not depend on gender or skin. Exams affect context, not a hard admission gate. Stress is represented by Health/Happiness trade-offs, not an undisclosed fourth score.

Both encounters may occur in either order. Text must not assume a choice has already happened within the same chapter. Choosing a person to know better does not force marriage: independent/community choices remain available. Three guest models represent possible opposite-gender partners, but only Jamie/Dad are interactive hosts in this release.

## 6. Character and asset contract

Use the existing twenty original Blender GLBs; do not replace them with generic icons or 2D sprites. Three articulated human bases (baby, female, male), one cat, six room families, ten reward props. Preserve opaque clothing materials and foot anchors. No runtime image generation or external model dependency.

Within a stage, body scale remains constant across idle, turning, moving, talking, saving, and reloading. Rowan/Maya at school use the player's stage scale; adult carers and teachers remain adult scale. Name-derived NPC appearance is stable across chapters; hair grays in later life. Clothing/accent colors distinguish people without implying morality based on skin tone.

Career visual support currently means shirt recoloring and a badge/clinical accessory, not a complete uniform catalogue. Baby locomotion is a seated scoot with small arm motion; convincing crawl and full skeletal animation require a separate art pass.

## 7. Save, input, and loading state machine

`Title → Loading → Playing ↔ Dialog/Paused → Loading next chapter → Ending`

- Store progress after choices/discoveries/hazards, every three active movement seconds, on pause/blur/pagehide, and before changing chapters.
- Never save an old room's coordinates over a new chapter's spawn while assets are loading.
- Save key remains `choice-of-life-3d-v1`; accept legitimate 0.1.0 saves.
- Validate bounded scores/identity/position, canonical IDs, valid option indices, completed earlier chapters, facts derived from choices, unique discovery/hazard IDs, and a well-formed matching memory for every recorded activity.
- Invalid saves stay untouched until explicit replacement. Storage failure leaves the game playable and clearly warns that progress may not persist.
- When restoring a save, correct an obstructed position against the current room colliders before resuming.
- Asset retry is available without discarding choices. Disable unrelated actions during loading. A late load completion must not undo a pause triggered by blur.

## 8. Code boundaries

| File | Responsibility |
| --- | --- |
| `src/content.ts` | Authored chapter, choice, and recurring story facts |
| `src/core.ts` | Pure outcomes, progression, biography, save validation |
| `src/navigation.ts` | Pure bounds, collision, segment, recovery, path, surface calculations |
| `src/world.ts` | Three.js model lifecycle, animation, picking, rendering and world events |
| `src/main.ts` | HTML presentation, input ownership, modal focus, loading and persistence |
| `src/style.css` | Responsive storybook visual language and control sizing |
| `art/build_assets.py` | Reproducible Blender geometry and matching collision metadata |

Rendering must not independently award outcomes; only pure core transitions do. UI reflects those transitions. Keep diagnostics read-only. Local assets and relative URLs must work under the GitHub Pages project path.

## 9. Release review and acceptance

This refinement prioritizes implementation and a small number of useful checks, not a large deterministic seed matrix.

1. Review all four gameplay modules and the twelve chapter definitions against this contract.
2. Fix routing, grounding, actual-distance gait, touch ownership, loading/save race, dialogue layout/focus, and narrative ordering issues.
3. Run focused pure tests for progression/save integrity and routes to every interaction in each of six room families. Include exact furniture-edge targets and obstructed save recovery.
4. Build production assets. Run a bounded browser review of title → choice → discovery → save/continue, plus phone dialogue/controls. The existing full-life smoke remains available, but is not necessary for every text edit.
5. Record findings and limitations in `docs/REVIEW_2026-09-11.md`. Commit changes, push `main` over the configured SSH origin, wait for Pages, and compare live `release.json` with the pushed commit.

## 10. Future improvements, not part of this release

Prioritize depth before map size: one tactile activity per age band, visible keepsake shelf, richer partner introductions, more career-specific rooms and wardrobes, and meaningful ambient NPC routines. Add chapter-specific prop models when symbols become confusing. A save export/import feature would protect long-lived stories from browser storage deletion.

An expanded release can introduce optional study/planting/cooking activities, callbacks based on discovery history, richer endings, a custom close-up dialogue camera, full character armatures, and an accessible nonvisual navigation mode. These need their own content/art budget and usability review. Do not silently add timed failure, combat, monetization, enormous maps, or mandatory quests in the name of “AAA.”
