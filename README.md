# Arrow Escape

A "Tap Away Arrows" style puzzle game. Tap an arrow: if nothing is in front of its head it slides out of the board, otherwise it bumps and you lose a heart. Clear every arrow to win.

Built with vanilla JavaScript ES modules and Vite. Runs fully offline and is packaged for Android with Capacitor.

## Features

- Endless generated levels in chapters of 20, dense like the reference game (40+ arrows from level 4, 140+ from level 61), with a mix of short and long arrows, and a shape board every 3rd level (621 shapes in 10 categories)
- Pinch to zoom and drag on big boards
- Hearts, hints, a level 1 tutorial, snake-style arrow animations
- Coins and diamonds: earned by playing (including a perfect-level diamond and a 7-day daily reward), spent on hints, heart refills, continues and cosmetics. The only way to the next level is to finish the current one
- Cosmetics: escape effects, board backgrounds, arrowhead shapes, victory confetti, sound packs, premium avatars and frames
- Shop with tabs (All, Offers, Hints, Styles, Effects, Profile), a free gift every 4 hours, a starter pack, coin exchange and a weekly sale
- Pages: Home, Levels, Shop and Profile behind a bottom navigation bar
- Daily reward with a 7-day cycle and a daily streak (shown on Home and in Profile)
- Levels page as a winding path: sticky chapter banners, round 3D level nodes in an S-curve and a treasure chest per chapter
- Profile with 12 built-in avatars, an editable name, player level/XP, highlight stats and award badges for 12 achievement groups (some with Bronze to Diamond steps)
- Light, dark and auto theme, 4 arrow styles, 4 accent themes
- Saves locally (versioned, validated, with a backup copy), works with storage blocked

## Requirements

- Node.js 22+ (see `.nvmrc`; `nvm use` picks it up). CI uses the same version.
- For the APK: Android Studio Narwhal 3 (2025.1.3) or newer, Android SDK 36, and JDK 21

## Run

