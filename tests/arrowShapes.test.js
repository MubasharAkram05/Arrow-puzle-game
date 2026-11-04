/**
 * Arrow shapes and blocking (3.17.0): longer, bending arrows that block each other more, on every tier from
 * level 4. Levels 1-3 (the tutorial) keep their own rules (see hardBoards.test.js for its fixed hash).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { TIER_FLOORS } from '../src/config.js';
import {
  analyzeLevel,
  generateLevel,
  getLevelConfig,
  loadShapeLibrary,
  mulberry32,
  validateLevel,
} from '../src/engine/index.js';
import { isStraight, turnCount } from '../src/engine/tidy.js';

beforeAll(() => loadShapeLibrary());

const rand = mulberry32(17);
const SAMPLES = {
  Normal: [4, 6, 9, 12, 15, 18, 21, 24, 27, 30],
  Hard: [31, 40, 50, 60, 70, 80, 90, 100],
  'Super Hard': [101, 150, 200, 260, 330, 420, 520, 640, 800, 990],
  Expert: Array.from({ length: 8 }, () => 1000 + Math.floor(rand() * 500000)),
};
const cache = new Map();
const get = (n) => {
  if (!cache.has(n)) cache.set(n, generateLevel(n));
  return cache.get(n);
};
const share = (arrows, f) => arrows.filter(f).length / arrows.length;

describe('arrow shapes from level 4', () => {
  it.each(Object.entries(SAMPLES))('%s: every level has good shapes and enough blocking', (tier, levels) => {
    const shape = TIER_FLOORS[tier].arrowShape;
    for (const n of levels) {
      const lv = get(n);
      const r = analyzeLevel(lv);
      expect(lv.difficulty, `level ${n}`).toBe(tier);
      // minimum length: no arrow under 2 cells, 2-cell arrows only as a last resort (at most 3%)
      expect(Math.min(...lv.arrows.map((a) => a.path.length)), `level ${n}`).toBeGreaterThanOrEqual(2);
      expect(r.shortShare, `level ${n} 2-cell`).toBeLessThanOrEqual(0.03);
      // bends: at most the tier's straight share (70%+ bend), and straight arrows are 4+ cells
      expect(r.straightShare, `level ${n} straight`).toBeLessThanOrEqual(Math.min(0.3, shape.maxStraight));
      expect(
        lv.arrows.filter((a) => isStraight(a) && a.path.length === 3),
        `level ${n} stubs`,
      ).toEqual([]);
      // blocking
      expect(r.blockersAhead, `level ${n} blockersAhead`).toBeGreaterThanOrEqual(shape.minBlockersAhead);
      expect(r.blockedShare, `level ${n} blocked at start`).toBeGreaterThanOrEqual(0.9);
    }
  });

  it.each(Object.entries(SAMPLES))('%s: the length mix is about 40% / 35% / 25%', (tier, levels) => {
    const arrows = levels.flatMap((n) => get(n).arrows);
    const len = (a) => a.path.length;
    expect(share(arrows, (a) => len(a) >= 3 && len(a) <= 5)).toBeGreaterThan(0.3);
    expect(share(arrows, (a) => len(a) >= 3 && len(a) <= 5)).toBeLessThan(0.52);
    expect(share(arrows, (a) => len(a) >= 6 && len(a) <= 10)).toBeGreaterThan(0.28);
    expect(share(arrows, (a) => len(a) >= 11 && len(a) <= 25)).toBeGreaterThan(0.15);
    expect(share(arrows, (a) => len(a) > 25)).toBeLessThan(0.03);
    // most arrows turn, and turning arrows mostly turn more than once
    expect(arrows.reduce((s, a) => s + turnCount(a), 0) / arrows.length).toBeGreaterThan(2);
  });

  it('Normal and Hard are as deep as before the shape rules (depth aim)', () => {
    // averages on these samples before 3.17.0 (fewer, longer arrows made boards shallower until the depth aim)
    const depth = (tier) => SAMPLES[tier].reduce((s, n) => s + analyzeLevel(get(n)).avgDepth, 0) / SAMPLES[tier].length;
    expect(depth('Normal')).toBeGreaterThanOrEqual(32.4);
    expect(depth('Hard')).toBeGreaterThanOrEqual(60.6);
  });

  it('harder tiers push further: more long arrows, more turns, more arrows ahead', () => {
    const avg = (tier, f) => SAMPLES[tier].reduce((s, n) => s + f(get(n)), 0) / SAMPLES[tier].length;
    const long = (lv) => share(lv.arrows, (a) => a.path.length >= 11);
    const blk = (lv) => analyzeLevel(lv).blockersAhead;
    expect(avg('Expert', long)).toBeGreaterThan(avg('Normal', long));
    expect(avg('Expert', blk)).toBeGreaterThan(avg('Super Hard', blk));
    expect(avg('Super Hard', blk)).toBeGreaterThan(avg('Hard', blk));
    expect(avg('Hard', blk)).toBeGreaterThan(avg('Normal', blk));
  });

  it('levels stay valid, solvable and deterministic', () => {
    for (const n of [4, 30, 100, 300, 1000]) {
      const lv = get(n);
      expect(validateLevel(lv), `level ${n}`).toEqual([]);
      expect(analyzeLevel(lv).solvable).toBe(true);
      expect(generateLevel(n).arrows).toEqual(lv.arrows);
    }
  });
});

describe('tier rules never get easier', () => {
  const tiers = ['Normal', 'Hard', 'Super Hard', 'Expert'].map((t) => TIER_FLOORS[t].arrowShape);
  it('each tier asks for at least as much as the one before', () => {
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i].minBlockersAhead).toBeGreaterThanOrEqual(tiers[i - 1].minBlockersAhead);
      expect(tiers[i].maxStraight).toBeLessThanOrEqual(tiers[i - 1].maxStraight);
      expect(tiers[i].longShare).toBeGreaterThanOrEqual(tiers[i - 1].longShare);
      expect(tiers[i].nativeLong).toBeGreaterThanOrEqual(tiers[i - 1].nativeLong);
    }
    expect(tiers[0].minBlockersAhead).toBeGreaterThanOrEqual(2.5);
    expect(tiers[3].minBlockersAhead).toBeGreaterThanOrEqual(4);
  });

  it('no goal drops from level N to N+10', () => {
    const keys = { minBlockersAhead: 1, minBlockedShare: 1, maxStraightShare: -1, maxShortShare: -1 };
    for (let n = 4; n < 1200; n += 7) {
      const [a, b] = [getLevelConfig(n).goals, getLevelConfig(n + 10).goals];
      for (const [k, dir] of Object.entries(keys)) expect((b[k] - a[k]) * dir, `${k} ${n}`).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('blocking metrics', () => {
  it('blockersAhead counts every arrow in the straight line in front of a head; blockedShare the blocked ones', () => {
    // three arrows in a row, all pointing right: the left one has 2 ahead, the middle 1, the right one 0
    const level = {
      rows: 1,
      cols: 9,
      mask: null,
      arrows: [0, 3, 6].map((c, id) => ({ id, dir: 1, path: [2, 1, 0].map((k) => ({ r: 0, c: c + k })) })),
    };
    const r = analyzeLevel(level);
    expect(r.blockersAhead).toBeCloseTo(1);
    expect(r.blockedShare).toBeCloseTo(2 / 3);
    expect(r.straightShare).toBe(1);
    expect(r.straightStubs).toBe(3);
  });
});
