import { beforeAll, describe, expect, it } from 'vitest';
import {
  cycleOrder,
  generateLevel,
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
import { LEVELS } from '../src/config.js';
import { components } from '../src/engine/shapes/quality.js';

beforeAll(() => loadShapeLibrary());

describe('a shape on every level', () => {
  it('levels 1-3 (tutorial) are plain, every level from 4 is a shape', () => {
    expect([1, 2, 3].map(shapeOf)).toEqual([null, null, null]);
    expect([4, 5, 6, 7, 100, 1_000_000].every(isShapeLevel)).toBe(true);
  });

  it('levels 4 to 4 + 2 x library size: a shape mask on every one, no repeat inside a cycle, never a rectangle', () => {
    const L = shapeOrder().length;
    const from = LEVELS.shapeFrom;
    for (let cycle = 0; cycle < 2; cycle++) {
      const seen = new Set();
      for (let k = 0; k < L; k++) {
        const n = from + cycle * L + k;
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

  it('each cycle is a different shuffle, and a shape never comes back within half a cycle', () => {
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
    for (const n of [4, 50, 777, 123456]) expect(shapeOf(n)).toBe(shapeOf(n));
    expect(cycleOrder(shapeOrder(), 5)).toEqual(cycleOrder([...shapeOrder()], 5));
  });

  it('later cycles get bigger boards', () => {
    const L = shapeOrder().length;
    const side = (n) => getLevelConfig(n).cols;
    const avg = (from) => {
      let s = 0;
      for (let k = 0; k < 50; k++) s += side(from + k);
      return s / 50;
    };
    expect(avg(4 + L)).toBeGreaterThan(avg(4));
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
    for (let n = 4; n < 4 + L; n++) {
      const cfg = getLevelConfig(n);
      expect(cfg.cols, `level ${n}`).toBeGreaterThanOrEqual(minBoardSide(cfg.mask));
      expect(
        components({ w: cfg.cols, h: cfg.rows, bits: Uint8Array.from(makeMask(cfg.mask, cfg.rows, cfg.cols)) }),
      ).toHaveLength(1);
    }
  });
});

describe('Levels page matches the game', () => {
  it('the node icon and the game board use the same shape and mask for levels 4-1000', () => {
    for (let n = 4; n <= 1000; n++) {
      const icon = levelMask(n);
      const cfg = getLevelConfig(n);
      expect(icon.shape, `level ${n}`).toBe(cfg.mask);
      expect([icon.rows, icon.cols]).toEqual([cfg.rows, cfg.cols]);
    }
  });

  it('a generated level plays exactly the icon mask', () => {
    for (const n of [4, 5, 37, 250, 999]) {
      const level = generateLevel(n);
      const icon = levelMask(n);
      expect(level.shape).toBe(icon.shape);
      expect([...level.mask]).toEqual(icon.bits);
    }
  });
});

describe('shapes brought back on big boards', () => {
  it('come in the second half of every cycle, on a board at least their minimum size', async () => {
    const { BIG_BOARD_SHAPES, REMOVED_SHAPES } = await import('../src/engine/shapes/removed.js');
    const order = shapeOrder();
    const half = Math.ceil(order.length / 2);
    for (const id of Object.keys(BIG_BOARD_SHAPES)) {
      expect(REMOVED_SHAPES).not.toContain(id);
      expect(order).toContain(id);
      expect(minBoardSide(id)).toBeGreaterThanOrEqual(BIG_BOARD_SHAPES[id]);
      for (const c of [0, 1, 2]) {
        const k = cycleOrder(order, c).indexOf(id);
        expect(k, `${id} in cycle ${c}`).toBeGreaterThanOrEqual(half);
        const n = LEVELS.shapeFrom + c * order.length + k;
        expect(getLevelConfig(n).cols, `${id} at level ${n}`).toBeGreaterThanOrEqual(BIG_BOARD_SHAPES[id]);
      }
    }
  });
});
