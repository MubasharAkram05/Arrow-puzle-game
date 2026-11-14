/**
 * Level fingerprints (3.28.0). Every device must build exactly the same board for a level number; the
 * fingerprints of a fixed set of levels are kept in tests/fixtures/level-hashes.json and checked in Node
 * (tests/levelDeterminism.test.js) and inside the app's real WebView on Android (scripts/android-smoke.mjs).
 * Regenerate the file with `npm run levels:hashes` only when a board change is intended.
 */
import { generateLevel } from './generator.js';

/** Levels in the golden set: the tutorial, the early ramp, shape levels and very high levels. */
export const GOLDEN_LEVELS = Object.freeze([
  ...Array.from({ length: 40 }, (_, i) => i + 1),
  45,
  50,
  60,
  75,
  99,
  120,
  150,
  200,
  250,
  333,
  500,
  777,
  1000,
  1500,
  2500,
  5000,
  10000,
  20000,
  50000,
]);

/**
 * 32-bit FNV-1a hash of a level's board (size, hearts, difficulty and every arrow's direction and cells).
 * @param {{rows: number, cols: number, hearts: number, difficulty: string, arrows: {dir: number, path: {r: number, c: number}[]}[]}} level
 * @returns {string} 8 hex digits
 */
export function levelHash(level) {
  let h = 0x811c9dc5;
  const add = (n) => {
    h ^= n & 0xffff;
    h = Math.imul(h, 0x01000193);
    h ^= n >>> 16;
    h = Math.imul(h, 0x01000193);
  };
  add(level.rows);
  add(level.cols);
  add(level.hearts);
  for (const ch of level.difficulty) add(ch.charCodeAt(0));
  add(level.arrows.length);
  for (const a of level.arrows) {
    add(a.dir);
    add(a.path.length);
    for (const p of a.path) add(p.r * 4096 + p.c);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Fingerprints of the golden levels (the shape library must be loaded).
 * @returns {Record<string, string>} level number -> hash
 */
export function goldenHashes() {
  return Object.fromEntries(GOLDEN_LEVELS.map((n) => [n, levelHash(generateLevel(n))]));
}
