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
/** Shapes that are not letters or numbers (they fill the "other" slots). */
const otherShapes = () => shapeOrder().filter((id) => !['letters', 'numbers'].includes(getShape(id).category));

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

  it('two cycles of other shapes: a shape mask on every shape level, each other shape once per cycle', () => {
    const O = otherShapes().length;
    for (let cycle = 0; cycle < 2; cycle++) {
      const seen = new Set();
      for (let j = 0; j < O; j++) {
        const n = shapeLevel(2 * (cycle * O + j) + 1); // the other slots: k = 1, 3, 5 ...
        const cfg = getLevelConfig(n);
        expect(cfg.mask, `level ${n}`).toBe(shapeOf(n));
        expect(seen.has(cfg.mask), `${cfg.mask} twice in cycle ${cycle}`).toBe(false);
        seen.add(cfg.mask);
        if (j % 7) continue; // the mask check (slow) on a spread of them
        const mask = makeMask(cfg.mask, cfg.rows, cfg.cols);
        const used = mask.reduce((s, b) => s + b, 0);
        expect(used, `level ${n} is a full rectangle`).toBeLessThan(cfg.rows * cfg.cols);
      }
      expect(seen.size).toBe(O);
    }
  });

  it('each cycle of other shapes is a different mix, and a shape never comes back within half a cycle', () => {
    const order = shapeOrder();
    const O = otherShapes().length;
    const [a, b, c] = [0, 1, 2].map((k) => cycleOrder(order, k));
    expect(a).toHaveLength(O);
    expect(a).not.toEqual(b);
    expect(b).not.toEqual(c);
    for (const [x, y] of [
      [a, b],
      [b, c],
    ]) {
      const pos = new Map(x.map((id, i) => [id, i]));
      for (let i = 0; i < O; i++) expect(O + i - pos.get(y[i])).toBeGreaterThan(O / 2);
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

describe('slots: a letter, another shape, a number, another shape', () => {
  const category = (id) => getShape(id).category;
  const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const NUMS = '1234567890';

  it('letters at every 4th shape level from level 6, strictly A..Z twice over; numbers 1..9, 0 in between', () => {
    // two full alphabet cycles: 2 x 26 x 4 shape levels
    const K = 2 * 26 * 4;
    let letters = '';
    let numbers = '';
    for (let k = 0; k < K; k++) {
      const id = shapeOf(shapeLevel(k));
      const cat = category(id);
      if (k % 4 === 0) {
        expect(cat, `shape level ${k} (level ${shapeLevel(k)})`).toBe('letters');
        letters += id.replace('letter', '');
      } else if (k % 4 === 2) {
        expect(cat, `shape level ${k} (level ${shapeLevel(k)})`).toBe('numbers');
        numbers += id.replace('number', '');
      } else expect(['letters', 'numbers'], `level ${shapeLevel(k)}`).not.toContain(cat);
    }
    expect(letters).toBe(AZ + AZ);
    expect(numbers).toBe(NUMS.repeat(5) + NUMS.slice(0, 2));
  });

  it('level 6 is A and level 12 is 1; the first B, C, Z and 2, 0 come where the slots put them', () => {
    const first = {};
    for (let n = 6; n < 6 + 3 * 120; n += 3) first[shapeOf(n)] ??= n;
    expect([first.letterA, first.letterB, first.letterC, first.letterZ]).toEqual([6, 18, 30, 306]);
    expect([first.number1, first.number2, first.number0]).toEqual([12, 24, 120]);
  });

  it('the other slots never show the same category twice in a row, also across cycles', () => {
    const O = otherShapes().length;
    const others = Array.from({ length: 2 * O + 5 }, (_, j) => shapeOf(shapeLevel(2 * j + 1)));
    for (let i = 1; i < others.length; i++) expect(category(others[i])).not.toBe(category(others[i - 1]));
  });

  it('two shape levels in a row are never the same category', () => {
    const ids = Array.from({ length: 600 }, (_, k) => shapeOf(shapeLevel(k)));
    for (let i = 1; i < ids.length; i++) expect(category(ids[i])).not.toBe(category(ids[i - 1]));
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
    const half = Math.ceil(otherShapes().length / 2);
    expect(Object.keys(SHAPE_MIN_SIDE).length).toBeGreaterThan(0);
    for (const id of Object.keys(SHAPE_MIN_SIDE)) {
      expect(REMOVED_SHAPES).not.toContain(id);
      expect(order).toContain(id);
      expect(minBoardSide(id)).toBeGreaterThanOrEqual(SHAPE_MIN_SIDE[id]);
      for (const c of [0, 1, 2]) {
        const k = cycleOrder(order, c).indexOf(id);
        if (SHAPE_MIN_SIDE[id] > SHAPE_BOARD.lateSide) expect(k, `${id} in cycle ${c}`).toBeGreaterThanOrEqual(half);
        const n = shapeLevel(2 * (c * otherShapes().length + k) + 1);
        expect(getLevelConfig(n).cols, `${id} at level ${n}`).toBeGreaterThanOrEqual(SHAPE_MIN_SIDE[id]);
      }
    }
  });
});
