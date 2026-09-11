# Story and experience release review — 0.3.0

## Delivered scope

The plan in `STORY_EXPERIENCE_PLAN_0.3.0.md` is implemented as an additive expansion: twelve optional activity boards, three first-career variants, direct guest meetings and later partner check-ins, outcome-dependent callbacks, tuition/interest opportunities, reduced reward inflation, persistent briefings and responses, comfortable/large text, conversation framing, earned keepsake cards and a chronological ending. Existing GLBs and maps are reused. This does not claim bespoke physics minigames, full facial animation or a new AAA-sized world.

## Code and logic review

- Pure transitions own action progress, completion, scoring and introductions. Sequence/search/planner inputs are validated. Undo cannot undo committed rewards. Assistance follows the same transitions; completion is idempotent.
- Partial activity progress is serialized after each step. Save loading replays the permitted action history and validates completion/memory pairing. Old saves receive empty activity history and a compatible introduction record for an already chosen partner. Historical scores/memories are untouched.
- Main conversation fact IDs remain canonical. Supported tuition is calculated from excellent grades or two committed study blocks; it changes the actual university cost and displayed preview. Club/project opportunities have matching score effects.
- The partner gate applies only to choosing that guest through Jamie; Dad's shared-home discussion can occur first. Independent/community paths do not require romance. Chosen partners retain deterministic appearance in later scenes.
- Missing boat work is not described as the player's repair. Search outcomes distinguish repair together, Dad's support, lending, and not completing the activity. Later biographies use real prior decisions.
- Panels pause movement and keep background controls inert. Activity/response/briefing panels use the measured dialogue viewport reservation. Close-up framing changes camera bounds, never body scale. Acknowledgement rotates only the head and is disabled with reduced motion.
- Removed obsolete puddle construction after the compiler exposed unreachable nullable-object code. Cleared acknowledgement rotations when conversation focus changes, preventing a lingering pose.
- Updated older smoke entry points for the briefing/response panels and guest-introduction gate; removed hardcoded art-release cache expectations.
- The phone review showed floating activity labels across the player's face in a close-up. Conversation/activity framing now hides world labels until exploration resumes.
- Focus trapping now excludes disabled buttons, including unintroduced partner options and future sequence steps.

## Verification record

The initial focused run passed all thirteen test groups (under one second on the development machine), including full-life choice policies, all twelve assisted activities, partial search saves, alternate boat solutions, planner undo/confirmation, supported tuition, migration/rejection cases, partner order, and six-room navigation. The production build passed after the obsolete hazard block was removed.

After the review fixes, all fourteen focused test groups and the production build passed. `git diff --check` passed. The bounded browser review passed with no page errors or failed HTTP responses; results are in `story-smoke-result.json` (2026-09-11T05:54:02Z). It exercised a saved/reloaded boat clue and repair, phone timetable undo/confirmation, the resulting tuition opportunity, clinic workday, all three guest introductions, the chosen partner in the next chapter, and an ending with twelve activity keepsakes plus Dad's original treasure. The reviewed dialogue/activity viewports did not overlap the playfield or overflow horizontally.

The final label-hiding, keyboard-focus and extra callback refinements passed the final type/build and pure tests; a short live activity check follows publication. Some early screenshots in `docs/captures/` precede the label-hiding refinement. The exact deployed SHA belongs to GitHub Actions and live `release.json`, not this pre-publication document. No deterministic seed sweep is part of this release.

## Known boundaries

Activities are compact interactive boards anchored in the 3D world. They can be skipped without blocking the ending. The shelf refreshes when entering a chapter; the journal updates immediately. Three reused GLB objects represent the most recent keepsakes on the shelf, while illustrated journal cards show each earned object's identity. Career kit changes are lightweight signs/props, not hospital-sized environments. No physical iPhone/Android frame-rate claim is made. The three meters remain forgiving summaries rather than realistic medical/financial simulations.
