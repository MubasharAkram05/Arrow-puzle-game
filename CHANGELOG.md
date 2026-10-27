# Changelog

All notable changes to this project. Format based on [Keep a Changelog](https://keepachangelog.com/).

## [3.1.0] - 2026-10-27

### Changed

- Chapters now have 40 levels (was 20). The chapter reward is doubled to 200 coins + 4 diamonds, so total earnings stay the same. Chapter Master needs all 40 levels of chapter 1.
- Saves made with 20-level chapters are converted on load: a new chapter counts as rewarded only if both old halves were, so no chapter reward is lost.
- Levels stay unlimited.

## [3.0.0] - 2026-10-27

### Added

- Coins and diamonds (`src/game/economy.js` rules, `src/game/rewards.js` state updates):
  - level rewards with hearts bonus, difficulty multiplier, first-time perfect bonus, 25% on replays, chapter and shape-level bonuses
  - victory screen shows the breakdown, and coins/diamonds fly to the counters with a count-up
  - spending: buy hints when the free ones run out, refill a heart (tap the hearts or from game over, max 2 per level), continue with full hearts, skip a level
  - every price lives in `config.js`; `grant()` is the hook for currency from ads or purchases later
- Confirm/purchase dialog that blocks with a clear message when you can't afford something.
- Bottom navigation (Home, Levels, Shop, Profile), hidden during play. A red dot on Profile when an achievement can be claimed.
- Levels page: chapters of 20 as collapsible cards with progress and chapter reward. Tiles show check, crown (perfect), lock, a glowing ring on the current level and a shape icon on every 10th level. Opens scrolled to the current level. A locked tap shakes and says which level to finish first. Only open chapters render tiles, so 1000+ levels stay fast.
- Profile page: 12 built-in SVG avatars, editable name (3-16 characters, inline validation), player level and XP bar, 8 stat cards, 7 achievements with progress, diamond rewards and a Claim button with a small burst.
- Shop page: hints and a 5-hint pack, arrow styles and accent themes (coins or diamonds), Owned/Equipped states, confirm before buying, a "Get more coins: coming soon" placeholder.
- Accent themes (Ocean Blue, Royal Purple, Lagoon Teal, Sunset Coral) for light and dark mode.

### Changed

- Saves move to `arrowEscape:v2` (`src/storage/schema.js`). v1 saves migrate automatically and keep level progress, hints, settings and the equipped style. Daily data is dropped. Every load is validated, and a backup copy is used if the main save is unreadable.
- Reset progress now also clears coins, diamonds, items, XP, stats and achievements (settings, avatar and name stay).
- Settings shows only owned arrow styles, with a link to the Shop.

### Fixed

- Finishing a level could trigger the win several times when multiple escape animations were still running. It now runs once per attempt.

### Removed

- Daily Challenge: home button, calendar icon, date-seeded generator (`dateKey`, `getDailyConfig`, `generateDaily`), daily styles and tests. Numbered levels are unchanged (levels 1-200 hash the same before and after).

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
