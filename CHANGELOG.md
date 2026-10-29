# Changelog

All notable changes to this project. Format based on [Keep a Changelog](https://keepachangelog.com/).

## [3.3.0] - 2026-10-29

### Changed

- Levels are much harder and denser, like the reference game:
  - level 4: 8 cells wide (about 20 arrows); level 5: 12 wide (about 40)
  - Hard from level 6: 14 cells wide (40+ arrows), growing to 22 wide (about 100 arrows) by level 30
  - Super Hard from level 31: growing to 30 cells wide (up to about 190 arrows)
  - shorter arrows (2-12 cells) so boards hold many more of them; stricter depth and rounds goals
  - boards are portrait shaped; mask levels are square and slightly bigger
  - every tier now starts with 3 hearts, like the reference
- Lines and arrowheads stay thin on dense boards.
- Taps on the board fire on release instead of on touch, so dragging or pinching never removes an arrow.
- Existing saves keep all progress, coins and items. Only the boards themselves are new.

### Added

- Pinch to zoom and one-finger pan on big boards, with a "Pinch to zoom" tip on the first 3 dense boards, a button to show the whole board again, double tap on empty space to reset, and Ctrl + wheel zoom on desktop.
- Hints and Reveal zoom back out first so the highlight is on screen.

- 2026-10-29

### Added

- Boosters, stored as inventory counts, with a compact booster bar next to the hint button (tap with 0 left to buy):
  - Shield (60 coins): the next wrong tap costs no heart. Pulses while active, breaks with an animation. Does not stack.
  - Reveal (40 coins): highlights every free arrow for 3 seconds.
  - Auto-Clear (70 coins): removes one free arrow with its normal escape. Max 1 per level.
  - Extra Heart Start (1 diamond): start the level with +1 heart.
  - Booster Pack (350 coins): 3 Shields + 3 Reveals + 2 Auto-Clears.
  - Using any booster or hint means the level is not "perfect". Boosters and hints used are new Profile stats.
- Cosmetics with a free default in every category, equipped from the Shop or Settings:
  - escape effects (Spark Trail, Comet Glow, Burst, Rocket Flame) on a small particle canvas, off with reduced motion
  - board backgrounds (Soft Paper, Gradient Sky, Chalkboard, Night Stars) with arrow and dot colours checked in light and dark mode
  - arrowhead shapes (Chevron, Round, Feather), drawing only, hit detection unchanged
  - victory confetti (Hearts, Coins, Stars) and sound packs (Retro 8-bit, Nature), all Web Audio
  - 6 premium avatars and Silver, Gold and Diamond frames. Silver and Gold also unlock free with Perfectionist and Chapter Master.
- Offers: one-time Starter Pack from level 5, a Free Gift of 30 coins every 4 hours (safe if the clock moves backward), coin to diamond exchange (x1 and x5) and a Weekly Sale (30% off one item, same for everyone that ISO week).
- Shop tabs: Offers, Boosters, Styles, Effects and Profile. Sticky, tap or swipe, remembers the last tab, live previews, Sale and New badges, locked and empty states. A dot on the Shop tab when the free gift is ready.

### Changed

- Saves move to `arrowEscape:v3`. v2 saves (and their backups) migrate automatically and keep all progress, coins, diamonds, items and achievements. Old keys are removed only after v3 is safely written.
- `src/storage/schema.js` split into `validators.js` and `migrate.js`.

### Fixed

- Coins and diamonds counters now stay in sync on every screen after a level, even when you leave the victory screen before the coins finish flying (regression test added).
- Levels page opens the chapter with the current level and scrolls to its tile.

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
