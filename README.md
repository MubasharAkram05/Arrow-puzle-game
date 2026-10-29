# Arrow Escape

A "Tap Away Arrows" style puzzle game. Tap an arrow: if nothing is in front of its head it slides out of the board, otherwise it bumps and you lose a heart. Clear every arrow to win.

Built with vanilla JavaScript ES modules and Vite. Runs fully offline and is packaged for Android with Capacitor.

## Features

- Endless generated levels in chapters of 40, dense like the reference game (40+ arrows from level 4, 140+ from level 61), with a mix of short and long arrows, and a shape board every 3rd level (20 shapes)
- Pinch to zoom and drag on big boards
- Hearts, hints, a level 1 tutorial, snake-style arrow animations
- Coins and diamonds: earned by playing, spent on hints, boosters, heart refills, continues, skips and cosmetics
- Boosters: Shield, Reveal, Auto-Clear and Extra Heart Start, with a booster bar on the game screen
- Cosmetics: escape effects, board backgrounds, arrowhead shapes, victory confetti, sound packs, premium avatars and frames
- Shop with tabs (Offers, Boosters, Styles, Effects, Profile), a free gift every 4 hours, a starter pack, coin exchange and a weekly sale
- Pages: Home, Levels, Shop and Profile behind a bottom navigation bar
- Profile with 12 built-in avatars, an editable name, player level/XP, stats and 7 achievements
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
npm test          # Vitest: engine, 200 levels, economy, achievements, storage
npm run lint      # ESLint + Prettier check
npm run format    # auto-fix formatting and lint issues
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
    masks.js            shape list, geometric shapes, mask building
    shapeArt.js         pixel-art shapes (letters, objects) and scaling
    animalArt.js        pixel-art animals (whale, cat, dog, bird, fish)
    levels.js           tier and board size for a level number (numbers from config.js)
    shapes.js           turn plans for straight, L, U, zig-zag, spiral, snake
    generator.js        reverse-peeling generator with retries
    longArrows.js       joins neighbours into long arrows without breaking solvability
    board.js            occupancy, ray checks, free arrows
    solver.js           greedy solver and structural validation
    difficulty.js       blocking depth, free arrows at start, rounds
  game/                 state, game loop (tap, win, lose), hints and tutorial
    economy.js          pure reward and wallet rules (+ grant() hook for ads/IAP later)
    rewards.js          applies rewards and purchases to the game state
    achievements.js     achievement goals, progress and claiming (pure)
    stats.js            stats, streaks, XP levels, name validation (pure)
    boosters.js         booster inventory, per-level limits, shield and "perfect" rules (pure)
    cosmetics.js        owned/equipped cosmetics, buying, achievement unlocks (pure)
    offers.js           starter pack, gift timer, exchange, weekly sale picker (pure)
    offerActions.js     applies offers to the game state
  render/               SVG board, HUD, pointing hand, animations, confetti, booster effects
    effects/            escape effects (one file each) on a small particle canvas
  input/                board taps, pinch zoom and pan, Android/browser back button
  audio/                Web Audio sounds and sound packs, vibration
  storage/
    schema.js           v3 save format, validation, loading and backup (pure)
    validators.js       number, list, cosmetics and avatar validators (pure)
    migrate.js          v1 and v2 to v3 migrations, chapter-size conversion (pure)
    save.js             maps the game state to and from the save
  ui/                   navigation, theme, DOM helpers
    components/         icons, currency bar, bottom nav, avatars, toast, style preview
    screens/            home, levels, game, booster bar, profile
      shop/             shop shell and one file per tab, cards, previews, actions
    modals/             settings, game over, victory, purchase dialog, shared modal logic
  styles/               tokens, base and per-screen CSS
