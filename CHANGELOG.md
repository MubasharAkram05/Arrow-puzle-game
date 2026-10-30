# Changelog

All notable changes to this project. Format based on [Keep a Changelog](https://keepachangelog.com/).

## [3.9.0] - 2026-10-30

### Changed

- Chapters have 20 levels again (were 40). Chapter complete pays +100 coins and +2 diamonds (was +200 and +4). Chapter Master means finishing chapter 1 (levels 1-20).
- Saves made with 40-level chapters convert once: both halves of a rewarded chapter count as rewarded, so no chapter reward is paid twice; all progress, coins and diamonds are kept.

## [3.8.0] - 2026-10-30

### Added

- Daily reward: a 7-day cycle (20 / 30 / 40 / 50 coins, 1 diamond, 70 coins, 2 diamonds + 1 hint) in a popup on Home, claimable later the same day from a Home button with a dot. A missed day resets the streak; after day 7 the cards restart and the streak keeps counting. Clock checks pay nothing when the device clock goes back or jumps far ahead.
- Daily streak on Home (flame and number) and current/best daily streak in Profile stats.
- Perfect level diamond: +1 diamond the first time a level is finished with no heart lost and no hint or booster (on top of the every-10th-level diamond).
- Tiered achievements: Level Climber (25/50/100/250), Brain Power (10/30), Comeback (1/10), Daily Player (3/7/30), Hard Worker (10/50). Only the next unclaimed step shows; steps pay once and in order.
- `SHOW_SHAPE_COLLECTION` flag (off): hides the Shape Collection and its toast while shapes keep being saved.

### Removed

- Skip level (Game Over button, price, logic and icon). Finishing a level is the only way to unlock the next one; levels skipped in old saves stay completed.
- Achievements Collector, Alphabet and Zoo Keeper (diamonds already claimed are kept).
- Shapes Soda (its icon was a cocktail glass) and the Viking and Knight helmets: 621 shapes now, every category still above its target.

### Changed

- Save format v5 (`arrowEscape:v5`) with the daily record and two new stats; v4 and older saves migrate with nothing lost.
- Achievement goals and rewards moved to `ACHIEVEMENT_DEFS` in `src/config.js`.

## [3.7.0] - 2026-10-30

### Added

- Shape library: 624 board shapes in 10 categories (letters, numbers, symbols, transport, objects, food, fruits, nature, animals, others), each above its target. Built by `scripts/build-shapes.mjs` from open icon sets (Font Awesome solid, game-icons.net, Material Symbols, Tabler, Fluent Emoji) and fonts (Inter, Roboto Slab), with an automatic quality filter and a review contact sheet (`scripts/shapes-preview.html`).
- Shape levels rotate between categories, compact shapes first; the 624 shapes repeat every 1,872 levels on bigger boards.
- Shape Collection on the Profile page: category chips with counts, total progress, coloured shapes you won and locked grey silhouettes for the rest.
- Achievements: Collector (50 shapes, 3 diamonds), Alphabet (all letters, 5 diamonds), Zoo Keeper (all animals, 10 diamonds).
- Settings > Credits and `CREDITS.md` for the shape sources and their licenses.

### Changed

- The shape library is a lazy chunk (77 KB, 30 KB gzipped) loaded after the home screen; shape levels wait for it.
- Save format v4 (`arrowEscape:v4`) with the collected shapes. v3, v2 and v1 saves migrate with nothing lost.
- The 20 original shapes keep their ids (letter A and Z are now drawn from the font).

## [3.6.0] - 2026-10-30

### Added

- Dense levels start zoomed in only when fitted cells would be under 18px, opening at about 22px per cell (other boards start fitted). Hints pan to the highlighted arrow. Double-tap on empty space shows the full board.
- Zoom guide like the reference: two hands for "Pinch to zoom" and one finger for "Double-tap to see full board", on the first 3 zoomed levels and until the first pinch; "Show zoom tips again" in Settings.
- `difficultyFor(level)`: one smooth curve for grid size, arrows, free arrows at start, depth, solve rounds, long-arrow share and shape size. Constants in `LEVELS.curve` in `src/config.js`.
- Expert label (level 1000+, max 1 free arrow from level 20,000) with a x2.5 coin multiplier as the cap.
- Unlimited levels: any level number works (tested up to 1,000,000); the Levels page renders only nearby chapters and keeps loading while scrolling, with no end.

### Changed

- Level 1 is drawn by hand with exactly 3 arrows; level 2 has 6-8 arrows; level 3 has 12-16 arrows and needs 2-3 rounds.
- Difficulty rises every level instead of in steps. Super Hard (101+) is much harder: max 2 free arrows, mean depth over 64 (was 45.8), 15-20% long arrows. Boards grow to 42x54 by level 200.
- Shape boards grow with the level and meet the same floors as plain levels of that number.
- Small boards use 30px cells (were 24px).
- Generator is faster: cached first free cell per line, skipped shape margins, a blocker map kept up to date while joining long arrows, and extra free arrows turned around or joined. Average build about 25 ms; every tested level under 150 ms.

### Fixed

- Panning to a point used the wrong card-centre shape and silently did nothing (hint pan).

## [3.5.0] - 2026-10-30

### Removed

- Reveal and Auto-Clear boosters: from the game screen booster bar, the Shop, the packs, the config, and their effects, icon and tests. Saved counts for them are dropped on load; everything else in the save is kept.

### Changed

- Booster Pack: 4 Shields for 200 coins (was 3 Shields + 3 Reveals + 2 Auto-Clears for 350).
- Starter Pack: 5 hints + 3 Shields + Dark Slate style for 3 diamonds (no Reveals).

### Added

- `TEST_UNLOCK_ALL` in `src/config.js` (on for now): every level on the Levels page is playable, with a TEST MODE badge on Home. It never writes progress: wins on levels that aren't really unlocked pay nothing, don't move the current level and can't be skipped, so turning it off restores the exact lock state. Tests cover both states.

## [3.4.1] - 2026-10-30

### Fixed

- Small shapes (like the arrow on level 9) had fewer arrows than their tier allows. Shape boards now grow until the shape holds about as many cells as the tier's plain board, so every shape level reaches the tier's arrow count, depth and solve-round floors (tested on levels 1-300).
- The diamond is now pixel art with wider steps, so its diagonal edges don't let as many arrows out at the start.

### Changed

- Shape boards keep the tier's depth and rounds goals (no more x0.6 easing). The start-free cap on shapes is the tier's cap + 12, or 14% of the arrows if higher.

## [3.4.0] - 2026-10-29

### Added

- 15 new board shapes inspired by the reference games: arrow, mushroom, plane, whale, cat, letter A, donut, dog, house, fish, bird, apple, plus, tree and letter Z (20 shapes in total).
- The Levels page shows each shape level's silhouette, drawn from the same mask the board uses.

### Changed

- A shape board now comes every 3rd level after the tutorial (6, 9, 12, ...) instead of every 10th.
- The +1 diamond stays on every 10th level only (now called a milestone), so the economy doesn't change.
- The "Shape Solver" achievement counts the new shape levels.

## [3.3.0] - 2026-10-29

### Changed

- Difficulty tiers moved up and every number lives in `LEVELS` in `src/config.js`:

  | Tier       | Levels | Board width              | Arrows | Free at start | Min avg depth | Min solve rounds |
  | ---------- | ------ | ------------------------ | ------ | ------------- | ------------- | ---------------- |
  | Tutorial   | 1-3    | 5-7                      | 6-15   | 2-3           | -             | 2                |
  | Normal     | 4-20   | 16, +1 every 3 (max 21)  | 40-80  | max 3         | 9             | 12               |
  | Hard       | 21-60  | 22, +1 every 8 (max 27)  | 80-140 | max 3         | 20            | 20               |
  | Super Hard | 61+    | 30, +1 every 20 (max 34) | 140+   | max 2         | 26            | 28               |

- Arrow lengths are mixed like the reference: about 70% short (2-6), 15-20% medium (7-12) and 10-15% long (13-30). Long arrows are made by joining neighbours onto deep arrows, so they leave late and act as walls (straights across the board, U-turns, combs, snakes).
- Solve rounds (removal waves) are now a checked goal for every tier.
- Coins scale with board size: +1 coin per 10 arrows, before the difficulty multiplier.
- Generation is faster (one sweep per line to find heads): every level of 1-300 builds in well under 150 ms.
- Boards are portrait shaped; shape levels are square, a bit wider, and have eased goals.
- Every tier starts with 3 hearts, like the reference.
- Lines and arrowheads stay thin on dense boards.
- Taps on the board fire on release instead of on touch, so dragging or pinching never removes an arrow.
- Existing saves keep all progress, coins and items. Only the boards themselves are new.

### Added

- Pinch to zoom and one-finger pan on big boards, with a "Pinch to zoom" tip on the first 3 dense boards, a button to show the whole board again, double tap on empty space to reset, and Ctrl + wheel zoom on desktop.
- Hints and Reveal zoom back out first so the highlight is on screen.

## [3.2.0] - 2026-10-29

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
