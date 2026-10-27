# Arrow Escape

A "Tap Away Arrows" style puzzle game in one self-contained `index.html`. No external files, no network, works offline (ready for a Capacitor Android wrapper).

## Play

Open `index.html` in any modern browser.

## Test the level generator

```
node tests/generator.test.js
```

Generates levels 1-200 and 30 daily challenges, then checks each one:

- solvable (greedy solver + step-by-step replay)
- valid structure (contiguous arrows, no overlaps, length 2-20, correct head direction, inside the mask)
- at least 90% of the grid filled
- tier sizes, arrow count on tutorial levels, difficulty labels, mask shape every 10th level
- same seed gives the same level

## Code layout (inside index.html)

1. `<style>`: design tokens (light + dark), arrow styles, components
2. Config + state script
3. `<script id="engine">`: seeded RNG, generator, solver. Pure functions, exported with `module.exports` so the test can load it
4. Game script: renderer, input, animations, audio, storage, screens/UI

The test reads `index.html`, pulls out the engine block with a regex and runs it in Node's `vm`. So there is one source of truth and no build step.
