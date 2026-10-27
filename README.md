# Arrow Escape

A "Tap Away Arrows" style puzzle game. Tap an arrow: if nothing is in front of its head it slides out of the board, otherwise it bumps and you lose a heart. Clear every arrow to win.

Built with vanilla JavaScript ES modules and Vite. Runs fully offline and is packaged for Android with Capacitor.

## Features

- Endless generated levels in chapters of 40, with shape (mask) levels every 10th level
- Hearts, hints, a level 1 tutorial, snake-style arrow animations
- Coins and diamonds: earned by playing, spent on hints, heart refills, continues, skips, arrow styles and accent themes
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
  config.js             game constants, rewards, prices, shop items
  engine/               pure logic, no DOM (tested in Node)
    rng.js              seeded mulberry32 RNG and seed hashing
    directions.js       up/right/down/left
    masks.js            heart, circle, diamond, hourglass, star masks
    levels.js           difficulty tiers, goals, level configs
    shapes.js           turn plans for straight, L, U, zig-zag, spiral, snake
    generator.js        reverse-peeling generator with retries
    board.js            occupancy, ray checks, free arrows
    solver.js           greedy solver and structural validation
    difficulty.js       blocking depth, free arrows at start, rounds
  game/                 state, game loop (tap, win, lose), hints and tutorial
    economy.js          pure reward and wallet rules (+ grant() hook for ads/IAP later)
    rewards.js          applies rewards and purchases to the game state
    achievements.js     achievement goals, progress and claiming (pure)
    stats.js            stats, streaks, XP levels, name validation (pure)
  render/               SVG board, HUD, pointing hand, animations, confetti
  input/                board taps, Android/browser back button
  audio/                Web Audio sounds, vibration
  storage/
    schema.js           v2 save format, validation, v1 migration, backup (pure)
    save.js             maps the game state to and from the save
  ui/                   navigation, theme, DOM helpers
    components/         icons, currency bar, bottom nav, avatars, toast, style preview
    screens/            home, levels, game, shop, profile
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

| Tier       | Levels | Board | Max free at start | Min avg depth | Min rounds |
| ---------- | ------ | ----- | ----------------- | ------------- | ---------- |
| Tutorial   | 1-5    | 5-6   | -                 | -             | -          |
| Normal     | 6-20   | 7-9   | 6                 | 1.2           | 3          |
| Hard       | 21-50  | 10-13 | 4                 | 3             | 6          |
| Super Hard | 51+    | 14-16 | 3                 | 6             | 8          |

Mask levels (every 10th) scale the depth and rounds goals by 0.8 because shapes have shorter rays. If a board misses its goals, the generator retries with the next derived seed.

## Economy

All numbers live in `src/config.js`.

### Earning

| Event                                     | Coins                               | Diamonds |
| ----------------------------------------- | ----------------------------------- | -------- |
| Level complete                            | 10                                  |          |
| Each heart left at the end                | +5                                  |          |
| Difficulty multiplier (base + hearts)     | Normal x1, Hard x1.5, Super Hard x2 |          |
| Perfect level (no heart lost), first time | +20                                 |          |
| Replay of a completed level               | 25% of base + hearts                |          |
| Shape level (every 10th), first clear     |                                     | +1       |
| Chapter complete (40 levels), once        | +200                                | +4       |
| Achievements                              |                                     | 1-5 each |
| Free hint every 3 levels completed        | (+1 hint)                           |          |
| XP per win                                | 10 XP + 5 XP per heart left         |          |

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

- Key `arrowEscape:v2`, plus a backup copy in `arrowEscape:v2:backup` written on every save.
- On first launch after updating, a v1 save is migrated automatically: current level, completed levels, hints, settings and the equipped arrow style are kept, and daily data is dropped. The v1 key is removed only after v2 is written and read back.
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
