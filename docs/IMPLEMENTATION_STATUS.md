# Choice of Life 3D — implementation and review

Date: 2026-09-10. First release: 0.1.0.

Update, 2026-09-11: the 0.1.1 detailed design and refinement are recorded in [`../GAME_DESIGN.md`](../GAME_DESIGN.md) and [`REVIEW_2026-09-11.md`](REVIEW_2026-09-11.md). The historical first-release evidence below is retained; the newer review covers navigation, missing collisions, grounding, gait, touch, modal layout, story order and save integrity.

## Completed phases

| Plan phase | Implemented result | Evidence |
|---|---|---|
| A — Foundation | Separate repository, detailed reviewed redesign, Vite/TypeScript/Three.js project, Blender pipeline | `IMPLEMENTATION_PLAN.md`, `art/build_assets.py`, build |
| B — Interaction | One-action Play, real two-axis movement, tap-to-walk pathfinding, furniture collision, nearby interaction, touch pad, pause | Desktop keyboard movement and automatic physical travel in smoke run |
| C — Whole life | Twelve chapters, 24 encounters / 72 options, recurring cast, education/career/home facts, discoveries, memory book, save/continue, ending | Full-life browser pass; all three choice-policy core traces |
| D — Presentation | Six Blender dioramas, male/female/baby/cat models, ten discovery models, editable sources, gait pivots, job accessories, gray hair, warm lights, grounded surface heights | Model manifest and chapter captures |
| E — Usability/review | Responsive UI, separate dialogue region, reduced motion, sound cues, Explore list, focused code/logic fixes | Desktop and mobile review, type check, four focused test groups |
| F — Publish | SSH repository and Pages workflow configured | Deployment identity is supplied by `/release.json`; final live result reported at handoff |

## Evaluation of the original

Source inspected: Choice_of_life at `7e10f03`. Visual inspection confirmed a text-heavy, panel-based title screen with several competing utility buttons. Source inspection confirmed four steps before nursery play: New life, setup submission, ready screen, stage start. The ready screen tells players about deterministic state and an optional runner laboratory. `runner-view.ts` changes horizontal CSS position without changing simulation coordinates. `PHASE_0_BASELINE.md` records a roughly 102 MB production payload dominated by atlas images. Its previously fixed bugs are historical findings, not claimed as current reproductions.

The 3D design addresses these issues through direct Play, actual two-axis ground movement, compact GLBs, one shared world renderer, an Explore menu, recurring characters, and a complete chronological story. It reuses the original three-score and life-consequence concept, while rebuilding the experience for free exploration.

## Findings fixed during implementation

1. **New chapter spawn overwritten by save.** A save after advancing copied the previous room's doorway position over the next chapter's starting position. Transition saving now preserves the reset position.
2. **Puddle interrupted automatic travel.** Rerendering the complete UI on hazard contact cleared the path. Hazard feedback now updates scores and notices without cancelling movement. The full-life browser pass subsequently completed.
3. **Effects could continue after a conversation opened within a simulation step.** The fixed-step update now exits when an interaction suspends gameplay.
4. **NPC identity depended on encounter slot.** Skin and hair now come from a stable person-name mapping, independent of whether that person is the first or second encounter.
5. **Overstated clinical qualification.** Direct work leads to Care assistant; practical nursing training leads to Community nurse; university leads to Resident doctor. The first badge does not imply immediate senior qualification.
6. **Floating feet over mixed surfaces.** Ground height now follows the authored floor, rug, path, or stepping-stone surface with a scale-adjusted foot offset. Sprite-scale tricks are not used.
7. **Canvas briefly cleared during layout animation.** Removing continuous playfield-size transitions avoids the repeated canvas clearing while opening dialogue.
8. **Model labels were tone-mapped.** UI sprite materials opt out of lighting tone mapping so foreground/background colors stay predictable.
9. **Mobile title joined words together.** Added real whitespace when changing line layout.
10. **Modal keyboard focus could escape after a rerender.** Tab navigation now returns to dialog controls even when focus temporarily lands outside them.
11. **Scores at the cap overstated rewards.** Choice previews and discovery notices show actual post-clamp changes.
12. **External font dependency.** Fonts and their licenses are local, and production CSS uses project-relative URLs.
13. **Roof geometry pointed inward.** Corrected the roof slope in the Blender authoring source and re-exported the scene.

## Bounded verification performed

- TypeScript production build passes.
- Four focused core-test groups pass, covering all three full-life choice policies, branch validity, idempotent choices/discoveries/hazards, save rejection, and content completeness.
- One complete production-browser life made all 24 choices and reached the personalized ending across all twelve chapters, after fixing the interrupted-travel bug.
- Newborn discovery and reload retained both completed encounters and the discovery.
- Mobile Play, automatic approach, conversation selection, pause, and 320×568 layout were exercised.
- Mobile dialogue bounds remain separate from the 3D playfield; no horizontal page overflow was found.
- The successful full-life run recorded zero page errors and zero failed HTTP responses.
- See `smoke-result.json` for machine-readable output. Screenshots are generated locally under `docs/captures/` and are intentionally excluded from Git history.

After the complete-life pass, the small foot-height and score-label refinements received a focused final visual/build check rather than a second full-life traversal.

## Measured scope and limits

- Runtime GLB files: 4,313,132 bytes across 20 models.
- Production artifact before release metadata: about 5.3 MB, including all six scenes and local fonts.
- Compressed JavaScript: about 175 KB (application and Three.js combined).
- Recorded final garden: 260 render calls and 112,852 triangles, including shadows. Recorded nursery: about 202 calls and 61,466 triangles.
- Browser checks ran in Chromium on this Windows machine with emulated mobile viewports. These figures do not establish frame-rate performance on a physical low-end phone or Safari.
- Scene models are loaded on demand, with the next scene prefetched. Loaded model geometry stays cached for the current game session.

## Honest remaining limitations

The first edition uses six room families across twelve chapters. Most content is exploration and choices; there are no deep profession mini-games. Clothes use color/accessory changes rather than a complete Blender uniform wardrobe. Partner candidates are visible and selectable but do not yet each have a separate conversation arc. Characters have mesh-pivot walking and subtle head motion, not full skeletal facial acting. Sound consists of short synthesized cues, not a composed music score. Keyboard and Explore controls are present; a dedicated screen-reader-only mode and physical-device accessibility audit are still future work. Score balance is forgiving and can saturate late in a life. Local browser storage is the only persistence; blocked storage displays a warning.

These are follow-up areas for playtesting, not hidden completion claims. The runnable twelve-chapter 3D game, plan, Blender sources, and deployment pipeline form the delivered first release.
