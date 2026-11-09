import { beforeAll, describe, expect, it } from 'vitest';
import {
  cycleOrder,
  generateLevel,
  getShape,
  getLevelConfig,
  isShapeLevel,
  levelMask,
  loadShapeLibrary,
  makeMask,
  minBoardSide,
  shapeOf,
  shapeOrder,
  smoothMask,
} from '../src/engine/index.js';
import { LEVELS, SHAPE_BOARD } from '../src/config.js';
import { components } from '../src/engine/shapes/quality.js';

beforeAll(() => loadShapeLibrary());

/** Level number of the k-th shape level (k = 0 for the first one): two plain levels, then a shape. */
const shapeLevel = (k) => LEVELS.shapeFrom + k * LEVELS.shapeEvery + LEVELS.shapeEvery - 1;

describe('two plain levels, then a shape level', () => {
  it('levels 1-3 (tutorial) are plain; from level 4: plain, plain, shape, repeating', () => {
    expect([1, 2, 3].map(shapeOf)).toEqual([null, null, null]);
    expect([4, 5, 7, 8, 10, 11, 1_000_000].some(isShapeLevel)).toBe(false);
    expect([6, 9, 12, 15, 999_999].every(isShapeLevel)).toBe(true);
    for (let n = 4; n < 400; n++) expect(isShapeLevel(n), `level ${n}`).toBe((n - 4) % 3 === 2);
  });

  it('plain levels are full rectangles with no shape; they keep every floor (see generator tests)', () => {
    for (const n of [4, 5, 7, 8, 31, 104, 1000]) {
      const cfg = getLevelConfig(n);
      expect(cfg.mask, `level ${n}`).toBe(null);
      expect(levelMask(n)).toBe(null);
      expect(cfg.goals.minAvgDepth).toBeGreaterThan(0);
      expect(cfg.dirGoals).toBeTruthy();
      expect(cfg.snake).toBeTruthy();
    }
  });

  it('two cycles of shape levels: a shape mask on every one, no repeat inside a cycle, never a rectangle', () => {
    const L = shapeOrder().length;
    for (let cycle = 0; cycle < 2; cycle++) {
      const seen = new Set();
      for (let k = 0; k < L; k++) {
        const n = shapeLevel(cycle * L + k);
        const cfg = getLevelConfig(n);
        expect(cfg.mask, `level ${n}`).toBe(shapeOf(n));
        expect(seen.has(cfg.mask), `${cfg.mask} twice in cycle ${cycle}`).toBe(false);
        seen.add(cfg.mask);
        const mask = makeMask(cfg.mask, cfg.rows, cfg.cols);
        const used = mask.reduce((s, b) => s + b, 0);
        expect(used, `level ${n} is a full rectangle`).toBeLessThan(cfg.rows * cfg.cols);
      }
      expect(seen.size).toBe(L);
    }
  });

  it('each cycle is a different mix, and a shape never comes back within half a cycle', () => {
    const order = shapeOrder();
    const L = order.length;
    const [a, b, c] = [0, 1, 2].map((k) => cycleOrder(order, k));
    expect(a).not.toEqual(b);
    expect(b).not.toEqual(c);
    for (const [x, y] of [
      [a, b],
      [b, c],
    ]) {
      const pos = new Map(x.map((id, i) => [id, i]));
      for (let i = 0; i < L; i++) expect(L + i - pos.get(y[i])).toBeGreaterThan(L / 2);
    }
  });

  it('is deterministic', () => {
    for (const n of [6, 51, 777, 123456]) expect(shapeOf(n)).toBe(shapeOf(n));
    expect(cycleOrder(shapeOrder(), 5)).toEqual(cycleOrder([...shapeOrder()], 5));
  });

  it('later cycles get bigger boards', () => {
    const L = shapeOrder().length;
    const side = (k) => getLevelConfig(shapeLevel(k)).cols;
    const avg = (from) => {
      let s = 0;
      for (let k = 0; k < 50; k++) s += side(from + k);
      return s / 50;
    };
    expect(avg(L)).toBeGreaterThan(avg(0));
  });
});

