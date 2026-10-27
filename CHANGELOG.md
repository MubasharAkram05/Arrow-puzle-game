# Changelog

All notable changes to this project. Format based on [Keep a Changelog](https://keepachangelog.com/).

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
