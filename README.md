# Arrow Escape

A "Tap Away Arrows" style puzzle game. Tap an arrow: if nothing is in front of its head it slides out of the board, otherwise it bumps and you lose a heart. Clear every arrow to win.

Built with vanilla JavaScript ES modules and Vite. Runs fully offline and is packaged for Android with Capacitor.

## Requirements

- Node.js 22+ (see `.nvmrc`; `nvm use` picks it up). CI uses the same version.
- For the APK: Android Studio Narwhal 3 (2025.1.3) or newer, Android SDK 36, and JDK 21

## Run

```bash
npm install
npm run dev       # dev server with hot reload
npm run build     # production build in dist/
npm run preview   # serve the build locally
npm test          # Vitest: engine, solver, board, 200 levels + 30 dailies
npm run lint      # ESLint + Prettier check
npm run format    # auto-fix formatting and lint issues
```

## Folder structure

```
index.html              markup for every screen and modal (Vite entry)
src/
  main.js               boot: load save, theme, wire screens, back button
  config.js             game constants
  engine/               pure logic, no DOM (tested in Node)
    rng.js              seeded mulberry32 RNG and seed hashing
    directions.js       up/right/down/left
    masks.js            heart, circle, diamond, hourglass, star masks
    levels.js           difficulty tiers, goals, level and daily configs
    shapes.js           turn plans for straight, L, U, zig-zag, spiral, snake
    generator.js        reverse-peeling generator with retries
    board.js            occupancy, ray checks, free arrows
    solver.js           greedy solver and structural validation
    difficulty.js       blocking depth, free arrows at start, rounds
  game/                 state, game loop (tap, win, lose), hints and tutorial
  render/               SVG board, HUD, pointing hand, animations, confetti
  input/                board taps, Android/browser back button
  audio/                Web Audio sounds, vibration
  storage/              localStorage save/load with safe fallbacks
  ui/                   navigation, theme, DOM helpers
    screens/            home, levels, game
    modals/             settings, game over, victory, shared modal logic
  styles/               tokens, base and per-screen CSS
tests/                  Vitest suites
reference/              screenshots of the original game (design target)
legacy/                 the old single-file version, kept for reference
```

## Levels and difficulty

Every level is generated from its number (the daily challenge from the date), so a level is always the same. The generator places arrows in reverse: each new arrow may only point at arrows placed before it or off the board, so removing them in creation order always works. The solver verifies every board anyway.

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