tests/                  Vitest suites
reference/              screenshots of the original game (design target)
legacy/                 the old single-file version, kept for reference
```

## Levels and difficulty

Every level is generated from its number, so a level is always the same. The generator places arrows in reverse: each new arrow may only point at arrows placed before it or off the board, so removing them in creation order always works. The solver verifies every board anyway.

Difficulty is measured, not guessed:

| Metric         | Meaning                                                 |
| -------------- | ------------------------------------------------------- |
| Blocking depth | How many arrows must leave before a given arrow is free |
| Free at start  | Arrows you can safely tap on the first move             |
| Rounds         | Longest chain of "this must go before that"             |

Boards follow the reference game: dense, portrait-shaped grids with a mix of arrow lengths. Every number below lives in `LEVELS` in `src/config.js`.

| Tier       | Levels | Board width (cells)      | Arrows | Free at start | Min avg depth | Min solve rounds |
| ---------- | ------ | ------------------------ | ------ | ------------- | ------------- | ---------------- |
| Tutorial   | 1-3    | 5-7                      | 6-15   | 2-3           | -             | 2                |
| Normal     | 4-20   | 16, +1 every 3 (max 21)  | 40-80  | max 3         | 9             | 12               |
| Hard       | 21-60  | 22, +1 every 8 (max 27)  | 80-140 | max 3         | 20            | 20               |
| Super Hard | 61+    | 30, +1 every 20 (max 34) | 140+   | max 2         | 26            | 28               |

Solve rounds: how many removal waves are needed if every free arrow leaves at once.

**Arrow lengths.** About 70% short (2-6 cells), 15-20% medium (7-12) and 10-15% long (13-30). Long arrows are made after the board is built by joining neighbouring arrows onto the tail of a deep arrow (`src/engine/longArrows.js`). The deep arrow keeps its head, so it still leaves late, and the long body becomes a wall that blocks many others. A neighbour is only joined when it is not one of the arrow's blockers (directly or through a chain), which keeps every board solvable.

Two arrows pointing straight at each other on the same line can never appear: each would block the other forever.

**Shape levels**: every 3rd level after the tutorial (6, 9, 12, ...) is a shape board, cycling through 20 shapes: heart, arrow, mushroom, circle, plane, whale, diamond, cat, letter A, donut, star, dog, house, fish, hourglass, bird, apple, plus, tree and letter Z. The geometric ones are formulas in `src/engine/masks.js`; the others are 16x16 pixel art in `src/engine/shapeArt.js`, scaled to the board with their proportions kept. The Levels page shows each shape's silhouette under the level number. Shape boards are square and 3 cells wider. They are exempt from the arrow-count range (less room), and their goals are eased: depth and rounds x0.6, and up to 12 more arrows free at the start (a jagged edge lets more arrows out).

If a board misses its goals, the generator retries with the next derived seed. Levels 1-300 are tested for solvability, goals, determinism, and build time (under 150 ms each; most take under 20 ms on a laptop).

### Zoom

Big boards can be zoomed with two fingers (pinch) up to the point where a cell is about a fingertip wide, and dragged with one finger while zoomed. Taps fire on release, so a drag or pinch never removes an arrow. A button in the top-right corner (or a double tap on empty space) shows the whole board again. "Pinch to zoom" appears on the first 3 dense boards. Using a hint or Reveal zooms back out so the highlight is visible. Desktop browsers zoom with Ctrl + mouse wheel or a trackpad pinch.

## Economy

All numbers live in `src/config.js`.

### Earning

| Event                                        | Coins                               | Diamonds |
| -------------------------------------------- | ----------------------------------- | -------- |
| Level complete                               | 10                                  |          |
| Each heart left at the end                   | +5                                  |          |
| Board size                                   | +1 per 10 arrows                    |          |
| Difficulty multiplier (base + hearts + size) | Normal x1, Hard x1.5, Super Hard x2 |          |
| Perfect level (no heart lost), first time    | +20                                 |          |
| Replay of a completed level                  | 25% of base + hearts                |          |
| Every 10th level, first clear                |                                     | +1       |
| Chapter complete (40 levels), once           | +200                                | +4       |
| Achievements                                 |                                     | 1-5 each |
| Free hint every 3 levels completed           | (+1 hint)                           |          |
| XP per win                                   | 10 XP + 5 XP per heart left         |          |

### Spending

| Item                                       | Price      |
| ------------------------------------------ | ---------- |
| Hint (once free hints run out)             | 50 coins   |
| 5-hint pack                                | 200 coins  |
| Refill 1 heart (max 2 per level)           | 80 coins   |
| Continue after game over, full hearts      | 2 diamonds |
| Skip level (marks it complete, no rewards) | 5 diamonds |
| Arrow styles: Dark Slate, Olive            | 300 coins  |
| Arrow style: Soft Mint                     | 5 diamonds |
| Themes: Royal Purple, Lagoon Teal          | 400 coins  |
| Theme: Sunset Coral                        | 8 diamonds |

### Boosters

Bought in the Shop (Boosters tab) or from the booster bar next to the hint button. Tapping a booster with 0 left asks to buy one.

| Booster           | What it does                                                    | Price     |
| ----------------- | --------------------------------------------------------------- | --------- |
| Shield            | Your next wrong tap costs no heart (does not stack)             | 60 coins  |
| Reveal            | Highlights every free arrow for 3 seconds                       | 40 coins  |
| Auto-Clear        | Removes one free arrow with its normal escape (max 1 per level) | 70 coins  |
| Extra Heart Start | Use before your first move: start the level with +1 heart       | 1 diamond |
| Booster Pack      | 3 Shields + 3 Reveals + 2 Auto-Clears                           | 350 coins |

Using any booster or a hint means the level does not count as perfect. Boosters and hints used are tracked in the Profile stats.

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

| Offer        | Details                                                                                        | Price                 |
| ------------ | ---------------------------------------------------------------------------------------------- | --------------------- |
| Starter Pack | One time, from level 5: 5 hints + 3 Shields + 3 Reveals + Dark Slate style. Hidden once bought | 3 diamonds            |
| Free Gift    | 30 coins every 4 hours. If the device clock moves backward, no reward and the timer restarts   | Free                  |
| Exchange     | 1 diamond, or 5 diamonds at once (confirm first)                                               | 500 coins per diamond |
| Weekly Sale  | One cosmetic, style or theme at 30% off, picked from the ISO week number (same for everyone)   | 30% off               |

The Shop has five tabs: Offers, Boosters, Styles, Effects and Profile. The last opened tab is remembered on this device. Items from this update show a "New" badge until you first see them.

### Achievements

| Achievement    | Goal                                     | Reward     |
| -------------- | ---------------------------------------- | ---------- |
| First Escape   | Finish level 1                           | 1 diamond  |
| Perfectionist  | 10 perfect levels                        | 3 diamonds |
| Chapter Master | Finish chapter 1 (40 levels)             | 2 diamonds |
| Arrow Hunter   | Clear 1000 arrows                        | 5 diamonds |
| No Mistakes    | 5 levels in a row without losing a heart | 3 diamonds |
| Shape Solver   | Finish 5 shape levels                    | 3 diamonds |
| Big Spender    | Spend 1000 coins                         | 2 diamonds |

Currency from outside the game (rewarded ads, in-app purchases) should go through `grant()` in `economy.js` (via `credit()` in `rewards.js`) with source `'ad'` or `'purchase'`.

## Saves

- Key `arrowEscape:v3`, plus a backup copy in `arrowEscape:v3:backup` written on every save.
- A v2 save (or its backup) is migrated to v3 automatically on first launch: progress, coins, diamonds, items, achievements, profile and settings are all kept. New fields (booster inventory, owned/equipped cosmetics, starter pack bought, free gift last claim, seen "New" badges) start empty. The v2 keys are removed only after v3 is written and read back.
- A v1 save is migrated automatically: current level, completed levels, hints, settings and the equipped arrow style are kept, and daily data is dropped. The v1 key is removed only after v3 is written and read back.
- Saves made with 20-level chapters are converted to 40-level chapters: a new chapter counts as rewarded only if both old halves were, so no chapter reward is lost.
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