```bash
npm install
npm run dev       # dev server with hot reload
npm run build     # production build in dist/
npm run preview   # serve the build locally
npm test          # Vitest: engine, 700 levels, every shape at 3 sizes, economy, achievements, storage
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
    stats.js            stats, streaks, XP levels, name validation (pure)
    daily.js            daily reward and streak, with clock checks (pure)
    assist.js           per-level "hint used" flag and the "perfect" rule (pure)
    cosmetics.js        owned/equipped cosmetics, buying, achievement unlocks (pure)
    offers.js           starter pack, gift timer, exchange, weekly sale picker (pure)
    offerActions.js     applies offers to the game state
  render/               SVG board, HUD, pointing hand, animations, confetti
    effects/            escape effects (one file each) on a small particle canvas
  input/                board taps, pinch zoom and pan (zoomMath.js: pure zoom numbers), Android/browser back button
  audio/                Web Audio sounds and sound packs, vibration
  storage/
    schema.js           v6 save format, validation, loading and backup (pure)
    validators.js       number, list, cosmetics, avatar and shape-id validators (pure)
    migrate.js          v1 to v5 to v6 migrations, chapter-size conversion (pure)
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
| Expert     | 1000+   | 2                 | 3.0                | +40%           | 22                | 12%        | 50%           |

Levels 1-3 (the tutorial) are unchanged. Expert pays x2.5 coins (the cap).

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

**Shape levels**: every 3rd level after the tutorial (6, 9, 12, ...) is a shape board from the shape library (see [Shape library](#shape-library)). On the Levels path, a shape level's node shows its shape.

Shape boards are square and grow with the level: the shape holds `shapeScale` (1.0 to 1.25) times the cells of that level's plain board (`shapeSize` in `src/engine/levels.js`, up to 90 wide), so later shapes are bigger and a small shape like the arrow gets a bigger board than a full one like the plus. Shape levels meet the same floors as plain levels of that number (arrow count, depth, rounds, free per round, longest chain, decoys). Only the start-free cap is wider and the edge-free floor does not apply: a jagged edge lets more arrows out, and those sit on the shape's edge, so a shape board may start with the level's cap + 12 free arrows, or 14% of its arrows if that is more.

After building, extra free arrows are turned around or joined onto a neighbour (only when that can't create a cycle), so boards reach the low free-at-start caps. If a board still misses its goals, the generator retries with the next derived seed. Levels 1-500 plus 200 random levels up to 1,000,000 are tested for solvability, floors, determinism and build time (under 150 ms locally, 300 ms on CI).

Build time and retries per tier (3.12.0, measured on the cloud test machine, which is slower than a laptop; the same 700 levels):

| Tier       | Median | 95th percentile | Slowest | Most retries | Mean retries |
| ---------- | ------ | --------------- | ------- | ------------ | ------------ |
| Normal     | 5 ms   | 10 ms           | 12 ms   | 11           | 0.6          |
| Hard       | 12 ms  | 22 ms           | 31 ms   | 1            | 0.1          |
| Super Hard | 38 ms  | 101 ms          | 208 ms  | 6            | 0.5          |
| Expert     | 54 ms  | 173 ms          | 245 ms  | 9            | 1.2          |

On that machine 21 of the 700 levels (all Super Hard or Expert) take over 150 ms; none take over 300 ms.

### Shape library

621 shapes in 10 categories, built by a script from open icon sets and fonts (no hand drawing):

| Category  | Target |  Shapes |
| --------- | -----: | ------: |
| Letters   |     26 |      26 |
| Numbers   |     10 |      10 |
| Symbols   |     50 |      62 |
| Transport |     50 |      55 |
| Objects   |    100 |     134 |
| Food      |     50 |      65 |
| Fruits    |     40 |      42 |
| Nature    |     60 |      62 |
| Animals   |     80 |     110 |
| Others    |     40 |      55 |
| **Total** |        | **621** |

- **Build** (`npm run shapes:sources` once, then `npm run shapes:build`): `scripts/build-shapes.mjs` renders each entry of `scripts/shape-catalog.mjs` to a filled silhouette: letters and numbers from Inter Black (Roboto Slab as a fallback), icons from Font Awesome solid, game-icons.net, Material Symbols, Tabler filled and Fluent Emoji, and the game's 20 original shapes (same ids, so saves keep working). Each is downsampled to 32 cells on its longest side, small holes are filled, parts too thin for a board are trimmed (at most 12% of the shape) and only the main connected area stays. The game only reads the generated JSON.
- **Quality filter** (`src/engine/shapes/quality.js`, also run by the tests): fill 25-85% of the bounding box, no longer than 2.5:1, no part thinner than 2 cells at 20x20, one connected area, and still connected and similar (70%+ overlap) on an 18x18 board, the smallest shape board. Every rejected source is logged with the reason; a name tries its next source until one passes.
- **Excluded on purpose**: brand logos, copyrighted characters, country flags, religious or political symbols, weapons, armour and violence, skulls and bones, blood, alcohol, cigarettes, drugs and anything offensive. A keyword scan of names and sources runs before each release (3.8.0 removed Soda, whose icon was a cocktail glass, and the Viking and Knight helmets).
- **Files**: `library.json` (77 KB, 30 KB gzipped; one row per shape with id, name, category, width, height, source, license and the run-length-encoded mask) is a lazy chunk preloaded after the home screen. `index.json` (7 KB, category -> ids) is in the main bundle for the collection counts and achievements. `scripts/shapes-preview.html` is a contact sheet of every shape plus the rejected list; it is not part of the build.
- **Order**: shape levels take turns between categories, first in the order of `LEVELS.shapeRotation` (animals, food, letters, transport, nature, objects, fruits, symbols, others, numbers), then in proportion to what each category has left, so letters never come 26 in a row. Inside a category compact shapes come first. Never two of the same category back to back. The order is deterministic; after all 621 shapes (1,863 levels) it starts again on bigger boards.
- **Credits**: sources that need attribution are listed in `CREDITS.md` and in Settings > Credits.

### Shape Collection (hidden)

Won shapes are always saved (`progress.shapes`). The Profile section that shows them by category and the "New shape collected" toast are hidden while `SHOW_SHAPE_COLLECTION` in `src/config.js` is `false`; set it to `true` to bring both back as they were in 3.7.0. Test-mode plays don't collect anything.

### Zoom

- **Default zoom:** when a level starts, if the cells would be smaller than 18px when fitted, the board opens zoomed in on its centre so a cell is about 22px. Boards whose cells are 18px or more open fully fitted. Both values are `ZOOM.zoomBelowPx` and `ZOOM.startCellPx` in `src/config.js`.
- **Gestures:** pinch to zoom out to the whole board or in further (until a cell is about a fingertip wide), drag with one finger to move. Taps fire on release, so a drag or pinch never removes an arrow. Desktop browsers zoom with Ctrl + mouse wheel or a trackpad pinch.
- **Full board:** a double tap on empty space zooms out to the whole board.
- **Zoom guide:** when a level starts zoomed, two hands show "Pinch to zoom" and one finger shows "Double-tap to see full board". It appears on the first 3 zoomed levels, then only while the player has never pinched. It fades on the first touch or after 3 seconds and never takes taps. Settings has "Show zoom tips again".
- **Hints:** a hint pans (keeping the zoom) so the highlighted arrow is on screen.
- **Levels page:** only a few chapters around the current level are rendered; more load while scrolling up or down, with no end.

### Levels page (path)

The Levels page is a winding path (`src/ui/screens/levels/`), our own design:

- **Chapter banner** (`chapterBanner.js`): gradient card with "CHAPTER n", the chapter name, progress (e.g. 12/20) and the chapter reward; it sticks to the top while its chapter scrolls by.
- **Nodes** (`pathNode.js`): round 3D buttons (darker bottom edge, soft shine) in a gentle S-curve. Completed nodes show a check, perfect ones a crown, the current level is bigger with a pulsing ring and a START bubble, locked ones are grey with a lock. Shape levels show their shape and every 10th level is an amber star node (a corner badge marks them done).
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

| Item                                  | Price      |
| ------------------------------------- | ---------- |
| Hint (once free hints run out)        | 50 coins   |
| 5-hint pack                           | 200 coins  |
| Refill 1 heart (max 2 per level)      | 80 coins   |
| Continue after game over, full hearts | 2 diamonds |
| Arrow styles: Dark Slate, Olive       | 300 coins  |
| Arrow style: Soft Mint                | 5 diamonds |
| Themes: Royal Purple, Lagoon Teal     | 400 coins  |
| Theme: Sunset Coral                   | 8 diamonds |

### Hints

Bought in the Shop (Hints tab) or from the hint button. Using a hint means the level does not count as perfect. Hints used are still tracked in the save (not shown on the Profile).

The Shield and Extra Heart Start boosters and the Booster Pack were removed in 3.11.0 (see Saves for the refund).

### Cosmetics

Each category has a free default. Owned items are equipped from the Shop or from Settings.

| Category         | Item                             | Price           |
| ---------------- | -------------------------------- | --------------- |
| Escape effect    | Classic Slide (default)          | Free            |
| Escape effect    | Spark Trail                      | 250 coins       |
| Escape effect    | Comet Glow                       | 400 coins       |
| Escape effect    | Burst                            | 3 diamonds      |
| Escape effect    | Rocket Flame                     | 6 diamonds      |
| Board background | Plain (default)                  | Free            |
| Board background | Soft Paper                       | 200 coins       |
| Board background | Gradient Sky                     | 300 coins       |
| Board background | Chalkboard                       | 4 diamonds      |
| Board background | Night Stars                      | 6 diamonds      |
| Arrowhead        | Triangle (default)               | Free            |
| Arrowhead        | Chevron                          | 200 coins       |
| Arrowhead        | Round                            | 250 coins       |
| Arrowhead        | Feather                          | 3 diamonds      |
| Victory confetti | Classic (default)                | Free            |
| Victory confetti | Hearts                           | 150 coins       |
| Victory confetti | Coins                            | 200 coins       |
| Victory confetti | Stars                            | 250 coins       |
| Sound pack       | Soft (default)                   | Free            |
| Sound pack       | Retro 8-bit                      | 300 coins       |
| Sound pack       | Nature                           | 3 diamonds      |
| Avatar           | 6 premium avatars                | 2 diamonds each |
| Avatar frame     | Silver (free with Perfectionist) | 500 coins       |
| Avatar frame     | Gold (free with Chapter Master)  | 1000 coins      |
| Avatar frame     | Diamond                          | 10 diamonds     |

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

Each achievement group is an award badge on the Profile (`src/game/badges.js`, `src/ui/components/badge.js`): an original hexagon badge in the group's colour with its icon. Tiered groups use Bronze, Silver, Gold and Diamond for steps 1-4; single-step achievements are Gold. A badge is locked (grey silhouette with a progress ring), ready (glowing, bouncing, red dot) or earned (full colour, tier rim and step numeral). Tapping one opens a bottom sheet with the details and a Claim button; claiming plays an unlock animation and the diamonds fly to the counter. The three newest earned badges show under the player's name.

Goals and rewards live in `ACHIEVEMENT_DEFS` in `src/config.js`. Steps are claimed in order and each pays once. If saved progress already meets a step, it is claimable right away. Achievements removed in 3.8.0 (Collector, Alphabet, Zoo Keeper) keep the diamonds already claimed.

| Achievement    | Goal                                              | Reward (diamonds) |
| -------------- | ------------------------------------------------- | ----------------- |
| First Escape   | Finish level 1                                    | 1                 |
| Perfectionist  | 10 levels without losing a heart                  | 3                 |
| Chapter Master | Finish chapter 1 (20 levels)                      | 2                 |
| Arrow Hunter   | Clear 1,000 arrows                                | 5                 |
| No Mistakes    | 5 levels in a row without losing a heart          | 3                 |
| Shape Solver   | Finish 5 shape levels                             | 3                 |
| Big Spender    | Spend 1,000 coins                                 | 2                 |
| Level Climber  | Reach level 25 / 50 / 100 / 250                   | 2 / 4 / 8 / 15    |
| Brain Power    | 10 / 30 levels finished (first time) with no hint | 3 / 8             |
| Comeback       | Win with exactly 1 heart left, 1 / 10 times       | 1 / 4             |
| Daily Player   | Daily streak of 3 / 7 / 30 days                   | 1 / 3 / 10        |
| Hard Worker    | Finish 10 / 50 Hard, Super Hard or Expert levels  | 3 / 8             |

### Daily reward

Opening the app on a new local day shows a Daily Reward popup on Home with seven cards: done days have a check, today's card glows with Claim, later days are dimmed. Closing it keeps a "Daily Reward" button with a dot on Home until it is claimed that day.

| Day    | 1        | 2        | 3        | 4        | 5         | 6        | 7                   |
| ------ | -------- | -------- | -------- | -------- | --------- | -------- | ------------------- |
| Reward | 20 coins | 30 coins | 40 coins | 50 coins | 1 diamond | 70 coins | 2 diamonds + 1 hint |

- The streak grows by one per claim on consecutive days; a missed day starts again at day 1. After day 7 the cards restart at day 1 while the streak count keeps going (it feeds Daily Player).
- Home shows the current streak (flame and number); Profile shows the current and best daily streak.
- Clock checks (`src/game/daily.js`): if the time is earlier than the latest time this device has seen (beyond 1 hour, so time zones and DST are fine) or earlier than the last claimed day, nothing is paid until real time catches up; a jump of more than 60 days ahead pays nothing that day. The save is never broken.
- Resetting progress keeps the daily record, so today's reward can't be claimed twice.

Currency from outside the game (rewarded ads, in-app purchases) should go through `grant()` in `economy.js` (via `credit()` in `rewards.js`) with source `'ad'` or `'purchase'`.

## Test mode

`TEST_UNLOCK_ALL` in `src/config.js` opens every level on the Levels page for testing (no locks, no "Complete level X first"). Home shows a red **TEST MODE** badge while it is on. It never changes the save: a level that isn't really unlocked pays no coins, diamonds or XP when won, doesn't move the current level, and records no stats. Set it to `false` before a release and the normal lock state is back exactly as it was.

## Saves

- Key `arrowEscape:v6`, plus a backup copy in `arrowEscape:v6:backup` written on every save.
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

## Build the Android APK with Capacitor

Capacitor 8 is already in `package.json`, and `capacitor.config.json` points at `dist/`.

### Google Play target SDK

Capacitor 8's Android template sets:

| Setting             | Value                              |
| ------------------- | ---------------------------------- |
| `targetSdkVersion`  | 36 (Android 16)                    |
| `compileSdkVersion` | 36                                 |
| `minSdkVersion`     | 24 (Android 7.0)                   |
| Build tools         | AGP 8.13.0, Gradle 8.14.3, Java 21 |

Google Play requires new apps and app updates to target API level 36 or higher since 31 August 2026, so the default meets it. The values live in `android/variables.gradle` after `npx cap add android`. Raise `targetSdkVersion` there when Google moves the requirement (usually every August).

```bash
npm install
npm run build
npx cap add android        # first time only, creates android/
npx cap sync android       # copy dist/ and plugins into the Android project
npx cap open android       # opens Android Studio
```

In Android Studio: **Build > Build App Bundle(s) / APK(s) > Build APK(s)**. The debug APK lands in `android/app/build/outputs/apk/debug/`.

Command line instead of Android Studio:

```bash
cd android
./gradlew assembleDebug
```

After any code change: `npm run build && npx cap sync android`, then rebuild.

For a Play Store release, create a signing key and use **Generate Signed Bundle / APK** in Android Studio.

## CI

`.github/workflows/ci.yml` runs `npm ci`, lint, test and build on Node 22 (from `.nvmrc`) for every push and pull request.
