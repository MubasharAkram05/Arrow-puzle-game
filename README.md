# Arrow Expert

A "Tap Away Arrows" style puzzle game. Tap an arrow: if nothing is in front of its head it slides out of the board, otherwise it bumps and you lose a heart. Clear every arrow to win.

The game was called Arrow Escape until 3.24.0. The package ID is `com.sussal.arrowexpert` (`capacitor.config.json`). The save keys (`arrowEscape:*`) keep the old name on purpose: changing them would lose players' saves.

Built with vanilla JavaScript ES modules and Vite. Runs fully offline and is packaged for Android with Capacitor.

## Features

- Endless generated levels in chapters of 20, dense like the reference game (40+ arrows from level 4, 140+ from level 61), with a mix of short and long arrows, and from level 4 two plain boards then one shape board, repeating (721 shapes in 10 categories; every other shape level a letter A-Z or a number 1-9, 0 in order, the rest mixed with no repeats within a cycle)
- Pinch to zoom and drag on big boards
- Hearts, hints, a level 1 tutorial, snake-style arrow animations
- Coins and diamonds: earned by playing (including a perfect-level diamond and a 7-day daily reward), spent on hints, heart refills, continues and cosmetics. The only way to the next level is to finish the current one
- Cosmetics: escape effects, board backgrounds, arrowhead shapes, victory confetti, sound packs, premium avatars and frames
- Shop with tabs (All, Offers, Hints, Styles, Effects, Profile), a free gift every 4 hours, a starter pack, coin exchange and a weekly sale
- Pages: Home, Levels, Tasks, Shop and Profile behind a bottom navigation bar
- Tasks: Weekly Quests and the permanent Achievements in one place, behind two tabs. Weekly Quests: 6 quests a week (same for everyone, reset every Monday), a 0-100 points bar and 3 reward chests
- Daily reward with a 7-day cycle and a daily streak (shown on Home and in Profile)
- Levels page as a winding path: sticky chapter banners, round 3D level nodes in an S-curve and a treasure chest per chapter
- Profile in two tabs: Profile (12 built-in avatars, an editable name, player level/XP, highlight stats and a "View achievements" link) and Awards (clay award badges for 12 achievement groups and 12 monthly trophies, show-off only)
- Light, dark and auto theme, 6 arrow styles, 4 accent themes
- Saves locally (versioned, validated, with a backup copy), works with storage blocked

## Brand images and store assets

`brand-images/` holds the source art (made with an image AI). It is processed, never redrawn:

