import { describe, expect, it } from 'vitest';
import {
  MASK_SHAPES,
  analyzeLevel,
  getLevelConfig,
  meetsGoals,
  buildOccupancy,
  clearArrow,
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

describe('levels 1-200', () => {
  it.each(LEVELS)('level %i is valid, solvable and follows its tier', (n) => {
    const level = generateLevel(n);
    checkLevel(level, rulesFor(n));
    expect(meetsGoals(analyzeLevel(level), getLevelConfig(n).goals)).toBe(true);
    expect(generateLevel(n).arrows).toEqual(level.arrows);
  });
});

describe('masks', () => {
  it('every 10th level cycles through all five shapes', () => {
    const shapes = new Set([10, 20, 30, 40, 50].map((n) => generateLevel(n).shape));
    expect([...shapes].sort()).toEqual([...MASK_SHAPES].sort());
  });
});

describe('difficulty curve', () => {
  /** Mean of a difficulty metric over a level range. */
  function mean(from, to, key) {
    let sum = 0;
    for (let n = from; n <= to; n++) sum += analyzeLevel(generateLevel(n))[key];
    return sum / (to - from + 1);
  }

  it('blocking depth grows and start-free share shrinks from Normal to Hard to Super Hard', () => {
    const normal = { depth: mean(6, 20, 'avgDepth'), free: mean(6, 20, 'startFreeRatio') };
    const hard = { depth: mean(21, 50, 'avgDepth'), free: mean(21, 50, 'startFreeRatio') };
    const superHard = { depth: mean(51, 100, 'avgDepth'), free: mean(51, 100, 'startFreeRatio') };
    expect(hard.depth).toBeGreaterThan(normal.depth * 1.5);
    expect(superHard.depth).toBeGreaterThan(hard.depth * 1.3);
    expect(hard.free).toBeLessThan(normal.free);
    expect(superHard.free).toBeLessThan(hard.free);
  });

  it('Hard and Super Hard never start with many free arrows', () => {
    for (let n = 21; n <= 200; n++) {
      const { startFree } = analyzeLevel(generateLevel(n));
      expect(startFree).toBeLessThanOrEqual(n <= 50 ? 4 : 3);
    }
  });
});
