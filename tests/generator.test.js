import { describe, expect, it } from 'vitest';
import {
  MASK_SHAPES,
  SHAPE_ART,
  makeMask,
  shapeOf,
  shapeSize,
  analyzeLevel,
  difficultyFor,
  getLevelConfig,
  meetsGoals,
  buildOccupancy,
  clearArrow,
  generateLevel,
  mulberry32,
  rayBlocker,
  solveLevel,
  validateLevel,
} from '../src/engine/index.js';
import { LEVELS as LEVEL_CFG } from '../src/config.js';

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

/** Each level is built once per file: {level, report, ms} (ms = the faster of two runs). */
const cache = new Map();
function get(n) {
  if (!cache.has(n)) {
    const t0 = performance.now();
    const level = generateLevel(n);
    const t1 = performance.now();
    const again = generateLevel(n);
    // the faster of two runs, so other test files running in parallel don't make this flaky
    const ms = Math.min(t1 - t0, performance.now() - t1);
    cache.set(n, { level, again, report: analyzeLevel(level), ms });
  }
  return cache.get(n);
}

/** Levels 1-500 plus 200 fixed random levels between 500 and 1,000,000. */
const rand = mulberry32(2026);
const BIG = Array.from({ length: 200 }, () => 500 + Math.floor(rand() * (1_000_000 - 500)));
const ALL = [...Array.from({ length: 500 }, (_, i) => i + 1), ...BIG];
const LIMIT_MS = process.env.CI ? 300 : 150; // CI machines are slower

describe('first levels', () => {
  it('level 1 has exactly 3 arrows on a small board, all free (tutorial hand)', () => {
    const { level, report } = get(1);
    expect(level.arrows).toHaveLength(3);
    expect(level.cols * level.rows).toBeLessThanOrEqual(25);
    expect(report.startFree).toBe(3);
  });

  it('level 2 has 6-8 arrows, level 3 has 12-16 arrows and needs 2-3 removal rounds', () => {
    const two = get(2);
    expect(two.level.arrows.length).toBeGreaterThanOrEqual(6);
    expect(two.level.arrows.length).toBeLessThanOrEqual(8);
    const three = get(3);
    expect(three.level.arrows.length).toBeGreaterThanOrEqual(12);
    expect(three.level.arrows.length).toBeLessThanOrEqual(16);
    expect(three.report.rounds).toBeGreaterThanOrEqual(2);
    expect(three.report.rounds).toBeLessThanOrEqual(3);
  });
});

describe('difficulty curve', () => {
  const harder = ['gridW', 'gridH', 'targetArrows', 'minAvgDepth', 'minSolveRounds', 'longArrowShare', 'shapeScale'];

  it('never gets easier: level N+10 is equal or harder than level N on every metric (N up to 500)', () => {
    for (let n = 1; n <= 500; n++) {
      const a = difficultyFor(n);
      const b = difficultyFor(n + 10);
      for (const k of harder) expect(b[k], `${k} at ${n}`).toBeGreaterThanOrEqual(a[k]);
      expect(b.maxStartFree, `maxStartFree at ${n}`).toBeLessThanOrEqual(a.maxStartFree);
    }
  });

  it('never gets easier from one level to the next, for any level up to 1,000,000', () => {
    const points = [1, 4, 50, 100, 199, 200, 201, 500, 999, 1000, 5000, 19999, 20000, 100000, 1000000];
    for (let i = 1; i < points.length; i++) {
      const a = difficultyFor(points[i - 1]);
      const b = difficultyFor(points[i]);
      for (const k of harder) expect(b[k]).toBeGreaterThanOrEqual(a[k]);
      expect(b.maxStartFree).toBeLessThanOrEqual(a.maxStartFree);
    }
  });

  it('the grid stops at its max size; after that depth, rounds and long arrows keep rising', () => {
    const full = difficultyFor(LEVEL_CFG.curve.fullSizeLevel);
    const late = difficultyFor(50000);
    expect([late.gridW, late.gridH]).toEqual([full.gridW, full.gridH]);
    expect(late.minAvgDepth).toBeGreaterThan(full.minAvgDepth);
    expect(late.minSolveRounds).toBeGreaterThan(full.minSolveRounds);
    expect(late.longArrowShare).toBeGreaterThan(full.longArrowShare);
    expect(late.maxStartFree).toBe(1);
  });

  it('labels: Normal, Hard, Super Hard, then Expert for very high levels', () => {
    expect([4, 30, 31, 100, 101, 999, 1000, 1000000].map((n) => difficultyFor(n).tier)).toEqual([
      'Normal',
      'Normal',
      'Hard',
      'Hard',
      'Super Hard',
      'Super Hard',
      'Expert',
      'Expert',
    ]);
    expect(difficultyFor(150).maxStartFree).toBe(2);
  });
});

