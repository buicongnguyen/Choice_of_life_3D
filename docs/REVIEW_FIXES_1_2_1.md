# Kitehaven 1.2.1 — review fixes

Changes since 4378fba:

- Graphics/language changes reload only after progress and settings are saved successfully. Failed changes keep the current page open, restore the selector, and show an English, Vietnamese, or Korean warning.
- Kite flying pauses on window blur or page hiding, releases held controls, and resumes without counting time spent away. Disposing the activity removes its focus/visibility listeners.
- The journal replays the action log to evaluate each past main choice against the state immediately before that decision, including its labels and visibility.
- Reduced motion immediately hides existing weather/fireworks and stops their simulation.

Validation:

- 40 tests passed, including six new regression tests.
- TypeScript check and production build passed.
- A focused 390 × 844 mobile-browser check confirmed failed progress/settings writes do not reload, successful language changes preserve the save, and no runtime errors occurred.
- No artwork, story choices, economy rules, or saved-game schema changed.

Deployment uses the existing main-branch GitHub Pages workflow and SSH Git remote.
