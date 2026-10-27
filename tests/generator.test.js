import { describe, expect, it } from 'vitest';
import {
  MASK_SHAPES,
  buildOccupancy,
  clearArrow,
  dateKey,
  generateDaily,
  generateLevel,
  rayBlocker,
  solveLevel,
  validateLevel,
} from '../src/engine/index.js';

/** Expected tier rules for a level number (mirrors the spec). */
function rulesFor(n) {
  const shape = n % 10 === 0 ? MASK_SHAPES[(n / 10 - 1) % 5] : null;
  if (n <= 5) return { min: 5, max: 6, arrows: [4, 8], difficulty: 'Normal', shape };
  if (n <= 20) return { min: 7, max: 9, difficulty: 'Normal', shape };
  if (n <= 50) return { min: 10, max: 13, difficulty: 'Hard', shape };
  return { min: 14, max: 16, difficulty: 'Super Hard', shape };
}

/** Replay the solver's order with the same ray rule the game uses. */
function replay(level) {
  const occ = buildOccupancy(level);
  for (const id of solveLevel(level).order) {
    const a = level.arrows[id];
    if (rayBlocker(occ, level.rows, level.cols, a.path[0], a.dir)) return id;
    clearArrow(occ, level.cols, a);
  }
  return -1;
}

/** Shared checks for any generated level. */
function checkLevel(level, rules) {
  expect(validateLevel(level)).toEqual([]);
  expect(level.rows).toBeGreaterThanOrEqual(rules.min);
  expect(level.rows).toBeLessThanOrEqual(rules.max);
  expect(level.cols).toBeGreaterThanOrEqual(rules.min);
  expect(level.cols).toBeLessThanOrEqual(rules.max);
  expect(level.difficulty).toBe(rules.difficulty);
  if (rules.arrows) {
    expect(level.arrows.length).toBeGreaterThanOrEqual(rules.arrows[0]);
    expect(level.arrows.length).toBeLessThanOrEqual(rules.arrows[1]);
  }
  if (rules.shape !== undefined) expect(level.shape).toBe(rules.shape);
  expect(replay(level)).toBe(-1);
}

const LEVELS = Array.from({ length: 200 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 30 }, (_, i) => dateKey(new Date(2026, 0, 1 + i)));

describe('levels 1-200', () => {
  it.each(LEVELS)('level %i is valid, solvable and follows its tier', (n) => {
    const level = generateLevel(n);
    checkLevel(level, rulesFor(n));
    expect(generateLevel(n).arrows).toEqual(level.arrows);
  });
});

describe('daily challenges', () => {
  it.each(DAYS)('daily %i is a valid Super Hard level', (key) => {
    checkLevel(generateDaily(key), { min: 14, max: 16, difficulty: 'Super Hard' });
  });

  it('different days give different boards', () => {
    expect(generateDaily(DAYS[0]).arrows).not.toEqual(generateDaily(DAYS[1]).arrows);
  });
});

describe('masks', () => {
  it('every 10th level cycles through all five shapes', () => {
    const shapes = new Set([10, 20, 30, 40, 50].map((n) => generateLevel(n).shape));
    expect([...shapes].sort()).toEqual([...MASK_SHAPES].sort());
  });
});