| Source                | What                                         | Used for                                                                            |
| --------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------- |
| `icon-full.png`       | full square icon (logo on the blue gradient) | Play Store icon, web icons, favicon, apple-touch-icon, Home logo                    |
| `icon-foreground.png` | the logo on a transparent background         | adaptive icon foreground, Android 12+ splash icon, maskable icon                    |
| `icon-background.png` | the blue gradient only                       | adaptive icon background, maskable background                                       |
| `icon-mono.png`       | black logo silhouette on transparent         | adaptive monochrome (themed) icon                                                   |
| `splash-light.png`    | splash for light mode (blue)                 | splash screens; the dark one (deep navy #0B1020 to dark royal blue) is made from it |

- `npm run assets` (`scripts/assets.py`, needs Python 3 with Pillow and numpy) writes every size:
  - the Play Store icon and the Android `res/` files (adaptive icons, launcher icons, Android 12+ splash icon and colours, legacy splash images) in `store-assets/`
  - the web icons, favicon and manifest icons in `public/`
  - `store-assets/README.md`, a table of every file with its Play Store slot and a check
- Clean-up: alpha noise and stray specks away from the art are removed, and transparent edges are resized premultiplied (no dark fringe). The colours were already strongly saturated, so they are not changed.
- At 48 px the icon stays readable: the orange S-arrow and the white arrows are clear. The inner white loop gets busy, and the round adaptive version is a little smaller because of the 66 dp safe zone.
- `npm run screenshots` (`scripts/store-screenshots.cjs`, Playwright) captures the store screenshots from the real game, each with a caption banner: 8 phone (1080 x 1920), 4 7-inch (1200 x 1920) and 4 10-inch (1600 x 2560). Its dev server runs with `ARROW_TEST_UNLOCK=0`, so `TEST_UNLOCK_ALL` is off and no "TEST MODE" badge shows.
- Store text: `store-assets/listing.md`.
- Splash screens:
  - **Web:** a quick loading screen (logo on the brand gradient, navy in dark mode) fades into Home in about 250 ms.
  - **Android 12+:** the system splash shows the icon foreground on royal blue (light) or deep navy (dark).
  - **Older Android:** `@capacitor/splash-screen` shows the full splash, light or dark. The app hides it once Home is ready (`src/ui/bootSplash.js`).
- In-app: the Home logo and the Credits title use the app icon.

## Requirements

- Node.js 22+ (see `.nvmrc`; `nvm use` picks it up). CI uses the same version.
- For the APK: Android Studio Narwhal 3 (2025.1.3) or newer, Android SDK 36, and JDK 21

## Run

```bash
npm install
npm run dev       # dev server with hot reload
npm run build     # production build in dist/
npm run preview   # serve the build locally
npm test          # Vitest: test:unit, then test:timing
npm run test:unit # everything except the speed tests, files in parallel (seconds)
npm run test:timing # 700 levels and every shape at 3 sizes, one file at a time (a few minutes)
npm run lint      # ESLint + Prettier check
npm run format    # auto-fix formatting and lint issues
npm run shapes:sources  # once: install the icon sets and fonts the shape library is built from
npm run shapes:build    # rebuild src/engine/shapes/library.json, index.json, CREDITS.md and the preview
```

## Folder structure

```
index.html              markup for every screen and modal (Vite entry)
src/
  main.js               boot: icons, save, theme, screens, bottom nav, back button
  config.js             game constants, rewards, prices, shop items, level tiers
  engine/               pure logic, no DOM (tested in Node)
    rng.js              seeded mulberry32 RNG and seed hashing
    directions.js       up/right/down/left
    masks.js            mask building from library shapes; the 20 original shapes (formulas, old order)
    shapeArt.js         pixel art of the original shapes (source for the shape build)
    animalArt.js        pixel-art animals (whale, cat, dog, bird, fish)
    shapes/             shape library: library.json (lazy chunk), index.json (category -> ids),
                        library.js (load, decode, level order), quality.js (board rules, RLE),
                        collection.js (collected per category)
    levels.js           tier and board size for a level number (numbers from config.js)
    shapes.js           turn plans for straight, L, U, zig-zag, spiral, snake
    generator.js        reverse-peeling generator with retries (and repairs for hard boards)
    heads.js            peeling grid and the choice of the next arrow head
    hardBoard.js        hard-board passes: hidden first move, deepen, late walls, decoys, repairs
    deepen.js           turns arrows around so they leave later (keeps boards solvable)
    firstMoves.js       hides or removes obvious first moves on the board's edge
    reshape.js          decoy cuts and late walls (joins)
    tidy.js             arrow shapes: short or stub arrows grow into empty cells or join a neighbour (3.17.0)
    fill.js             fill pass: tails, heads, bumps and pocket arrows fill the gaps (3.18.0)
    styleMetrics.js     snake metrics: length, 15+ cells, turns, straight, wrap, hug, fill (3.18.0)
    dirMetrics.js       direction mix: same-way blockers, queue moves, local mix, cross blocking (3.19.0)
    metrics.js          free per round, longest chain, decoys, free heads on the edge
    longArrows.js       joins neighbours into long arrows without breaking solvability
    board.js            occupancy, ray checks, free arrows
    solver.js           greedy solver and structural validation
    difficulty.js       blocking depth, free arrows at start, rounds; difficultyFor(level) curve
  game/                 state, game loop (tap, win, lose), hints and tutorial
    economy.js          pure reward and wallet rules (+ grant() hook for ads/IAP later)
    rewards.js          applies rewards and purchases to the game state
    achievements.js     achievement goals, progress and claiming (pure)
    badges.js           award badge tier and state per achievement group (pure)
    achievementList.js  Achievements list rows and their order (pure)
    awards.js           award badges for the Awards tab: locked, earned, new (pure)
    trophies.js         monthly trophies from the daily-claim days, month lengths (pure)
    dailyCards.js       Daily Reward card states (pure)
    shopEquip.js        equipping owned items from the Shop (pure)
    stats.js            stats, streaks, XP levels, name validation (pure)
    daily.js            daily reward and streak, with clock checks (pure)
    assist.js           per-level "hint used" flag and the "perfect" rule (pure)
    cosmetics.js        owned/equipped cosmetics, buying, achievement unlocks (pure)
    offers.js           starter pack, gift timer, exchange, weekly sale picker (pure)
    offerActions.js     applies offers to the game state
    quests.js           Weekly Quests: weeks, seeding, progress, points, chests, clock safety (pure)
    questState.js       applies quest progress, claims and chests to the game state
  render/               canvas board (canvasBoard.js layers, canvasDraw.js arrows, canvasHeads.js heads),
                        HUD, pointing hand, animations, confetti; board.js keeps the small SVG boards
    effects/            escape effects (one file each) on a small particle canvas
  input/                board taps, pinch zoom and pan (zoomMath.js: pure zoom numbers), Android/browser back button
  audio/                Web Audio sounds and sound packs, vibration
  storage/
    schema.js           v7 save format, validation, loading and backup (pure)
    validators.js       number, list, cosmetics, avatar and shape-id validators (pure)
    migrate.js          v1 to v6 to v7 migrations, chapter-size conversion (pure)
    save.js             maps the game state to and from the save
  ui/                   navigation, theme, DOM helpers, zoom guide
    components/         icons, currency bar, bottom nav, avatars, toast, style preview
    screens/            home, levels (path), game, profile (stats, awards), shape collection
      shop/             shop shell and one file per tab, cards, previews, actions
    modals/             settings, credits, daily reward, game over, victory, purchase dialog, shared modal logic
  styles/               tokens, base and per-screen CSS
scripts/                dev-only shape build (build-shapes.mjs, shape-catalog.mjs, shape-sources/),
                        shapes-preview.html contact sheet (not shipped)
tests/                  Vitest suites
reference/              screenshots of the original game (design target)
legacy/                 the old single-file version, kept for reference
```

## Levels and difficulty

Every level is generated from its number, so a level is always the same. The generator places arrows in reverse: each new arrow may only point at arrows placed before it or off the board, so removing them in creation order always works. The solver verifies every board anyway.

Difficulty is measured, not guessed:

| Metric          | Meaning                                                                           |
| --------------- | --------------------------------------------------------------------------------- |
| Blocking depth  | How many arrows must leave before a given arrow is free                           |
| Free at start   | Arrows you can safely tap on the first move                                       |
| Rounds          | Removal waves when every free arrow leaves at once                                |
| Free per round  | Arrows / rounds: how many options you have at a time (lower = harder)             |
| Longest chain   | Longest "A is blocked by B, B by C ..." chain of nearest blockers, in arrows      |
| Decoy ratio     | Share of arrows blocked by exactly one arrow: they look free but cost a heart     |
| Edge-free ratio | Share of the first moves whose head sits on the outer ring (lower = hidden moves) |

All are worked out by `analyzeLevel` (`src/engine/difficulty.js`, `src/engine/metrics.js`).

**First levels.** Level 1 is drawn by hand like the reference: three straight arrows (two up, one down) with the tutorial hand. Level 2 has 6-8 arrows, level 3 has 12-16 arrows and needs 2-3 removal rounds.

**The curve (level 4 onward).** `difficultyFor(level)` in `src/engine/difficulty.js` gives every number a level needs: grid size, target arrows, max free arrows at start, min average depth, min solve rounds, long-arrow share and shape scale. Each value rises a little on every level and never goes back: a square-root ramp (fast early, slower later) grows the board from 16x21 at level 4 to 42x54 at level 200. After that the board stays the same size and difficulty keeps rising on a log scale up to level 20,000: deeper blocking (0.21 to 0.225 x arrows), more solve rounds (0.17 to 0.18 x arrows), more long arrows (17% to 20%). All constants live in `LEVELS.curve` in `src/config.js`; the per-tier floors live in `TIER_FLOORS`.

**Tier floors (3.12.0).** Every board from level 4 must meet its tier's floors. Depth and rounds are the curve above times `boost` (+40% compared with 3.11.0). Each tier is at least as strict as the one before, so difficulty never drops from level N to N+10.

| Tier       | Levels  | Max free at start | Max free per round | Depth / rounds | Min longest chain | Min decoys | Max edge-free |
| ---------- | ------- | ----------------- | ------------------ | -------------- | ----------------- | ---------- | ------------- |
| Normal     | 4-30    | 2                 | 3.0                | +40%           | 8                 | 12%        | 60%           |
| Hard       | 31-100  | 2                 | 3.0                | +40%           | 14                | 12%        | 50%           |
| Super Hard | 101-999 | 2                 | 3.0                | +40%           | 20                | 12%        | 50%           |
| Expert     | 1000+   | 2                 | 3.0                | +60%           | 22                | 12%        | 50%           |

Levels 1-3 (the tutorial) are unchanged. Expert pays x2.5 coins (the cap).

**Arrow shapes and blocking (3.17.0).** From level 4 arrows are longer and bend more, and block each other more (levels 1-3 are unchanged):

- **Lengths:** at least 3 cells. A 2-cell arrow only appears as a last resort to fill a gap (at most 3% of a board). Normal arrows aim for 3-5 or 6-10 cells; some blocked arrows start long (11-25 cells: snakes, spirals, U-turns), and late arrows are joined into long walls. The mix is about 40% 3-5, 37% 6-10 and 21% 11-25 cells (Expert ~23%), and long arrows leave later than average in the solve.
- **Bends:** at most 30% of arrows are straight (the tier's `maxStraight`, 24% on Expert), and a straight arrow is at least 4 cells long. Average turns per arrow: about 2.5-2.7.
- **Tidy pass** (`src/engine/tidy.js`): an arrow under 3 cells, or a straight one under 4, first grows its tail into empty cells next to it, then takes the last cell of a neighbour's tail, then joins a neighbour end to end; a stub nothing can fix is dropped within the fill budget. Every step keeps the board solvable: an arrow never takes a cell or a neighbour it waits for (no cycle), and nothing becomes free.
- **New metrics** (`analyzeLevel`): `blockersAhead` (arrows in the straight line in front of each head at the start), `blockedShare`, `straightShare`, `shortShare`, `straightStubs` and `avgTurns`. New floors per tier (`TIER_FLOORS[tier].arrowShape`): average blockersAhead at least 2.5 (Normal), 3 (Hard), 3.5 (Super Hard), 4 (Expert); at least 90% of arrows blocked at the start; at most 3% 2-cell arrows; no 3-cell straight arrows. The earlier floors (depth, rounds, chain, decoys, free per round) are unchanged.

| Tier       | Avg length | 2-cell | Straight | Turns | blockersAhead | Blocked at start | 3-5 / 6-10 / 11+ | Depth (before) |
| ---------- | ---------: | -----: | -------: | ----: | ------------: | ---------------: | ---------------- | -------------: |
| Normal     |        7.8 |   0.2% |      19% |  2.47 |          4.41 |              95% | 42 / 40 / 18%    |    34.7 (32.6) |
| Hard       |        8.0 |     0% |      19% |  2.55 |          5.60 |              97% | 43 / 38 / 20%    |    64.8 (62.5) |
| Super Hard |        8.4 |     0% |      17% |  2.70 |          6.85 |              97% | 40 / 39 / 22%    |  107.7 (105.7) |
| Expert     |        8.4 |     0% |      16% |  2.73 |          7.46 |              97% | 39 / 38 / 23%    |  129.5 (122.5) |

Boards hold fewer, longer arrows, so the average depth (arrows that must leave first) first came out lower on Normal and Hard. The **depth aim** (`depthAim` / `depthPicks` in `TIER_FLOORS[tier].arrowShape`) brings it back: on Normal and Hard a board that meets every floor but is shallower than `depthAim` x the depth floor (1.9 Normal, 1.6 Hard) is kept, and up to 8 (Normal) or 4 (Hard) boards are tried; the first one at the aim wins, else the deepest. It is count-based, so levels stay the same for the same number. On the tested samples the average depth is now 34.7 on Normal (32.6 before 3.17.0) and 64.8 on Hard (62.5); a test keeps them at least 32.4 and 60.6. Builds stay fast (Normal and Hard under 80 ms locally). Some single levels are still shallower than before (level 30: 43.5, was 49.7): its letter shape holds 111 arrows instead of 133, and more tries do not go much further. Normal blocked arrows also start long a little more often (`nativeLong` 0.2, was 0.18), so deeper boards keep their 11+ cell arrows.

**Snake arrows (3.18.0).** From level 4 boards look like the reference puzzles: long arrows that turn often, run in lanes next to each other, wrap round other arrows, and fill almost the whole board (levels 1-3 are unchanged). Targets per tier are in `TIER_FLOORS[tier].arrowShape`:

| Target                | Normal | Hard | Super Hard | Expert | Checked              |
| --------------------- | -----: | ---: | ---------: | -----: | -------------------- |
| Avg arrow length      |     9+ |  10+ |        11+ |    12+ | tier average (tests) |
| Arrows with 15+ cells |   15%+ | 20%+ |       25%+ |   30%+ | tier average (tests) |
| Avg turns per arrow   |   3.5+ |   4+ |       4.5+ |     5+ | every level (floor)  |
| Arrows with 3+ turns  |   45%+ | 50%+ |       55%+ |   60%+ | tier average (tests) |
| Straight arrows       |   12%- | 10%- |        8%- |    6%- | every level (floor)  |
| Wrap ratio            |   20%+ | 25%+ |       30%+ |   35%+ | tier average (tests) |
| Hug ratio             |   50%+ | 55%+ |       60%+ |   65%+ | every level (floor)  |
| Board fill            |   97%+ | 97%+ |       98%+ |   98%+ | every level (floor)  |

Metrics (`src/engine/styleMetrics.js`, also in `analyzeLevel`): **wrap ratio** is the share of arrows with a cell of another arrow inside them, on 3 of its 4 sides within 6 cells (a U, hook or spiral round it; a line or an L can't). **Hug ratio** is the share of arrow cells with a neighbour across their run that belongs to another arrow running the same way (lanes side by side). **Fill** is the share of usable cells covered.

How boards are built:

- **Snake growth** (`grow.js` growSnake): each step turns with the tier's chance `turn` (0.6-0.68, Expert 0.66 since 3.19.0; more after a straight run), prefers cells with few free neighbours (hugging walls and arrows), and keeps touching the arrow it follows, also at a corner, so it goes round that arrow's end (`follow`). Body cells are always free cells that no placed arrow's way out crosses, so the body shape never affects solvability.
- **Lengths:** 3-5, 6-14 (`mediumShare`) and long 15-40 cells (`nativeLong`, drawn more often as the board fills, so long arrows leave later than average). No arrow is longer than 40 cells.
- **Fill pass** (`fill.js`, after the hard-board passes): tails grow into empty cells, heads move forward into the empty cells in front of them, bodies step out into 2-cell gaps (battlement bumps), and new arrows grow through empty pockets of 3+ cells with an arrow in front. A cell is only taken when its arrow waits for none of the arrows whose way out crosses it (no cycle), never in its own way out, never in a free arrow's way out (the first moves stay as they were), and in a decoy's way out only by that decoy's one blocker (decoys stay decoys).
- **Bigger boards** (`boardScale` 1.25 / 1.3 / 1.4 / 1.55 x the cells; 1.25 / 1.4 / 1.65 / 1.8 since 3.19.0): longer arrows mean fewer arrows on the same board, and depth follows the arrow count. With bigger boards every tier is at least as deep as before. Snake boards need at least 60% of the old minimum arrow count (`SNAKE.arrowsShare`). The depth and rounds floors are absolute, so they did not change.
- **Decoys:** heads with exactly one arrow in front are preferred more while peeling (`decoyBias` 30, was 10), because long snakes cross more rays and cutting decoys out of them would leave gaps.

Measured on the tested samples (10 Normal, 8 Hard, 10 Super Hard, 8 Expert levels; before = 3.17.0):

| Tier       | Avg length | 15+ cells | Turns | 3+ turns | Straight | Wrap | Hug | Fill | Depth (before) | blockersAhead (before) |
| ---------- | ---------: | --------: | ----: | -------: | -------: | ---: | --: | ---: | -------------: | ---------------------: |
| Normal     |  7.5 → 9.9 |  11 → 16% |  4.48 |      55% |  22 → 4% |  24% | 81% |  99% |    35.6 (34.7) |              5.2 (4.4) |
| Hard       | 7.6 → 11.5 |  12 → 24% |  5.00 |      59% |  19 → 4% |  28% | 85% |  99% |    65.0 (64.8) |              7.4 (5.7) |
| Super Hard | 8.3 → 12.9 |  15 → 32% |  5.88 |      64% |  17 → 3% |  31% | 85% |  99% |  112.6 (106.9) |             10.5 (6.8) |
| Expert     | 8.4 → 13.7 |  14 → 36% |  6.47 |      66% |  16 → 3% |  34% | 84% | 100% |  144.5 (132.5) |             11.4 (7.4) |

Every target is met on average except **Expert wrap: 34% (target 35%)**. Stronger wall-following stops helping past `follow` 6, and joining short arrows into neighbours added about one point but lowered Expert depth below 3.17.0, so it was left out. Turns per arrow were 2.3-2.7 before; wrap was 10-12%. Some single levels are a little shallower than before (level 10: 31.7, was 34.2; level 1000: 125.9, was 130.9) while their tiers are deeper on average; every level meets its depth floor.

**Direction mix (3.19.0).** Arrows in one area used to point the same way: when the front arrow left, the arrows behind it became free one after another, like a queue. Depth looked high but the level was easy. New metrics (`src/engine/dirMetrics.js`, also in `analyzeLevel`):

- **sameDirBlock:** share of blocked arrows whose blocker right in front points the same way. **crossBlock:** share of those blockers pointing across or against (the rest). Two heads facing each other on one line can't happen on a solvable board (each would wait for the other), so "against" means the blocker's body crosses the line. `sameDirBlockAll` / `crossBlockAll` count every arrow in the way out (reported, not targeted).
- **queueMoves:** a player removes one arrow per move (the one free the longest); a move counts when an arrow it frees points the same way and had the removed arrow right in front of it.
- **localDirMix:** the share of the most common head direction in 12 x 12 windows with 6+ heads (mean over windows; `localDirMixWorst` is the highest). 25% is perfectly mixed, random is about 40%. (6 x 6 windows hold only 1-2 heads with long arrows, too few to measure.)

| Target (`TIER_FLOORS[tier].arrowShape`) |     Normal |       Hard | Super Hard |     Expert |
| --------------------------------------- | ---------: | ---------: | ---------: | ---------: |
| sameDirBlock                            |      ≤ 30% |      ≤ 25% |      ≤ 20% |      ≤ 15% |
| queueMoves                              |      ≤ 20% |      ≤ 15% |      ≤ 12% |      ≤ 10% |
| localDirMix (mean / worst window)       | ≤ 55 / 75% | ≤ 50 / 70% | ≤ 45 / 65% | ≤ 45 / 65% |
| crossBlock                              |      ≥ 60% |      ≥ 65% |      ≥ 70% |      ≥ 75% |

How:

- **Head choice** (`heads.js` dirScore): while peeling, a head whose arrow right in front points the same way costs a lot (`queue`), one pointing across or against gets a bonus, and heads pointing the same way as nearby heads (4 cells) or as too many arrows on the board cost more (`near`, `balance`: a fill front sweeping one way used to point most heads one way, e.g. 1 of 107 arrows pointed down on level 30).
- **Plugging** (`grow.js` queueRisk): a growing body prefers cells where a head would line up right behind a same-way arrow, so fewer such heads are left.
- **More rounds on purpose:** queues made many solve rounds cheaply, so without them arrows per round rose over the floor (3). Heads behind the latest arrows are preferred more (`roundBias` 1.2, was 0.3), which builds longer chains instead.
- **Picks:** up to `dirPicks` boards that meet every floor are tried (3, Expert 2) for one under both direction targets; else the closest is used. Without a depth aim the extra boards stop at that attempt number, so slow levels pay nothing more. Plain boards (engine tests only) have no direction targets: a rectangle fills as one front.

Measured on the tested samples (before = 3.18.0):

| Tier       | sameDirBlock | queueMoves | crossBlock | localDirMix mean / worst | sameDirBlockAll |         Depth |        Rounds |
| ---------- | -----------: | ---------: | ---------: | -----------------------: | --------------: | ------------: | ------------: |
| Normal     |     48 → 13% |    33 → 8% |   52 → 87% |       54 / 70 → 48 / 65% |        41 → 33% |   35.6 → 34.3 |   51.5 → 43.5 |
| Hard       |     49 → 12% |    36 → 8% |   51 → 88% |       55 / 80 → 51 / 73% |        38 → 37% |   65.0 → 61.6 |   86.6 → 66.0 |
| Super Hard |     57 → 16% |   43 → 11% |   43 → 84% |       62 / 92 → 53 / 83% |        44 → 41% | 112.6 → 114.7 | 134.2 → 113.0 |
| Expert     |     60 → 14% |    46 → 9% |   40 → 86% |       60 / 96 → 56 / 88% |        43 → 41% | 137.5 → 137.8 | 156.6 → 135.1 |

- sameDirBlock, queueMoves and crossBlock meet the targets on average in every tier. Every Normal and Hard level meets both direction targets; 6 of 10 Super Hard and 5 of 8 Expert sample levels do, the rest are the closest board and never over twice a target.
- localDirMix meets the target on Normal only (Hard 51%, Super Hard 53%, Expert 56% against 50 / 45 / 45%; worst windows 73-88% against 70 / 65 / 65%). It gave way to the queue targets.
- Rounds are 14-24% lower and depth on Normal and Hard is 3-5% lower: queues made both look higher than the play was. Every level still meets its depth, rounds and free-per-round floors, and the tier averages stay above the depth floors the tests keep (32.4 / 60.6 / 106.9 / 127.3). The snake targets (length, turns, wrap, hug, fill) still hold.

**Expert is clearly harder (3.14.0).** Expert boards get 6 more cells on each side (`boardGrow`, never past 104 cells, `growUpTo`), and their depth and solve-round floors are the curve x1.6 (`boost`, Super Hard x1.4). More arrows make longer chains. Measured on the same tested levels (400 Super Hard, 200 Expert):

| Metric (average)    | Super Hard (101-500) | Expert (200 random) | Expert vs Super Hard |
| ------------------- | -------------------: | ------------------: | -------------------: |
| Depth               |                106.4 |               122.9 |               +15.4% |
| Free arrows / round |                 2.76 |                2.82 |                +0.06 |
| Longest chain       |                 32.2 |                35.7 |                 +11% |
| Arrows              |                  321 |                 368 |                 +15% |
| Board side          |                   77 |                  84 |                   +7 |
| Build time (median) |                38 ms |               50 ms |                      |

A test checks that Expert's average depth is at least 14% above Super Hard's. Fewer free arrows per round on Expert needs a new generator pass (not done yet): on bigger boards free per round is a little higher, not lower.

**Floor fallback** (Expert only, `floorFallback` in `TIER_FLOORS`): bigger boards miss a floor more often, and each retry costs about 60 ms. After 2 attempts the generator takes the best attempt that missed only free per round (by at most +0.2), decoys (by at most 2 points) or the longest chain (by at most 2). Depth and solve rounds are never relaxed. It is count-based, so levels stay the same for the same number; `level.relaxed` names the floors it missed. In the 200 tested Expert levels 21 use it (13 free per round up to 3.18, 6 decoys down to 10.6%, 4 longest chain down to 20; 2 of them miss two floors). Every Expert level builds in under 300 ms locally (slowest 220 ms).

**Requested targets vs what ships.** The starting targets were tuned so every level still builds fast. Normal and Hard reach their targets except where a later tier's floor had to be lower (floors may never get easier from one tier to the next). On the full-size 42x54 board (~270 arrows) Super Hard and Expert could not reach the targets fast enough, so their floors were set close to what the generator reliably reaches:

| Floor              | Normal target / set | Hard target / set | Super Hard target / set | Expert target / set |
| ------------------ | ------------------- | ----------------- | ----------------------- | ------------------- |
| Max free at start  | 2 / 2               | 2 / 2             | 1 / 2                   | 1 / 2               |
| Max free per round | 3 / 3.0             | 2.5 / 3.0         | 2 / 3.0                 | 1.5 / 3.0           |
| Depth and rounds   | +40% / +40%         | +40% / +40%       | +40% / +40%             | +50% / +40%         |
| Min longest chain  | 8 / 8               | 14 / 14           | 20 / 20                 | 28 / 22             |
| Min decoys         | 15% / 12%           | 20% / 12%         | 25% / 12%               | 30% / 12%           |
| Max edge-free      | 60% / 60%           | 50% / 50%         | 40% / 50%               | 30% / 50%           |

Typical boards beat the floors: free per round is about 1.8-2.3 on Normal and Hard and 2.5-2.9 on Super Hard and Expert, decoys are 15-30%, solve rounds are about 1.4-2.5x what they were in 3.11.0.

**How hard boards are built** (`src/engine/hardBoard.js`, settings in `LEVELS.curve.hardness`):

- A short empty corridor (1-2 cells) runs in from one edge, so the one free arrow chosen on purpose sits inside the board. Other free arrows on the edge are trimmed, turned around or removed.
- The peeling prefers heads behind the latest arrows (long chains) and heads with exactly one arrow in front (decoys).
- Arrows are turned around (tail becomes head) when that makes them leave later. A turn is only kept when nothing in the new way out waits for the arrow and the way out does not cross its own body, so every board stays solvable.
- Short arrows are joined onto the tails of arrows that leave later, building long walls that come out late and cutting the free arrows per round.
- A few tail cells are cut so some arrows end up with exactly one arrow in their way (decoys), within the fill floor (90%).
- A board that misses its depth, free-per-round or decoy floor by a little is repaired; otherwise the generator retries with the next seed.

There is no last level: any level number works (tested up to 1,000,000) with the same deterministic seeds.

**Arrow lengths.** About 70% short (2-6 cells), 15-20% medium (7-12) and 10-15% long (13-30). Long arrows are made after the board is built by joining neighbouring arrows onto the tail of a deep arrow (`src/engine/longArrows.js`). The deep arrow keeps its head, so it still leaves late, and the long body becomes a wall that blocks many others. A neighbour is only joined when it is not one of the arrow's blockers (directly or through a chain), which keeps every board solvable.

Two arrows pointing straight at each other on the same line can never appear: each would block the other forever, so the "trap look" comes from arrows that point at each other's bodies or across each other instead.

**Plain and shape levels (3.20.0)**: from level 4, two plain rectangle boards, then one shape board from the shape library, repeating: 4 plain, 5 plain, 6 shape, 7 plain, 8 plain, 9 shape... (`isShapeLevel`, `LEVELS.shapeFrom` and `LEVELS.shapeEvery` in `src/config.js`). On the Levels path, shape levels show their exact board outline; plain levels show their state (number, check, crown, lock, star every 10th level). Shape Solver counts shape levels only, and finished levels keep counting as before.

- **Plain boards** keep every floor, the snake targets and the direction targets. They hold as many usable cells as a shape board of the level (`shapeScale`; Super Hard 1.1x and Expert 1x the plain cells: `plainArea`, so Expert keeps the most arrows ahead and the deepest boards). A plain rectangle has no outside cells, so the fill can only start at free arrows: plain boards start it from two (`SNAKE.plainSeeds`, the start-free floor allows 2), the second as far as possible from the first (`seedFar`), and build less behind the latest arrows (`plainRoundBias` 0.6), so two fronts meet in the middle instead of one front pointing every head one way. A plain board far over the direction targets straight after peeling (more than 25% over) is dropped before the costly hard-board passes (at most 2 per level, `buildLevel` `early`), and Expert plain boards try 3 boards for the direction targets (`plainDirPicks`).
- **Expert direction gap (accepted):** with two plain boards in every three levels, Expert can't reach both direction targets within the build time limit on every sample: the tested Expert levels average 13.8% same-way and 9.6% queue moves, but only 3 of 8 meet both targets on their own, and the test allows up to 15% / 11% (`DIR_REACHED` in `tests/dirMix.test.js`). The targets stay 15% / 10% in config. More tries per level reach them more often but take 330-360 ms; smaller plain Expert boards are faster but go under the Expert depth floor.
- **Order** (`src/engine/shapes/plan.js`): shape levels come in slots of four, repeating: a letter, another shape, a number, another shape. Letters go strictly A, B, C ... Z, then A again (level 6 is A, B is level 18, C 30, Z 306, A again 318); numbers go strictly 1, 2 ... 9, 0, then 1 again (1 is level 12, 2 is 24, 0 is 120). The other slots show the 685 other shapes once per cycle: their library order is split in two halves (easier, more compact shapes first; shapes that need a big board in the second), a shape stays in its half, so it never comes back within half a cycle, and inside a half the categories are mixed at random (seeded, a new mix per cycle), never the same category twice in a row, also across halves and cycles. Later cycles get bigger boards, as the size curve keeps growing with the level.
- **No shape level becomes plain**: a shape that misses its floors gets more seeds, then two bigger boards, then the next shapes of its cycle (logged with `console.warn`, so a shape that fails often can be removed).
- Every shape board is at least its shape's minimum size (`minBoardSide` in `src/engine/masks.js`) and its mask is smoothed at board size (see [Shape library](#shape-library)).

Shape boards are square and grow with the level: the shape holds `shapeScale` (1.0 to 1.25) times the cells of that level's plain board (`shapeSize` in `src/engine/levels.js`, up to 90 wide), so later shapes are bigger and a small shape like the arrow gets a bigger board than a full one like the plus. Shape levels meet the same floors as the tier asks of any level (arrow count, depth, rounds, free per round, longest chain, decoys). Only the start-free cap is wider and the edge-free floor does not apply: a jagged edge lets more arrows out, and those sit on the shape's edge, so a shape board may start with the level's cap + 2 free arrows, or 10% of its arrows if that is more (3.17.0; it was + 12 or 14%). Every board from level 4 also has at least 90% of its arrows blocked on the first move.

After building, extra free arrows are turned around or joined onto a neighbour (only when that can't create a cycle), so boards reach the low free-at-start caps. If a board still misses its goals, the generator retries with the next derived seed. Levels 1-500 plus 200 random levels up to 1,000,000 are tested for solvability, floors, determinism and build time (under 150 ms locally, 300 ms on CI). Build time is the median of three builds, and the speed test files (`generator`, `shapeBoards`, `hitTest`) run in their own step, one file at a time (`npm run test:timing`), so other tests running in parallel can't make them flaky. The slowest tested level is Super Hard level 341 (Hanger) at about 250 ms on the cloud test machine: Hanger is a thin shape, so its board grows to 137 cells to hold enough arrows, and it needs 6 attempts (the first misses free per round by 0.08). Every other tested level is under about 170 ms.

Build time and retries per tier (3.12.0, measured on the cloud test machine, which is slower than a laptop; the same 700 levels):

| Tier       | Median | 95th percentile | Slowest | Most retries | Mean retries |
| ---------- | ------ | --------------- | ------- | ------------ | ------------ |
| Normal     | 5 ms   | 10 ms           | 12 ms   | 11           | 0.6          |
| Hard       | 12 ms  | 22 ms           | 31 ms   | 1            | 0.1          |
| Super Hard | 38 ms  | 101 ms          | 208 ms  | 6            | 0.5          |
| Expert     | 54 ms  | 173 ms          | 245 ms  | 9            | 1.2          |

On that machine 21 of the 700 levels (all Super Hard or Expert) take over 150 ms; none take over 300 ms.

### Shape library

721 shapes in 10 categories, built by a script on a 64-cell grid from open icon sets and fonts, plus 6 of our own hand-drawn shapes. 447 are in play; 274 stay out (they do not read as their name from the silhouette, or are too slow to generate; see below).

| Category  |   Built | In play (3.13.0) | In play |
| --------- | ------: | ---------------: | ------: |
| Letters   |      26 |               26 |      26 |
| Numbers   |      10 |               10 |      10 |
| Symbols   |      65 |               57 |      56 |
| Transport |      65 |               34 |      42 |
| Objects   |     153 |              102 |     108 |
| Food      |      70 |               32 |      39 |
| Fruits    |      53 |               26 |      27 |
| Nature    |      72 |               34 |      39 |
| Animals   |     145 |               48 |      73 |
| Others    |      62 |               30 |      27 |
| **Total** | **721** |          **399** | **447** |

- **Build** (`npm run shapes:sources` once, then `npm run shapes:build`): `scripts/build-shapes.mjs` renders each entry of `scripts/shape-catalog.mjs` to a filled silhouette: letters and numbers from Inter Black (Roboto Slab as a fallback), icons from Font Awesome solid, game-icons.net, Material Symbols, Tabler filled and Fluent Emoji, and the game's 20 original shapes (same ids, so saves keep working). Each is downsampled to 64 cells on its longest side (aspect ratio kept). Small holes are filled. Parts thinner than 4 cells (legs, tails, wings, stems) are thickened instead of cut off: a morphological dilation of the thin parts only, run twice, so a 1-cell line ends up 5 cells wide and is still 2+ cells wide on a board half the size. Then single-cell spurs and notches are smoothed and only the main connected area stays. A shape that shipped before and now misses the quality filter is kept (for old saves) but out of play. The game only reads the generated JSON.
- **Quality filter** (`src/engine/shapes/quality.js`, also run by the tests on every shape in play): fill 25-85% of the bounding box, no longer than 2.5:1, no part thinner than 2 cells at 32x32, one connected area, and still connected and similar (70%+ overlap) at 32x32. Every rejected source is logged with the reason; a name tries its next source until one passes.
- **Excluded on purpose**: brand logos, copyrighted characters, country flags, religious or political symbols, weapons, armour and violence, skulls and bones, blood, alcohol, cigarettes, drugs and anything offensive. A keyword scan of names and sources runs before each release (3.8.0 removed Soda, whose icon was a cocktail glass, and the Viking and Knight helmets).
- **Files**: `library.json` (168 KB, 79 KB gzipped, tested to stay under 150 KB gzipped; one row per shape with id, name, category, width, height, source, license and the run-length-encoded mask) is a lazy chunk preloaded after the home screen. `index.json` (8 KB, category -> ids) is in the main bundle for the collection counts and achievements. `scripts/shapes-preview.html` is a contact sheet of every shape plus the rejected list; it is not part of the build.
- **Library order**: categories take turns, first in the order of `LEVELS.shapeRotation` (animals, food, letters, transport, nature, objects, fruits, symbols, others, numbers), then in proportion to what each category has left; inside a category compact shapes come first. The levels shuffle each half of this order per cycle (see [Shape levels](#levels-and-difficulty)).
- **Clean masks at board size** (`makeMask` in `src/engine/masks.js`): after sampling the shape at cell centres, single-cell spurs and bumps (a cell with at most one filled neighbour) are removed and single-cell notches and holes (an empty cell with three or four filled neighbours) are filled, so the outline stays the same but loses its noise.
- **Minimum board size** (`minBoardSide`): the smallest square board on which the shape is one piece and overlaps a smooth area-average of its outline by at least 88% (`SHAPE_BOARD` in `src/config.js`). A board never goes below it; small, detailed shapes get more cells.
- **Contact sheet** (`npm run shapes:sheet`, `scripts/shape-sheet.mjs`): the real generated board of every shape at its first level next to its silhouette, with its name, level, size and build time. It flags shapes whose arrows cover less than 85% of the mask, whose outline breaks apart or strays from the shape (under 80% overlap), that needed more than 20 attempts or a fallback. In 3.14.0 no shape was flagged.
- **Checked by eye** (3.14.0): every built shape, including the 222 taken out in 3.13.0, was looked at as a board silhouette at 32 and 56 cells. Only shapes a kid could name stay in play. For some popular names a clearer source was picked first (Butterfly, Rabbit, Ghost, Robot, Rose, Cake, Burger, Ice Cream, Ice Pop, Watermelon Slice, Crab). 83 shapes came back, 47 new ones joined, and 82 that were in play went out. Everything out of play is in `src/engine/shapes/removed.js` with its reason; it stays in the library, so a save that collected it keeps it.
- **Big-board shapes** (`SHAPE_MIN_SIDE` in `removed.js`): 49 shapes with thin legs, wheels or many small parts only read well from about 48 cells (Bicycle, Spider, Butterfly, Helicopter, Grapes...). They get that minimum board and always come in the second half of a cycle (`SHAPE_BOARD.lateSide`), where boards are already that big, so no early level gets bigger or slower.
- **Hand-drawn shapes** (`scripts/shape-drawings.mjs`, source `draw:`): our own designs made from plain geometry (circles, ellipses, polygons, thick bars) on the 64-cell grid, not traced from any icon set, for names no icon read well: Lion (puffy mane, face gap, eyes), Fox (pointed ears and snout, bushy tail), Letter Q (thick tail), Clock (thick rim, thick hands touching the rim), Pizza Slice (round crust, pepperoni holes) and Tiger Head (round ears, forehead and cheek stripes, eyes). They go through the same clean-up and quality filter. Lion, Clock and Tiger Head have a 32-cell minimum board so their eyes, face gap and hands show.
- **Speed**: 12 shapes are out because they were the slowest to generate (holes and thin rims make the generator retry): Bandage, Baseball, Box, Bush, Cross Circle, Die, Ice Cube, Jack O Lantern, Meeple, Question, Sparkle, Squid. Median build time on a big Expert board is about 57 ms (53 ms in 3.13.0). Every tested level is under the 300 ms CI limit; 21 of the 713 tested levels are over the 150 ms local target (9 in 3.13.0), because the 64-cell outlines have more edge detail.
- **Credits**: sources that need attribution are listed in `CREDITS.md` and in the app, under the quiet "Credits" link at the very bottom of the Profile tab (3.20.0; it was in Settings).

### Shape Collection (hidden)

Won shapes are always saved (`progress.shapes`). The Profile section that shows them by category and the "New shape collected" toast are hidden while `SHOW_SHAPE_COLLECTION` in `src/config.js` is `false`; set it to `true` to bring both back as they were in 3.7.0. Test-mode plays don't collect anything.

### Zoom

- **Default zoom:** when a level starts, if the cells would be smaller than 18px when fitted, the board opens zoomed in so a cell is about 22px. The first view is never an empty area: `startFocus` (`src/input/zoomMath.js`) picks the view-sized window nearest the board centre that is at least 80% arrow cells, and on a big board (the view shows under a quarter of it) one that also holds a free arrow, so ring and hollow shapes (Watch, Donut, Ring) open on arrows, not on their hole. Boards whose cells are 18px or more open fully fitted. Both values are `ZOOM.zoomBelowPx` and `ZOOM.startCellPx` in `src/config.js`.
- **Gestures:** pinch to zoom out to the whole board or in further (until a cell is about a fingertip wide), drag with one finger to move. Desktop browsers zoom with Ctrl + mouse wheel or a trackpad pinch. There is no double tap (3.20.0): pinching is the only way to zoom, so taps never wait.
- **Fit (fully zoomed out):** the furthest a player can zoom out shows the whole board, every arrow and all four edges, with a margin (`fitCellPx` in `src/input/zoomMath.js`). Cells have no minimum size any more (they had 6px, which cut big boards off at the sides on phones); arrowheads and lines always stay inside their own cell, so fitting the grid fits every arrow. A dense board that fits in 2-3px cells opens zoomed in and can zoom up to 20x (`ZOOM.maxScale`) to reach a fingertip-wide cell. Zoomed in, panning reaches every edge. A test checks every level of the first shape cycle and a spread of later ones at 360-1024px.
- **Rendering** (`src/render/canvasBoard.js`): the board is drawn on canvas, not SVG, so zooming never shows half-drawn arrows or loose heads. Three canvases: the whole board's resting arrows (drawn once per level and size, up to devicePixelRatio x the furthest zoom, capped at 2M pixels), a sharp copy of just the visible part when zoomed in further than that (drawn 100 ms after a pinch, pan or wheel zoom stops, `ZOOM.sharpMs`), and a small fx canvas over the visible part for the arrows that move or change colour (the only one redrawn every frame). During a gesture the zoom is a CSS transform on the board card: the bitmaps are stretched and always complete. A tap only redraws the box around the arrow that starts or stops moving. Same look as before: round caps and joins, every arrowhead shape, theme colours, dark mode, arrow styles and board backgrounds. The victory mini board and shop previews stay small SVGs.

### Taps

- Feedback is instant: the arrow under the finger lights up on pointerdown (drawn on the fx canvas over its resting copy) and acts on pointerup.
- Hit test (`arrowAt` in `src/input/board-input.js`): the cell under the finger gives the arrow straight from the occupancy grid; otherwise only the arrows in the 3x3 cells around it are measured, nearest within 0.45 cell. Constant time on any board.
- A release is a tap when the finger moved less than 10 px and was down less than 350 ms (`TAP` in `src/config.js`); anything else is a pan or pinch.
- The board uses `touch-action: none` and has no transform transitions, so nothing delays a tap, and the next arrow can be tapped while the previous one is still sliding out.
- **Zoom guide:** when a level starts zoomed, two hands show "Pinch to zoom". It appears on the first 3 zoomed levels, then only while the player has never pinched. It fades on the first touch or after 3 seconds and never takes taps.
- **Hints:** a hint pans (keeping the zoom) so the highlighted arrow is on screen.
- **Levels page:** only a few chapters around the current level are rendered; more load while scrolling up or down, with no end.

### Levels page (path)

The Levels page is a winding path (`src/ui/screens/levels/`), our own design:

- **Chapter banner** (`chapterBanner.js`): gradient card with "CHAPTER n", the chapter name, progress (e.g. 12/20) and the chapter reward; it sticks to the top while its chapter scrolls by.
- **Nodes** (`pathNode.js`): round 3D buttons (darker bottom edge, soft shine) in a gentle S-curve. The current level is bigger with a pulsing ring and a START bubble, locked ones are grey, every 10th level is an amber star node (a corner badge marks them done). From level 4 every node shows its level's board outline: `levelMask(n)` gives the same shape, size and mask the generator uses, drawn as crisp vector cells (sharp at any size, light and dark). The tutorial levels show a check, a crown or their number. A test checks that the icon and the game board use the same shape and mask for levels 4-1000.
- **Chest** after each chapter's last level: closed, wiggling when the chapter is finished but not paid yet, and open once the chapter reward is paid (the opening animation plays once).
- Light arrow and dot doodles fill the space beside the curve. A round button at the bottom right jumps back to the current level when it is off screen.
- Performance (`pathView.js`): at most 8 chapters (160 nodes) are in the DOM; more are added while scrolling and far ones are removed, and off-screen chapters skip layout (`content-visibility`). Checked with 50,000 unlocked levels: no long tasks while scrolling.
- Locked nodes shake with a "Complete level X first" toast; `TEST_UNLOCK_ALL` opens every node.

## Economy

All numbers live in `src/config.js`.

### Earning

| Event                                                       | Coins                                                  | Diamonds                       |
| ----------------------------------------------------------- | ------------------------------------------------------ | ------------------------------ |
| Level complete                                              | 10                                                     |                                |
| Each heart left at the end                                  | +5                                                     |                                |
| Board size                                                  | +1 per 10 arrows                                       |                                |
| Difficulty multiplier (base + hearts + size)                | Normal x1, Hard x1.5, Super Hard x2, Expert x2.5 (cap) |                                |
| Perfect level (no heart lost, no hint used), first time     | +20                                                    | +1                             |
| Replay of a completed level                                 | 25% of base + hearts                                   |                                |
| Every 10th level, first clear (adds to the perfect diamond) |                                                        | +1                             |
| Chapter complete (20 levels), once                          | +100                                                   | +2                             |
| Daily reward (7-day cycle)                                  | 20 / 30 / 40 / 50 / - / 70 / -                         | day 5: +1, day 7: +2 (+1 hint) |
| Achievements                                                |                                                        | 1-15 per step                  |
| Free hint every 3 levels completed                          | (+1 hint)                                              |                                |
| XP per win                                                  | 10 XP + 5 XP per heart left                            |                                |

### Spending

Prices went up in 3.22.0 (coin items about x2, diamond items about x1.5). Items already owned stay owned.

**Combo prices** (3.22.0): an item can cost coins and diamonds together (`{ coins, diamonds }` in `src/config.js`). The card shows both icons ("[coin] 600 + [gem] 3"), buying needs both amounts, and when either is short the dialog says exactly what is missing ("Need 120 more coins and 1 more diamond"). The Weekly Sale takes 30% off both parts. The premium avatars no longer show a price on the Profile avatar picker, only a lock (the Shop shows the price).

| Item                                  | Price                   |
| ------------------------------------- | ----------------------- |
| Hint (once free hints run out)        | 90 coins                |
| 5-hint pack                           | 350 coins               |
| Refill 1 heart (max 2 per level)      | 150 coins               |
| Continue after game over, full hearts | 3 diamonds              |
| Arrow styles: Dark Slate, Olive       | 600 coins               |
| Arrow style: Soft Mint                | 8 diamonds              |
| Themes: Royal Purple, Lagoon Teal     | 800 coins               |
| Arrow style: Rose Gold (new)          | 800 coins + 4 diamonds  |
| Arrow style: Neon Night (new)         | 1100 coins + 6 diamonds |
| Theme: Sunset Coral                   | 12 diamonds             |

### Hints

Bought in the Shop (Hints tab) or from the hint button. Using a hint means the level does not count as perfect. Hints used are still tracked in the save (not shown on the Profile).

The Shield and Extra Heart Start boosters and the Booster Pack were removed in 3.11.0 (see Saves for the refund).

### Cosmetics

Each category has a free default. Owned items are equipped only in the Shop: every owned card shows "Equip" (or "Equipped"), free defaults included (`src/game/shopEquip.js`). Settings keeps sound, vibration and theme (3.20.0: "Show zoom tips again", "Credits" and "Reset progress" are gone; Credits moved to the Profile tab, and the reset function stays for tests only).

| Category         | Item                             | Price                       |
| ---------------- | -------------------------------- | --------------------------- |
| Escape effect    | Classic Slide (default)          | Free                        |
| Escape effect    | Spark Trail                      | 500 coins                   |
| Escape effect    | Comet Glow                       | 800 coins                   |
| Escape effect    | Burst                            | 5 diamonds                  |
| Escape effect    | Aurora Ribbon (new)              | 1300 coins + 7 diamonds     |
| Escape effect    | Rocket Flame                     | 1000 coins + 5 diamonds     |
| Board background | Plain (default)                  | Free                        |
| Board background | Soft Paper                       | 400 coins                   |
| Board background | Gradient Sky                     | 600 coins                   |
| Board background | Chalkboard                       | 6 diamonds                  |
| Board background | Blueprint (new)                  | 1000 coins + 5 diamonds     |
| Board background | Night Stars                      | 900 coins + 5 diamonds      |
| Arrowhead        | Triangle (default)               | Free                        |
| Arrowhead        | Chevron                          | 400 coins                   |
| Arrowhead        | Round                            | 500 coins                   |
| Arrowhead        | Feather                          | 5 diamonds                  |
| Victory confetti | Classic (default)                | Free                        |
| Victory confetti | Hearts                           | 400 coins                   |
| Victory confetti | Coins                            | 450 coins                   |
| Victory confetti | Stars                            | 500 coins                   |
| Sound pack       | Soft (default)                   | Free                        |
| Sound pack       | Retro 8-bit                      | 600 coins                   |
| Sound pack       | Nature                           | 5 diamonds                  |
| Avatar           | 6 premium avatars                | 600 coins + 3 diamonds each |
| Avatar frame     | Silver (free with Perfectionist) | 800 coins                   |
| Avatar frame     | Gold (free with Chapter Master)  | 1200 coins + 4 diamonds     |
| Avatar frame     | Diamond                          | 1500 coins + 8 diamonds     |
| Avatar frame     | Prism (new)                      | 1400 coins + 7 diamonds     |

Escape effects use transform, opacity and a small particle canvas, and are skipped with `prefers-reduced-motion`. Sound packs are generated with the Web Audio API (no audio files). Arrowhead shapes only change the drawing, not hit detection.

### Offers

| Offer        | Details                                                                                      | Price                 |
| ------------ | -------------------------------------------------------------------------------------------- | --------------------- |
| Starter Pack | One time, from level 5: 5 hints + Dark Slate style. Hidden once bought                       | 3 diamonds            |
| Free Gift    | 30 coins every 4 hours. If the device clock moves backward, no reward and the timer restarts | Free                  |
| Exchange     | 1 diamond, or 5 diamonds at once (confirm first)                                             | 500 coins per diamond |
| Weekly Sale  | One cosmetic, style or theme at 30% off, picked from the ISO week number (same for everyone) | 30% off               |

The Shop has six tabs: All, Offers, Hints, Styles, Effects and Profile. All (the default the first time) shows every section in order under its own heading (Offers, Hints, Styles, Effects, Profile items). After that the last opened tab is remembered on this device. The tab row scrolls sideways on small screens and keeps the active tab in view. Items from this update show a "New" badge until you first see them.

### Profile stats

Three highlight tiles (Daily streak, Levels completed, Perfect levels) and a two-column list (Arrows cleared, Win streak, Best streak, Play time). The numbers count up when the page opens. Coins, diamonds, best daily streak and hints used are still saved but not shown.

### Achievements and award badges

The Profile screen has two tabs, Profile and Awards (a pill control with a sliding thumb; a red dot marks a tab with something new; the last tab is remembered on the device).

- **Achievements list** (Tasks > Achievements since 3.23.0, on the Profile tab before; `src/game/achievementList.js`, `src/ui/screens/tasks/achievementsList.js`). Profile keeps a "View achievements" link that opens it: one row per achievement group, full width. Each row has a small badge, the title and description, a progress bar with the count inside it ("4/5", white over the fill and dark over the track), the diamond reward and a side button. Tiered groups show only their current step ("Step 2/4"). Ready rows sort to the top, then rows in progress, then completed ones. Claiming plays a burst on the badge and the diamonds fly to the counter.
- **Claim button** (`src/ui/components/claimButton.js`, shared by achievements and weekly quests): every row has one, always 96x44 px, so rows line up and nothing jumps when a row changes state.

  | State                | Look                                                                                                                                                                  | Tap                                                                                           |
  | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
  | Ready                | blue, glow pulse, red dot                                                                                                                                             | claims                                                                                        |
  | Not ready            | clearly disabled (3.23.0): flat, no border or shadow, lighter text, 60% opacity, `aria-disabled="true"` (disabled controls are exempt from the text contrast minimum) | small shake and a toast with what is left, e.g. "Finish 5 more levels first" (`notReadyText`) |
  | Claimed (every step) | green "Claimed" pill with a check                                                                                                                                     | nothing                                                                                       |

- **Award badges** (Awards tab, `src/game/awards.js`, `src/ui/components/clayBadge.js`): one original clay-style badge per group, 3 per row on a phone. Each group has its own shape (circle, shield, hexagon, rosette or gem) and colour. A badge lights up once a step is claimed and shows that step's goal (10, 25, 100...) on a ribbon in its tier colour (Bronze, Silver, Gold, Diamond; single-step achievements are Gold). Locked badges are pale grey embossed silhouettes. A red dot marks a newly earned badge until the Awards tab has been seen. Tapping a badge opens a bottom sheet with every step and its progress; the Awards tab never claims anything.
- **Monthly trophies** (Awards tab, `src/game/trophies.js`, `src/ui/components/trophyArt.js`): twelve original trophies for the current year, one shape per month. Progress is the number of days that month the daily reward was claimed (e.g. "12 of 31", with leap years). The trophy fills with colour from the bottom; a complete month is full colour with a shine; future months are pale grey. Earlier years show in folded sections only when they have data.

Goals and rewards live in `ACHIEVEMENT_DEFS` in `src/config.js`. Steps are claimed in order and each pays once. If saved progress already meets a step, it is claimable right away. Achievements removed in 3.8.0 (Collector, Alphabet, Zoo Keeper) keep the diamonds already claimed.

| Achievement    | Goal                                              | Reward (diamonds) |
| -------------- | ------------------------------------------------- | ----------------- |
| First Escape   | Finish level 1                                    | 1                 |
| Perfectionist  | 10 levels without losing a heart                  | 3                 |
| Chapter Master | Finish chapter 1 (20 levels)                      | 2                 |
| Arrow Hunter   | Clear 1,000 arrows                                | 5                 |
| No Mistakes    | 5 levels in a row without losing a heart          | 3                 |
| Shape Solver   | Finish 25 / 100 / 250 / 500 shape levels          | 2 / 5 / 10 / 20   |
| Big Spender    | Spend 1,000 coins                                 | 2                 |
| Level Climber  | Reach level 25 / 50 / 100 / 250                   | 2 / 4 / 8 / 15    |
| Brain Power    | 10 / 30 levels finished (first time) with no hint | 3 / 8             |
| Comeback       | Win with exactly 1 heart left, 1 / 10 times       | 1 / 4             |
| Daily Player   | Daily streak of 3 / 7 / 30 days                   | 1 / 3 / 10        |
| Hard Worker    | Finish 10 / 50 Hard, Super Hard or Expert levels  | 3 / 8             |

### Daily reward

Opening the app on a new local day shows the Daily Reward popup on Home: a ribbon banner, Day 1-6 cards in a 3x2 grid and a tall Day 7 gift card on the right (original art: coin pile, gem, hint bulb, gift box). Claimed days are dimmed with a green check, today's card glows and is claimed with the big button under the panel, later days carry a small lock. Claiming pops the card and flies the reward to its counter. Closing the popup keeps a "Daily Reward" button with a dot on Home until it is claimed that day. Card states: `src/game/dailyCards.js`.

| Day    | 1        | 2        | 3        | 4        | 5         | 6        | 7                   |
| ------ | -------- | -------- | -------- | -------- | --------- | -------- | ------------------- |
| Reward | 20 coins | 30 coins | 40 coins | 50 coins | 1 diamond | 70 coins | 2 diamonds + 1 hint |

- The streak grows by one per claim on consecutive days; a missed day starts again at day 1. After day 7 the cards restart at day 1 while the streak count keeps going (it feeds Daily Player).
- Home shows the current streak (flame and number); Profile shows the current and best daily streak.
- Clock checks (`src/game/daily.js`): if the time is earlier than the latest time this device has seen (beyond 1 hour, so time zones and DST are fine) or earlier than the last claimed day, nothing is paid until real time catches up; a jump of more than 60 days ahead pays nothing that day. The save is never broken.
- Resetting progress keeps the daily record, so today's reward can't be claimed twice.

### Weekly Quests

A **Tasks** tab in the bottom navigation (clipboard icon, between Levels and Shop; called Quests in 3.22.0) opens the Tasks screen (`src/ui/screens/tasks/`). A tab was chosen over a Home button so the red reminder dot is visible from every page.

- A segmented control (the same pill as Profile | Awards, `src/ui/components/segmented.js`) switches between **Weekly** (below) and **Achievements** (the permanent list, same rows, Claim states and order as before). The panel slides in, and the last tab is remembered on the device.
- A red dot marks each tab with something to claim, and the Tasks nav icon shows one when either tab does (`src/game/taskDots.js`).

The Weekly tab:

- **Banner**: "Weekly Quests" with a countdown to the reset ("5d 23h"). Quests reset every Monday at 00:00 local time.
- **Points bar** from 0 to 100 with three chests. Claimed quests add their points; a chest opens with an animation when tapped once its points are reached.

  | Chest      | Reward                 |
  | ---------- | ---------------------- |
  | 30 points  | 150 coins              |
  | 60 points  | 300 coins + 1 hint     |
  | 100 points | 500 coins + 3 diamonds |

- **6 quests per week**, at most one per group, picked from the pool with the ISO week number as the seed: the same for everyone in a week, different each week. The draw repeats on the same seed until the week's points add up to 115-170, so 100 points never needs every quest. No quest asks for hints to be used.
- **Groups** (3.23.0): quests that count the same thing share a group, so one week never has two of them (e.g. never "Complete 30 levels" with "Finish 10 new levels"): levels (any levels, new levels), careful (perfect levels, levels with no hint), hard (Hard-or-above, Super Hard-or-above), and one group each for shapes, comebacks, arrows, daily claims and coins spent.
- **Rows** look like the achievements list: points on the left, icon and title, a bar with "x/y" inside, and the Claim button on the right (grey when not ready, blue when ready, "Claimed" after). A tap on a grey button shakes it and says what is left ("Complete 5 more levels first").
- **Lost at the reset**: unclaimed quest points and unopened chests. A red dot on the Weekly tab and on the Tasks nav icon shows when a quest or chest can be claimed.
- **Progress** counts only from the week's start: wins, perfect wins (no heart lost, no hint), shape levels, Hard-or-above and Super Hard-or-above levels, levels with no hint, wins with 1 heart left, first clears, arrows cleared, daily reward claims and coins spent.
- **Clock safety** (`src/game/quests.js`): the quest week only ever moves forward. A clock moved back keeps the current week (no reset, no old week back, claimed quests and opened chests stay claimed). A clock jumped forward starts that later week once, and then no reset happens until real time has passed it, so there are never more resets than real weeks plus that one.
- Permanent achievements are separate and never reset.
- All numbers live in `QUESTS` in `src/config.js`.

Quest pool:

| Quest                               | Goal  | Points |
| ----------------------------------- | ----- | ------ |
| Complete 20 levels                  | 20    | 10     |
| Complete 30 levels                  | 30    | 15     |
| Complete 40 levels                  | 40    | 25     |
| Finish 5 perfect levels             | 5     | 15     |
| Finish 10 perfect levels            | 10    | 30     |
| Finish 8 shape levels               | 8     | 15     |
| Finish 15 shape levels              | 15    | 30     |
| Clear 1,500 arrows                  | 1,500 | 10     |
| Clear 3,000 arrows                  | 3,000 | 25     |
| Claim the daily reward on 3 days    | 3     | 20     |
| Claim the daily reward on 5 days    | 5     | 35     |
| Win 3 levels with only 1 heart left | 3     | 20     |
| Win 5 levels with only 1 heart left | 5     | 30     |
| Finish 5 Hard-or-above levels       | 5     | 20     |
| Finish 12 Hard-or-above levels      | 12    | 35     |
| Finish 3 Super Hard-or-above levels | 3     | 25     |
| Spend 1,500 coins                   | 1,500 | 20     |
| Spend 3,000 coins                   | 3,000 | 35     |
| Complete 10 levels without a hint   | 10    | 25     |
| Complete 20 levels without a hint   | 20    | 40     |
| Finish 10 new levels                | 10    | 20     |
| Finish 20 new levels                | 20    | 35     |

Currency from outside the game (rewarded ads, in-app purchases) should go through `grant()` in `economy.js` (via `credit()` in `rewards.js`) with source `'ad'` or `'purchase'`.

## Test mode

`TEST_UNLOCK_ALL` in `src/config.js` opens every level on the Levels page for testing (no locks, no "Complete level X first"). Home shows a red **TEST MODE** badge while it is on. It never changes the save: a level that isn't really unlocked pays no coins, diamonds or XP when won, doesn't move the current level, and records no stats. It is set at build time (3.25.0, `scripts/build-flags.mjs`):

| Build                                 | `TEST_UNLOCK_ALL`                  |
| ------------------------------------- | ---------------------------------- |
| dev server (`npm run dev`), tests     | on                                 |
| Vercel preview deployments            | on                                 |
| Vercel production (the live web game) | off                                |
| `npm run build:release` (Android)     | always off: nothing can turn it on |
| plain `npm run build`                 | off                                |

`ARROW_TEST_UNLOCK=0` or `1` forces it off or on, except in release and Vercel production builds. Each build records the value in `dist/index.html` (`<meta name="arrow-build" content="test-unlock=...">`), and `tests/releaseFlag.test.js` builds in release mode and checks it is off.

## Saves

- Key `arrowEscape:v7`, plus a backup copy in `arrowEscape:v7:backup` written on every save.
- v7 (3.22.0) adds the Weekly Quests record `quests: { week, counts, claimed, chests }`. A v6 save keeps everything and starts with an empty record; the v6 keys are removed only after v7 is written and read back.
- 3.16.0 adds two fields to v6 saves, filled in on load: `dailyDays` (days the daily reward was claimed, for the monthly trophies) and `seenBadges` (award badges already seen). An older save rebuilds the claim days from its current streak (a streak is a run of consecutive claimed days); earlier days are unknown and start at 0. Badges claimed before count as seen.
- v6 removes the Shield and Extra Heart boosters. Any owned ones are refunded once on load (60 coins per Shield, 1 diamond per Extra Heart), a toast says "Boosters removed, refunded X coins / Y diamonds" once, and the inventory is dropped. Everything else is kept. The v5 keys are removed only after v6 is written and read back.
- v5 adds the daily reward record and two stats (clean first clears, comebacks). A v4 save (or its backup) is migrated automatically and nothing is lost: progress, coins, diamonds, hints, items, shapes and claimed achievements are kept. The v4 keys are removed only after v5 is written and read back.
- Skip level was removed in 3.8.0; levels skipped in older saves stay completed.
- There is no maximum level: level numbers up to 1,000,000,000 are accepted (anything larger is treated as corrupt data).
- v4 added the Shape Collection (`progress.shapes`, shape ids). A v3 save (or its backup) is migrated automatically and nothing is lost: each finished shape level gives the shape it showed under the old 20-shape order.
- A v2 save (or its backup) is migrated automatically on first launch: progress, coins, diamonds, items, achievements, profile and settings are all kept. New fields (owned/equipped cosmetics, starter pack bought, free gift last claim, seen "New" badges) start empty. The v2 keys are removed only after the current save is written and read back.
- The Reveal and Auto-Clear boosters were removed in 3.5.0: their saved counts are dropped on load, everything else is kept.
- A v1 save is migrated automatically: current level, completed levels, hints, settings and the equipped arrow style are kept, and daily data is dropped. The v1 key is removed only after the current save is written and read back.
- Chapters have 20 levels again since 3.9.0. The save stores its chapter size, so a save made with 40-level chapters is converted once: both 20-level halves of a rewarded 40-level chapter count as rewarded (no chapter pays twice), and a half of an unrewarded chapter can still pay its first reward. Progress, coins and diamonds are untouched.
- Every load is validated: negative, NaN or non-number values become 0, unknown keys are ignored, equipped items must be owned, and `unlocked` never falls behind completed levels.

## Back button

- Modal open: close it (victory acts like "Main", game over leaves the level)
- Otherwise: go back one screen
- On Home: ask "Exit game?"

On Android this uses `@capacitor/app`. In a browser it falls back to `history`/`popstate`.

## Android app (Capacitor)

The native project is in `android/`. It was created with `npx cap add android`, package ID `com.sussal.arrowexpert`.

| Setting            | Value                                                          |
| ------------------ | -------------------------------------------------------------- |
| `targetSdkVersion` | 36 (Android 16), `compileSdkVersion` 36, `minSdkVersion` 24    |
| `versionName`      | `version` in `package.json`                                    |
| `versionCode`      | `androidVersionCode` in `package.json` (raise by 1 per upload) |
| Orientation        | portrait (Android 16 ignores it on screens over 600 dp)        |
| Icons, splash      | from `npm run assets` (copies `store-assets/android/res`)      |
| Build tools        | AGP 8.13, Gradle 8.14, Java 21                                 |

- The screen stays on only during a level (Screen Wake Lock API, `src/ui/wakeLock.js`).
- The Android back button works as in the web app (`@capacitor/app`, `src/input/back-button.js`).
- Google Play needs target API 36 or higher (since 31 August 2026). Raise `targetSdkVersion` in `android/variables.gradle` when Google moves the requirement.

**Release builds** come from the **android-release** GitHub Actions workflow:

- It builds the web app in release mode, syncs Capacitor, and builds a signed AAB plus a debug APK.
- Signing uses the upload key from GitHub Secrets. No keystore is ever committed.
- Step-by-step guide: **[docs/RELEASE.md](docs/RELEASE.md)** (making the key, adding the secrets, running the workflow, the next version).

Local debug build (needs the Android SDK):

```bash
npm run build:release      # or: npm run build
npx cap sync android
cd android && ./gradlew assembleDebug    # -> app/build/outputs/apk/debug/app-debug.apk
```

## Privacy policy

`public/privacy.html` is served at https://arrow-puzle-game.vercel.app/privacy.html (the URL for Google Play), and the app shows the same page from Credits > Privacy policy. It says what the app does today: no account, ads, purchases or analytics, and progress saved only on the device. Replace `CONTACT_EMAIL` with the real address before publishing, and update the page if any of that changes.

## CI

`.github/workflows/ci.yml` runs `npm ci`, lint, test and build on Node 22 (from `.nvmrc`) for every push and pull request. `.github/workflows/android-release.yml` builds the Android app: by hand or on a `v*` tag (signed AAB and debug APK), and the debug APK on pull requests that touch `android/`.
