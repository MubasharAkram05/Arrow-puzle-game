# Arrow Escape: Work Plan

Note: the `reference/` folder is not in the repo, so the look follows the written spec.

## Phase 1: Fix bugs
- Snake-style escape animation (stroke-dashoffset + rAF, head goes straight out).
- Blocked animation: slide to blocker, bump, turn red, slide back.
- Hit test: exact grid cell first, then small radius fallback.
- Input lock during game over, modals, and the last heart animation.
- Unlimited level select (scrollable, loads more on scroll).
- Remove Tailwind CDN, Google Fonts and the "reference images" text. Plain CSS + system fonts.
- One SVG for all arrows.

## Phase 2: Generator + solver
- Seeded RNG (mulberry32), seed = level number, retry seeds hashed from (level, attempt).
- Reverse-peeling generator with shape styles (straight, L, U, zig-zag, spiral, snake), 90-100% fill.
- Difficulty tiers and masks every 10th level.
- Greedy solver verifies each level, regenerate on failure.
- Engine lives in one `<script id="engine">` block, exported for Node.
- `tests/generator.test.js`: levels 1-200 + 30 daily seeds.

## Phase 3: Game UI
- Top bar, stats row (arrows left, hearts, difficulty), progress bar.
- Hint button with badge (glow + pulsing hand), grid toggle.

## Phase 4: Screens
- Home, level select (locks/checks), daily challenge, victory (sunburst, confetti, mini preview), game over, level 1 tutorial.

## Phase 5: Settings + storage
- Sound, vibration, theme (light/dark/auto), 4 arrow styles, reset progress with confirm.
- localStorage with try/catch everywhere.