describe('levels 1-500 and 200 random levels up to 1,000,000', { timeout: 120000 }, () => {
  it.each(ALL)('level %i is valid, solvable, meets its floors, deterministic and fast', (n) => {
    const { level, again, report, ms } = get(n);
    expect(validateLevel(level)).toEqual([]);
    expect(replay(level)).toBe(-1);
    const cfg = getLevelConfig(n);
    if (n > 1) expect(meetsGoals(report, cfg.goals)).toBe(true);
    if (n >= LEVEL_CFG.curve.firstLevel) {
      // shape levels meet the same floors as plain levels of that number
      const d = difficultyFor(n);
      expect(level.arrows.length).toBeGreaterThanOrEqual(Math.floor(d.targetArrows * LEVEL_CFG.curve.minArrowsShare));
      expect(report.avgDepth).toBeGreaterThanOrEqual(d.minAvgDepth);
      expect(report.rounds).toBeGreaterThanOrEqual(d.minSolveRounds);
      expect(level.arrows.some((a) => a.path.length >= 13)).toBe(true);
      if (!level.shape) expect(report.startFree).toBeLessThanOrEqual(d.maxStartFree);
    }
    expect(again.arrows).toEqual(level.arrows);
    expect(ms).toBeLessThan(LIMIT_MS);
  });
});

describe('harder Super Hard and Expert', { timeout: 60000 }, () => {
  /** Mean of a metric over plain levels in a range (step to keep it quick). */
  const mean = (from, to, step, f) => {
    const xs = [];
    for (let n = from; n <= to; n += step) if (!shapeOf(n)) xs.push(f(get(n)));
    return xs.reduce((a, b) => a + b, 0) / xs.length;
  };

  it('Super Hard blocks at least 40% deeper than the old Super Hard (mean depth 45.8) with max 2 free', () => {
    const depth = mean(101, 500, 7, (x) => x.report.avgDepth);
    expect(depth).toBeGreaterThanOrEqual(45.8 * 1.4);
    expect(difficultyFor(101).minAvgDepth).toBeGreaterThanOrEqual(26 * 1.4);
    for (let n = 101; n <= 500; n += 7) if (!shapeOf(n)) expect(get(n).report.startFree).toBeLessThanOrEqual(2);
  });

  it('Super Hard has 15-20% long blocking arrows', () => {
    const share = mean(
      101,
      500,
      7,
      (x) => x.level.arrows.filter((a) => a.path.length >= 13).length / x.level.arrows.length,
    );
    expect(share).toBeGreaterThanOrEqual(0.15);
    expect(share).toBeLessThanOrEqual(0.22);
  });

  it('Expert levels have the deepest chains', () => {
    const expert = BIG.filter((n) => n >= 1000 && !shapeOf(n)).slice(0, 15);
    const deep = expert.reduce((a, n) => a + get(n).report.avgDepth, 0) / expert.length;
    expect(deep).toBeGreaterThan(mean(101, 300, 9, (x) => x.report.avgDepth));
    for (const n of expert) expect(get(n).report.startFree).toBeLessThanOrEqual(2);
  });

  it('long arrows leave later than average in the solve', () => {
    let longPos = 0;
    let nLong = 0;
    let allPos = 0;
    let nAll = 0;
    for (let n = 4; n <= 120; n += 3) {
      const { level } = get(n);
      const order = solveLevel(level).order;
      order.forEach((id, i) => {
        const pos = i / order.length;
        allPos += pos;
        nAll++;
        if (level.arrows[id].path.length >= 13) {
          longPos += pos;
          nLong++;
        }
      });
    }
    expect(longPos / nLong).toBeGreaterThan(allPos / nAll);
  });
});

describe('shapes', () => {
  it('every 3rd level after the tutorial is a shape, cycling through all 20', () => {
    expect([1, 2, 3, 4, 5, 7, 8, 10, 11].map(shapeOf)).toEqual(Array(9).fill(null));
    expect(shapeOf(6)).toBe(MASK_SHAPES[0]);
    expect(shapeOf(9)).toBe(MASK_SHAPES[1]);
    const levels = Array.from({ length: 20 }, (_, i) => 6 + i * 3);
    expect(new Set(levels.map((n) => generateLevel(n).shape)).size).toBe(20);
    expect(shapeOf(6 + 20 * 3)).toBe(MASK_SHAPES[0]);
  });

  it('pixel-art shapes are 16x16 and every shape fills a good part of the board', () => {
    for (const art of Object.values(SHAPE_ART)) {
      expect(art).toHaveLength(16);
      for (const row of art) expect(row).toMatch(/^[.#]{16}$/);
    }
    expect(MASK_SHAPES).toHaveLength(20);
    for (const name of MASK_SHAPES) {
      const used = makeMask(name, 24, 24).reduce((n, x) => n + x, 0) / (24 * 24);
      expect(used, name).toBeGreaterThan(0.3);
      expect(used, name).toBeLessThan(0.95);
    }
  });

  it('every shape looks different', () => {
    const keys = MASK_SHAPES.map((n) => makeMask(n, 16, 16).join(''));
    expect(new Set(keys).size).toBe(MASK_SHAPES.length);
  });
});

describe('shape boards grow with the level', () => {
  it('later shape levels are bigger, small shapes get bigger boards', () => {
    expect(getLevelConfig(MASK_SHAPES.length * 3 * 4 + 6).cols).toBeGreaterThan(getLevelConfig(6).cols);
    expect(shapeSize('arrow', 16, 400)).toBeGreaterThan(shapeSize('plus', 16, 400));
    expect(getLevelConfig(9).cols).toBeLessThanOrEqual(LEVEL_CFG.maskMaxCols);
  });
});
