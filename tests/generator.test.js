import { describe, expect, it } from 'vitest';
import {
  MASK_SHAPES,
  SHAPE_ART,
  TIERS,
  makeMask,
  shapeOf,
  shapeSize,
  analyzeLevel,
  tierOf,
  getLevelConfig,
  meetsGoals,
  buildOccupancy,
  clearArrow,
  generateLevel,
  rayBlocker,
  solveLevel,
  validateLevel,
} from '../src/engine/index.js';
import { LEVELS as LEVEL_CFG } from '../src/config.js';

/** Expected tier rules for a level number (mirrors LEVELS in src/config.js). */
function rulesFor(n) {
  const shape = shapeOf(n);
  const tier = tierOf(n);
  const t = TIERS[tier];
  const base = Math.min(t.size.max, t.size.from + Math.floor((n - t.levels[0]) / t.size.every));
  // shape boards grow until the shape holds about as many cells as the plain board (see shapeSize)
  const cols = shape ? getLevelConfig(n).cols : base;
  const arrows = { tutorial: [6, 15], normal: [40, 80], hard: [80, 140], superHard: [140, 300] }[tier];
  return { cols, arrows, difficulty: t.difficulty, shape, tier };
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
  if (rules.shape) {
    // shape boards are square and at least as wide as the tier's plain board
    expect(level.rows).toBe(level.cols);
    const t = TIERS[rules.tier];
    expect(level.cols).toBeGreaterThanOrEqual(t.size.from);
    expect(level.cols).toBeLessThanOrEqual(LEVEL_CFG.maskMaxCols);
  } else {
    // portrait boards: a few rows taller than wide
    expect(level.rows).toBeGreaterThanOrEqual(level.cols);
    expect(level.rows).toBeLessThanOrEqual(level.cols + 9);
  }
  expect(level.difficulty).toBe(rules.difficulty);
  if (rules.arrows) {
    expect(level.arrows.length).toBeGreaterThanOrEqual(rules.arrows[0]);
    expect(level.arrows.length).toBeLessThanOrEqual(rules.arrows[1]);
  }
  if (rules.shape !== undefined) expect(level.shape).toBe(rules.shape);
  expect(replay(level)).toBe(-1);
}

const LEVELS = Array.from({ length: 300 }, (_, i) => i + 1);