describe('letters and numbers in order, categories mixed', () => {
  const category = (id) => getShape(id).category;
  const shapesFrom = (k0, count) => Array.from({ length: count }, (_, k) => shapeOf(shapeLevel(k0 + k)));

  it('letter shapes come A to Z across the shape levels, then A again in the next cycle', () => {
    const L = shapeOrder().length;
    const ids = shapesFrom(0, 3 * L);
    const letters = ids.filter((id) => category(id) === 'letters').map((id) => id.replace('letter', ''));
    const az = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    expect(letters.join('')).toBe(az + az + az);
  });

  it('number shapes come 0 to 9, then 0 again', () => {
    const L = shapeOrder().length;
    const nums = shapesFrom(0, 3 * L)
      .filter((id) => category(id) === 'numbers')
      .map((id) => id.replace('number', ''));
    expect(nums.join('')).toBe('0123456789'.repeat(3));
  });

  it('letters and numbers are spread out between the other shapes, never all in a row', () => {
    const order = shapeOrder();
    const cyc = cycleOrder(order, 0);
    const at = cyc.map((id, i) => (category(id) === 'letters' ? i : -1)).filter((i) => i >= 0);
    // the letters span most of the cycle, and the longest run of letters (with no other shape between) is 1
    expect(at.at(-1) - at[0]).toBeGreaterThan(order.length / 3);
    for (let i = 1; i < at.length; i++) expect(at[i] - at[i - 1]).toBeGreaterThan(1);
  });

  it('two shape levels in a row never share a category, also across cycles', () => {
    const L = shapeOrder().length;
    const ids = shapesFrom(0, 3 * L + 5);
    for (let i = 1; i < ids.length; i++)
      expect(category(ids[i]), `shape levels ${shapeLevel(i - 1)} and ${shapeLevel(i)}`).not.toBe(category(ids[i - 1]));
  });
});

describe('clean, recognizable masks', () => {
  it('smoothing removes single-cell spurs and fills single-cell holes', () => {
    // 5x5 block with a hole in the middle and a spur sticking out on the right
    const m = [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0];
    smoothMask(m, 5, 5);
    expect(m[2 * 5 + 2]).toBe(1); // hole filled
    expect(m[2 * 5 + 4]).toBe(0); // spur gone
  });

  it('every shape has a minimum board side and no board goes below it', () => {
    const L = shapeOrder().length;
    for (let k = 0; k < L; k++) {
      const n = shapeLevel(k);
      const cfg = getLevelConfig(n);
      expect(cfg.cols, `level ${n}`).toBeGreaterThanOrEqual(minBoardSide(cfg.mask));
      expect(
        components({ w: cfg.cols, h: cfg.rows, bits: Uint8Array.from(makeMask(cfg.mask, cfg.rows, cfg.cols)) }),
      ).toHaveLength(1);
    }
  });
});

describe('Levels page matches the game', () => {
  it('the node icon and the game board use the same shape and mask for levels 4-1000 (plain: no icon mask)', () => {
    for (let n = 4; n <= 1000; n++) {
      const icon = levelMask(n);
      const cfg = getLevelConfig(n);
      if (!isShapeLevel(n)) {
        expect(icon, `level ${n}`).toBe(null);
        continue;
      }
      expect(icon.shape, `level ${n}`).toBe(cfg.mask);
      expect([icon.rows, icon.cols]).toEqual([cfg.rows, cfg.cols]);
    }
  });

  it('a generated level plays exactly the icon mask', () => {
    for (const n of [6, 9, 36, 249, 999]) {
      const level = generateLevel(n);
      const icon = levelMask(n);
      expect(level.shape).toBe(icon.shape);
      expect([...level.mask]).toEqual(icon.bits);
    }
  });
});

describe('shapes that need a big board', () => {
  it('come in the second half of every cycle, on a board at least their minimum size', async () => {
    const { SHAPE_MIN_SIDE, REMOVED_SHAPES } = await import('../src/engine/shapes/removed.js');
    const order = shapeOrder();
    const half = Math.ceil(order.length / 2);
    expect(Object.keys(SHAPE_MIN_SIDE).length).toBeGreaterThan(0);
    for (const id of Object.keys(SHAPE_MIN_SIDE)) {
      expect(REMOVED_SHAPES).not.toContain(id);
      expect(order).toContain(id);
      expect(minBoardSide(id)).toBeGreaterThanOrEqual(SHAPE_MIN_SIDE[id]);
      for (const c of [0, 1, 2]) {
        const k = cycleOrder(order, c).indexOf(id);
        if (SHAPE_MIN_SIDE[id] > SHAPE_BOARD.lateSide) expect(k, `${id} in cycle ${c}`).toBeGreaterThanOrEqual(half);
        const n = shapeLevel(c * order.length + k);
        expect(getLevelConfig(n).cols, `${id} at level ${n}`).toBeGreaterThanOrEqual(SHAPE_MIN_SIDE[id]);
      }
    }
  });
});
