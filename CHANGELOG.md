# Changelog

All notable changes to this project. Format based on [Keep a Changelog](https://keepachangelog.com/).

## [3.17.0] - 2026-11-04

### Changed

- Longer, bending arrows from level 4 (levels 1-3 unchanged): at least 3 cells (2 only as a last resort, at most 3%), a mix of about 40% 3-5, 37% 6-10 and 21% 11-25 cells, at most 30% straight (24% on Expert) and straight arrows at least 4 cells. Bends first: L, U, zig-zags, spirals and snakes; long arrows start as late, blocked arrows and bend around others like walls.
- More blocking: new floors per tier for `blockersAhead` (2.5 / 3 / 3.5 / 4) and at least 90% of arrows blocked at the start. Shape boards may start with the cap + 2 free arrows or 10% of their arrows (was + 12 or 14%).
- Existing floors (depth, rounds, chain, decoys, free per round, start free) are unchanged; every level is still solvable, deterministic and within the time limits.
- Depth aim on Normal and Hard (`depthAim` / `depthPicks`): a board shallower than the aim is kept and a few more are tried (up to 8 on Normal, 4 on Hard), taking the first at the aim or the deepest. Average depth on the tested samples: Normal 34.7 (was 32.6 before the shape rules), Hard 64.8 (was 62.5).

### Added

- `src/engine/tidy.js`: short or stub arrows grow into empty cells, take a neighbour's tail cell or join a neighbour, without cycles.
- New metrics in `analyzeLevel`: blockersAhead, blockedShare, straightShare, shortShare, straightStubs, avgTurns.
- Tests for the length mix, minimum length, straight share, bends, blockersAhead per tier, solvability, determinism and no difficulty drop.

- 2026-11-02

### Added

- Profile tabs: Profile and Awards (pill control, sliding thumb, red dots, the last tab remembered).
- Awards tab: original clay-style award badges (one shape and colour per group, tier number on a ribbon, pale grey when locked, red dot until seen) with a details sheet showing every step, and 12 original monthly trophies filled by the days the daily reward was claimed (leap years counted; earlier years folded when they have data).
- Save fields `dailyDays` and `seenBadges` (older saves rebuild the claim days from the current streak; earlier claims count as seen).

### Changed

- Achievements are a single-column list on the Profile tab: current step only ("Step 2/4"), progress, reward and Claim; ready first, then in progress, then completed. Claiming keeps the burst and the flying diamonds.
- Daily Reward popup redesigned as a reward panel: ribbon banner, Day 1-6 in a 3x2 grid, a tall Day 7 gift card, claimed / today / locked states, the big Claim button under the panel. Same rewards.
- Owned Shop items show "Equip" or "Equipped"; the Shop is the only place to equip.

### Removed

- From Settings: "Switch your style", the Cosmetics chips and "More in the Shop".
- The old hexagon badges and the newest-badges row under the name.

- 2026-11-01

### Changed

- Cleaner game header: the top row is back, restart and the hearts, centred on the screen. The board gets the freed space (about 64 px more height; on tablets the board is up to 8% bigger). Tapping the hearts still buys one back (80 coins), and the lose and refill animations are the same. The level number stays for screen readers (the game screen's label).

- Speed tests are no longer flaky: `npm test` runs `test:unit` (files in parallel) and then `test:timing` (the generator, every-shape and hit-test speed files, one at a time); CI runs them as two steps. Build time is the median of three builds instead of the faster of two.
- Faster level generation (same levels, exactly): blocking depth is computed with bitsets instead of JS Sets, and the free-neighbour count is written out instead of a reduce over the four directions. About 30% faster on big boards; the slowest tested level (341, Hanger, 137-cell board) went from about 300-350 ms to about 250 ms.

### Removed

- From the game screen: the arrows-left pill, the difficulty pill, the "Level X" title and the settings button (settings stay on Home and Profile). Arrows cleared and difficulty are still tracked for stats, rewards and achievements.

- 2026-11-01

### Changed

- The shape library is rebuilt at 64x64 (was 32x32), aspect ratio kept, from the same sources, licenses and credits. Thin parts (legs, tails, wings, stems) are thickened instead of cut off: dilation of parts thinner than 4 cells only, run twice. Holes are filled, edges smoothed, one connected area kept. 721 shapes built (621 before); `library.json` is 79 KB gzipped.
- Every shape was checked again by eye, including the 222 removed in 3.13.0. 447 are in play (399 before): 83 came back, 47 are new and 82 went out. Clearer sources for Butterfly, Rabbit, Ghost, Robot, Rose, Cake, Burger, Ice Cream, Ice Pop, Watermelon Slice and Crab.
- Shapes that need a big board have their own minimum (`SHAPE_MIN_SIDE`, 48 cells for 49 shapes) and always come in the second half of a cycle (`SHAPE_BOARD.lateSide` 40). `SHAPE_BOARD.maxSide` is 64, the library resolution.
- The library size test checks the gzipped size (under 150 KB).
- The Expert vs Super Hard depth test compares every cached level of both tiers (200 and 400) instead of 15 and 23, which swung with the shape order.

- Expert is clearly harder: boards get 6 more cells on each side (`boardGrow`, up to 104 cells), depth and solve-round floors are the curve x1.6 (Super Hard x1.4). On the tested levels Expert's average depth is 122.9 vs 106.4 on Super Hard (+15.4%); a test now requires at least +14%. Free arrows per round stay about the same (2.82 vs 2.76).
- Expert floor fallback (`floorFallback`): after 2 attempts the best attempt that missed only free per round (+0.2), decoys (-2 points) or longest chain (-2) is used, never depth or rounds; count-based, so deterministic, and `level.relaxed` names the floors. 21 of the 200 tested Expert levels use it; every Expert level builds in under 300 ms locally.
- The every-shape board test checks speed only for shapes in play (removed shapes are never generated in a level); all shapes must still be solvable and meet their floors.

- A zoomed level opens on arrows, never on an empty area: the first view is the window nearest the board centre that is at least 80% arrows (holding a free arrow on big boards). Ring and hollow shapes (Watch, Donut, Ring) no longer open on their empty hole.

### Added

- 6 hand-drawn shapes, our own designs from plain geometry (`scripts/shape-drawings.mjs`, source `draw:`, license `project`): Lion, Fox, Letter Q, Clock, Pizza Slice and the new Tiger Head. Lion, Fox, Letter Q and Clock are back in play; Pizza Slice uses the new drawing. Lion, Clock and Tiger Head have a 32-cell minimum board.

### Removed

- From play (still in the library, so saves keep every collected id): 274 shapes, each with a reason in `src/engine/shapes/removed.js`. 12 of them only because they were the slowest to generate: Bandage, Baseball, Box, Bush, Cross Circle, Die, Ice Cube, Jack O Lantern, Meeple, Question, Sparkle, Squid. 20 old ids that miss the quality filter at 64 (Ribbon, Muffin, Dinosaur, Bat...) are kept out of play.
- `BIG_BOARD_SHAPES` (replaced by `SHAPE_MIN_SIDE`).

## [3.13.0] - 2026-10-31

### Changed

- The game board is drawn on canvas instead of SVG: no half-drawn arrows or loose heads at any zoom, on 42x54 boards too. Pinch and pan stretch the bitmap (CSS transform); 100 ms after a gesture a sharp copy of the visible part is drawn. Only a small canvas with the moving arrows is redrawn per frame.
- Taps are instant: the arrow lights up on pointerdown and acts on pointerup, never waiting for a double tap (double tap still zooms out on empty space). Hit test by grid cell, nearest arrow within 0.45 cell as a fallback. A tap is under 10 px and 350 ms.
- Every level from 4 is a shape board (levels 1-3 stay plain). Each cycle shows every shape once in a seeded shuffle; a shape never comes back within half a cycle. A shape that misses its floors tries more seeds, then bigger boards, then the next shape (logged); never a plain board.
- Shape masks are smoothed at board size and never smaller than the shape's minimum board.
- Levels page nodes show the exact board outline of their level (same mask as the game), as crisp vector icons.

- Shape Solver is tiered: Shape Solver I / II / III / IV for 25 / 100 / 250 / 500 shape levels, 2 / 5 / 10 / 20 diamonds. A save that claimed the old single step (5 levels, 3 diamonds) keeps those diamonds and has step I claimed, so nothing pays twice.

### Removed

- 222 shapes (list in `src/engine/shapes/removed.js`); 399 remain. 221 did not look like their name even on a big board; Asterisk was too slow to build. 14 that only read well on a big board are kept with a 40-cell minimum and come in the second half of each cycle. Saves that collected a removed shape keep it.

### Added

- `npm run shapes:sheet`: a contact sheet of every shape's real first-level board next to its silhouette, with flags.

## [3.12.0] - 2026-10-30

### Changed

- Every tier is harder (levels 1-3 unchanged): the depth and solve-round floors are 40% higher, and new per-tier floors cap free arrows per round (3.0) and ask for a longest blocker chain (8 / 14 / 20 / 22), decoys (12%) and hidden first moves (at most half on the edge). Max free arrows at the start is 2 for every tier.
- New hard-board passes: a short empty corridor hides the first move inside the board, arrows are turned around to leave later, short arrows join late long walls, tail cuts make decoys, and a board just under a floor is repaired before a retry.
- Super Hard and Expert floors were set close to what the generator reaches on the full-size board (requested: 1 free at start, 2 / 1.5 free per round, 25% / 30% decoys, Expert depth +50%); see README "Tier floors".
- `joinLongArrows` uses solve rounds to skip most blocker searches, so it runs faster (same boards).

### Added

- Difficulty metrics: free per round, longest chain, decoy ratio, edge-free ratio (`src/engine/metrics.js`).

## [3.11.0] - 2026-10-30

### Removed

- Shield and Extra Heart Start boosters, the Booster Pack and the booster bar. The game bar keeps only Hint and Grid, centered.
- Booster stats tracking (boosters used).

### Changed

- Starter Pack: 5 hints + Dark Slate style (still 3 diamonds, one time).
- The Shop Boosters tab is now Hints.
- Perfect levels and Brain Power only check that no hint was used.
- Save format v6: owned Shields are refunded at 60 coins each and Extra Hearts at 1 diamond each, once, with a toast. No other data is lost.

## [3.10.0] - 2026-10-30

### Added

- Levels page as a winding path: sticky gradient chapter banners, round 3D level nodes in an S-curve (completed, perfect, current with START bubble, locked, shape and every-10th star nodes), a treasure chest after each chapter that opens when its reward is paid, light doodles and a "jump to current level" button. Stays light with 50,000+ levels.
- Shop "All" tab (first and default) with every section under its heading.
- Award badges on the Profile: one original badge per achievement group with Bronze/Silver/Gold/Diamond tiers, locked/ready/earned states, a bottom sheet with Claim and an unlock animation, and the 3 newest badges under the name.

### Changed

- Profile stats: three highlight tiles (Daily streak, Levels completed, Perfect) and a compact list (Arrows cleared, Win streak, Best streak, Play time) that count up. Coins, Diamonds, Best daily streak, Boosters used and Hints used are no longer shown (still saved).
- The achievements list is replaced by the badge grid (same rules and rewards).

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
