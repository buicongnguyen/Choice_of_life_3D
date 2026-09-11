# Choice of Life 3D — playable stories, release 0.3.0

## Purpose and release boundary

Turn a sequence of questionnaires into a warm, reactive life adventure. Preserve the twelve chapters, existing Blender assets, movement, three outcomes, accessible auto-walk, and untimed decisions. Do not edit the reference repositories. Ship this plan in this repository using the existing SSH main/Pages pipeline.

This release implements a complete lightweight activity layer across the life, with the most depth in Rowan's boat, exam preparation and the first career. These are touch/keyboard interactive activity boards anchored to objects in the 3D world, not full physics simulations. No new engine, paid services, giant maps or Blender rebuild is needed. Fully skeletal facial acting, voice acting, large career environments and complex NPC schedules are later art/production work, not requirements of this release.

## Design rules

- Theme: **What will you make time for, and what will you leave behind?**
- Loop: discover a problem → make/perform something → see a personal response → encounter a later consequence.
- Keep Health, Happiness and Money as the only global meters. A local three-afternoon planner is a chapter activity, not a hidden fourth stat.
- Activities are optional; existing saves and players using only conversations must still finish. Assisted completion is available with the same rules, no timer or dexterity penalty.
- Every completed activity has a distinct keepsake and later contextual payoff. Missing an activity must not fabricate that achievement.
- Existing canonical conversation IDs and option facts remain stable. Old memories and scores are not rewritten. New rewards use the new balance.

## Phase 1 — core state and content

1. Add a typed activity catalogue and pure state transitions. Persist per-chapter action history, completion and outcome. Reject invalid actions, duplicate rewards, future activity progress and malformed saves.
2. Support sequential tasks (each action reveals the next step), search boards (inspect hiding places), and three-slot planners (allocate work/study/rest/friends; undo before confirming). Completion alone awards a small bounded reward and a separate memory.
3. Reduce new positive conversation gains and discovery gains; keep advertised costs accurate. Old rewards remain valid when loading old saves. Remove the repetitive purple puddle from the new presentation; retain save compatibility.
4. Resolve dialogue dynamically from prior facts and activities. Excellent exam preparation earns supported tuition; club/project choices inform portfolios; early boundaries affect later work/care context.
5. After a choice, show an untimed response with the actual applied changes and a specific later implication. Preserve this context in the journal.

### Activity catalogue

| Chapter | Activity / interaction | Saved consequence |
| --- | --- | --- |
| Nursery | Follow three gentle sensory prompts with Mum | First play ribbon; remembered in family care |
| Toddler | Search three hiding places; find the damaged boat; choose repair together, Dad's help or lending a toy | Distinct boat outcome; Rowan and retirement reflect it |
| First school | Build the class display: prepare, make, share | Project token; portfolio context |
| Clubs | Rehearse a short untimed four-beat pattern | Club ticket; mentor remembers this interest |
| Exams | Allocate three afternoons among study, paid work, friends and rest; undo/reset, then confirm | Preparation style; scholarship opportunity for excellent preparation |
| Education | Assemble a portfolio in three steps, with prior project/club context | Portfolio; first-day confidence |
| First career | Allocate three work blocks to profession-specific service, quality checks and breaks | Work style and specific colleague reaction; midlife callback |
| Relationships | Make a shared picnic in three steps; meet Avery, Quinn and Morgan directly in the world | Picnic keepsake; individual introductions before committing |
| Midlife | Allocate a care week between visits, paid support and rest | Sustainable/shared/intensive care outcome; legacy callback |
| Experience | Assemble a practical mentoring kit | Mentoring booklet; younger person's response at the ending |
| Retirement | Prepare, plant and water a community bed | Garden marker; final scene remembers the work |
| Legacy | Arrange a keepsake display and choose what to carry forward | Completed display and personalized ending sequence |

## Phase 2 — 3D integration

- Reuse the middle reward prop as the chapter activity anchor, keeping two ordinary discoveries. Keep its existing reachable coordinates; do not add collision risks.
- Give each activity a meaningful world label. Completed props remain as souvenirs where appropriate, without awarding again.
- Make all three partner candidates directly interactive. Their conversations do not force romance. Jamie's commitment choices require the corresponding introduction; independent/community home routes remain available.
- Show the selected partner in later home/garden scenes, using the same deterministic appearance and a contextual check-in.
- Add a small visible keepsake arrangement using existing GLBs. Select objects from actual choices and completed activities, not invented history.
- Frame both speakers during dialogue without changing avatar scale; restore normal framing on close. Restrained head/arm acknowledgement must not sway or stretch bodies.
- Add a profession sign and relevant reused tabletop props to the first workplace; avoid claiming a full hospital or new city is built.

## Phase 3 — UI and narrative

- Persistent chapter briefing, accessible again from a Story button; specific chapter objectives replace anonymous moment counts.
- Bottom activity/response panels share dialogue layout, focus trapping, scrolling and inert background. No movement or reward processing behind them.
- Activity boards have visible progress, 44px targets, keyboard buttons and an assisted route. Search reveals evidence; planners preview effects before irreversible confirmation.
- Add comfortable/large text setting and a close-up setting, persisted separately from the save. Essential text remains visible on short screens.
- Keepsake journal: visual object cards, descriptions and twelve chronological chapter summaries. Ending shows actual selected moments and activity outcomes, not merely a title chosen by the final answer.
- Keep New Life replacement confirmation. No forced restart after upgrade.

## Phase 4 — review, repair and release

- Code review: state immutability, action guards, save validation/migration, dynamic dialogue consistency, model ownership/disposal, focus/input and repeated-click safety.
- Logic review: either conversation order, unfinished/skipped activities, all partner paths, career/education variants, score caps, assisted completion, reload during a task, and old-save continuation.
- Run the existing short core/navigation suite plus focused story tests. No seed sweeps. Build once after implementation, then a bounded browser check of the three flagship chapters, phone dialogue/activity, save/continue and ending.
- Document findings and fixes in `STORY_REVIEW_0.3.0.md`. Commit the plan, implementation and review; SSH push main; wait for Pages; verify live release SHA and a playable new activity.

## Plan review refinements

The initial idea of making every activity compulsory would break old saves and turn optional exploration into chores; activities instead unlock richer context/opportunities. Arbitrary recurring score decay would punish gentle play, so this release reduces inflation and uses only explicit activity trade-offs. Partner choice cannot depend on conversation order. All state changes go through the pure core, including assisted actions. Later scenes explicitly distinguish repaired, borrowed and uncompleted boat histories.

## Delivery status

- [x] Detailed plan and pre-implementation logic review
- [x] Activity state, balance and reactive dialogue
- [x] 3D activity/partner/keepsake integration
- [x] Story UI, reactions and personalized ending
- [x] Focused code/logic review and fixes
- [x] Production build and bounded story browser review

Publication uses the existing SSH `main` → Pages workflow. The exact deployed commit is available in the live `release.json` and the GitHub Actions history; the task handoff records the final deployment result. See `STORY_REVIEW_0.3.0.md` and `story-smoke-result.json` for this release candidate's implementation/review evidence.
