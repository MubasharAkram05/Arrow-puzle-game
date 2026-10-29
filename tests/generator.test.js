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

/** Expected tier rules for a level number (mirrors the spec in levels.js). */
function rulesFor(n) {
  const shape = n % 10 === 0 ? MASK_SHAPES[(n / 10 - 1) % 5] : null;
  if (n <= 3) return { cols: 5, arrows: [4, 8], difficulty: 'Normal', shape };
  if (n <= 5) return { cols: n === 4 ? 8 : 12, arrows: [n === 4 ? 10 : 30, 60], difficulty: 'Normal', shape };
  const hard = n <= 30;
  const base = hard ? 14 + Math.floor((n - 6) / 3) : Math.min(30, 22 + Math.floor((n - 31) / 5));
  const cols = shape ? Math.min(30, base + 2) : base;
  return { cols, arrows: [shape ? 25 : 35, 260], difficulty: hard ? 'Hard' : 'Super Hard', shape };
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
  expect(level.cols).toBe(rules.cols);
  // portrait boards: a few rows taller than wide (masked and tutorial boards are square)
  expect(level.rows).toBeGreaterThanOrEqual(level.cols);
  expect(level.rows).toBeLessThanOrEqual(level.cols + 4);
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
    for (let n = from; n <= to; n++) {
      const level = generateLevel(n);
      sum += key === 'arrows' ? level.arrows.length : analyzeLevel(level)[key];
    }
    return sum / (to - from + 1);
  }

  it('boards get denser and longer to solve from Normal to Hard to Super Hard', () => {
    const tiers = [
      [4, 5],
      [6, 30],
      [31, 100],
    ].map(([a, b]) => ({ arrows: mean(a, b, 'arrows'), depth: mean(a, b, 'avgDepth'), rounds: mean(a, b, 'rounds') }));
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i].arrows).toBeGreaterThan(tiers[i - 1].arrows * 1.3);
      expect(tiers[i].depth).toBeGreaterThan(tiers[i - 1].depth);
      expect(tiers[i].rounds).toBeGreaterThan(tiers[i - 1].rounds);
    }
  });

  it('matches the reference early on: about 35+ arrows by level 5 and 40+ from level 6', () => {
    expect(generateLevel(5).arrows.length).toBeGreaterThanOrEqual(35);
    for (let n = 6; n <= 9; n++) expect(generateLevel(n).arrows.length).toBeGreaterThanOrEqual(40);
  });

  it('Hard and Super Hard never start with many free arrows', () => {
    for (let n = 6; n <= 200; n++) {
      const { startFree } = analyzeLevel(generateLevel(n));
      const cap = (n <= 30 ? 4 : 3) + (n % 10 === 0 ? 6 : 0);
      expect(startFree).toBeLessThanOrEqual(cap);
    }
  });
});