describe('levels 1-300', () => {
  it.each(LEVELS)('level %i is valid, solvable, fast, deterministic and follows its tier', (n) => {
    const t0 = performance.now();
    const level = generateLevel(n);
    const t1 = performance.now();
    const again = generateLevel(n);
    // the faster of two runs, so other test files running in parallel don't make this flaky
    const ms = Math.min(t1 - t0, performance.now() - t1);
    const rules = rulesFor(n);
    checkLevel(level, rules);
    const report = analyzeLevel(level);
    expect(meetsGoals(report, getLevelConfig(n).goals)).toBe(true);
    // a level must be quick to build; CI machines are slower, so the hard cap there is doubled
    expect(ms).toBeLessThan(process.env.CI ? 300 : 150);
    if (n > 3) expect(level.arrows.some((a) => a.path.length >= 13)).toBe(true);
    expect(again.arrows).toEqual(level.arrows);
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

describe('difficulty curve', { timeout: 30000 }, () => {
  /** Reports for a level range (unmasked boards only unless asked). */
  function reports(from, to, withShapes = false) {
    const out = [];
    for (let n = from; n <= to; n++) {
      if (!withShapes && shapeOf(n)) continue;
      const level = generateLevel(n);
      out.push({ level, report: analyzeLevel(level) });
    }
    return out;
  }
  const mean = (list, f) => list.reduce((s, x) => s + f(x), 0) / list.length;

  it('tiers follow the table: Tutorial 1-3, Normal 4-20, Hard 21-60, Super Hard 61+', () => {
    expect([1, 3, 4, 20, 21, 60, 61, 300].map(tierOf)).toEqual([
      'tutorial',
      'tutorial',
      'normal',
      'normal',
      'hard',
      'hard',
      'superHard',
      'superHard',
    ]);
    expect(generateLevel(5).difficulty).toBe('Normal');
    expect(generateLevel(21).difficulty).toBe('Hard');
    expect(generateLevel(61).difficulty).toBe('Super Hard');
  });

  it('tutorial levels start with 2-3 free arrows', () => {
    for (let n = 1; n <= 3; n++) {
      const { startFree } = analyzeLevel(generateLevel(n));
      expect(startFree).toBeGreaterThanOrEqual(2);
      expect(startFree).toBeLessThanOrEqual(3);
    }
  });

  it('start-free, depth and solve-round minimums hold on every plain level', () => {
    for (let n = 4; n <= 300; n++) {
      if (shapeOf(n)) continue;
      const { goals } = getLevelConfig(n);
      const r = analyzeLevel(generateLevel(n));
      expect(r.startFree).toBeLessThanOrEqual(n <= 60 ? 3 : 2);
      expect(r.avgDepth).toBeGreaterThanOrEqual(goals.minAvgDepth);
      expect(r.rounds).toBeGreaterThanOrEqual(goals.minRounds);
    }
  });

  it('shape levels reach the same arrow count, depth and solve-round floors as their tier', () => {
    for (let n = 4; n <= 300; n++) {
      const shape = shapeOf(n);
      if (!shape) continue;
      const tier = TIERS[tierOf(n)];
      const level = generateLevel(n);
      const r = analyzeLevel(level);
      const msg = `level ${n} (${shape})`;
      expect(level.arrows.length, msg).toBeGreaterThanOrEqual(tier.arrows[0]);
      expect(level.arrows.length, msg).toBeLessThanOrEqual(tier.arrows[1]);
      expect(r.avgDepth, msg).toBeGreaterThanOrEqual(tier.goals.minAvgDepth);
      expect(r.rounds, msg).toBeGreaterThanOrEqual(tier.goals.minRounds);
      // a jagged edge lets a few more arrows out at the start, but never more than 14% of the board
      const cap = Math.max(
        tier.goals.maxStartFree + LEVEL_CFG.maskExtraFree,
        Math.ceil(LEVEL_CFG.maskFreeShare * level.arrows.length),
      );
      expect(r.startFree, msg).toBeLessThanOrEqual(cap);
    }
  });

  it('small shapes get a bigger board than large ones on the same level', () => {
    const area = (name, n) => getLevelConfig(n).cols ** 2 * (makeMask(name, 20, 20).reduce((a, b) => a + b, 0) / 400);
    expect(shapeSize('arrow', 16, 400)).toBeGreaterThan(shapeSize('plus', 16, 400));
    expect(area('arrow', 9)).toBeGreaterThan(16 * 20 * 0.8);
  });

  it('Super Hard is at least 30% deeper than the old Super Hard goal (20)', () => {
    expect(TIERS.superHard.goals.minAvgDepth).toBeGreaterThanOrEqual(26);
    expect(mean(reports(61, 120), (x) => x.report.avgDepth)).toBeGreaterThan(26);
  });

  it('boards get denser and longer to solve from Normal to Hard to Super Hard', () => {
    const tiers = [reports(4, 20), reports(21, 60), reports(61, 120)];
    const arrows = tiers.map((t) => mean(t, (x) => x.level.arrows.length));
    const rounds = tiers.map((t) => mean(t, (x) => x.report.rounds));
    expect(arrows[1]).toBeGreaterThan(arrows[0] * 1.4);
    expect(arrows[2]).toBeGreaterThan(arrows[1] * 1.3);
    expect(rounds[1]).toBeGreaterThan(rounds[0]);
    expect(rounds[2]).toBeGreaterThan(rounds[1]);
  });

  it('mixes about 70% short, 15-20% medium and 10-15% long arrows', () => {
    const lens = reports(4, 120, true).flatMap((x) => x.level.arrows.map((a) => a.path.length));
    const share = (f) => lens.filter(f).length / lens.length;
    expect(share((l) => l <= 6)).toBeGreaterThan(0.6);
    expect(share((l) => l <= 6)).toBeLessThan(0.8);
    expect(share((l) => l >= 7 && l <= 12)).toBeGreaterThan(0.1);
    expect(share((l) => l >= 13)).toBeGreaterThan(0.09);
    expect(share((l) => l >= 13)).toBeLessThan(0.18);
    expect(Math.max(...lens)).toBeLessThanOrEqual(30);
  });

  it('long arrows leave later than average in the solve', () => {
    let longPos = 0;
    let nLong = 0;
    let allPos = 0;
    let nAll = 0;
    for (const { level } of reports(4, 60, true)) {
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
