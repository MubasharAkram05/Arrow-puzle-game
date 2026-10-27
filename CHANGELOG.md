# Changelog

All notable changes to this project. Format based on [Keep a Changelog](https://keepachangelog.com/).

## [2.2.0] - 2026-10-27

### Changed

- Node 22 is now required (Node 20 is end-of-life): `engines.node >=22`, `.nvmrc`, CI runs on the `.nvmrc` version.
- Vitest 4.0 → 5.0. It now shares Vite 8 instead of pulling in a nested Vite 7.
- Capacitor 7 → 8 (`core`, `app`, `cli`, `android`). The Android template targets API 36, which meets the current Google Play requirement.

## [2.1.0] - 2026-10-27

### Changed

- UI matched to the screenshots in `reference/`:
  - compact board with constant-size lines (about 4px) and larger arrowheads
  - dot grid off by default
  - level 1 shows only the title, with a cartoon glove and a big "Tap to remove" bubble under the board
  - filled navigation icon and larger text in the pills, glossy hearts
  - Super Hard: crown label above the hearts, lavender background on the daily challenge
  - centred lavender hint and grid buttons with a cyan badge
  - victory screen: radial blue glow with soft rays, confetti that keeps falling, compact preview card, wide "Next Game" pill and "Main" near the bottom

### Added

- `reference/` screenshots used as the design target.

## [2.0.0] - 2026-10-27

### Added

- Vite project with ES modules: `src/engine`, `game`, `render`, `input`, `audio`, `storage`, `ui/screens`, `ui/modals`, `styles`.
- Vitest suites: 200 levels + 30 daily challenges, solver, board and difficulty unit tests.
- ESLint (flat config), Prettier, `.editorconfig`, GitHub Actions CI on Node 20.
- Android back button: closes modals, goes back one screen, asks "Exit game?" on Home. Uses `@capacitor/app` natively, `history`/`popstate` in the browser.
- Difficulty analysis: per-arrow blocking depth, free arrows at start, solve rounds.
- Capacitor 7 config and APK build steps in the README.

### Changed

- Hard and Super Hard boards must meet minimum difficulty goals. Super Hard now starts with at most 3 free arrows (was up to 7), and Hard with at most 4 (was up to 8).
- Stronger depth bias in the generator for Hard and Super Hard.
- Levels 20+ and daily challenges are different boards than in 1.x because of the new goals. Levels 1-19 are unchanged.

### Removed

- The regex + `vm` test hack. The engine modules are the single source of truth.
- Stray screenshot files in the repo root.

## [1.0.0] - 2026-10-27

### Added

- Single-file game: snake-style escape and bump animations, seeded generator with shapes and masks, solver, home, level select, daily challenge, victory and game over screens, hints, tutorial, settings, themes, arrow styles, localStorage saves. Kept in `legacy/`.
