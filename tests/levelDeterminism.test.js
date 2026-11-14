/**
 * 3.28.0: every device builds exactly the same board for a level number.
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { generateLevel, loadShapeLibrary } from '../src/engine/index.js';
import { GOLDEN_LEVELS, goldenHashes, levelHash } from '../src/engine/levelHash.js';
import { dexp, dlog, dpow } from '../src/engine/detMath.js';
import { sanitize } from '../src/storage/schema.js';

const golden = JSON.parse(readFileSync(new URL('./fixtures/level-hashes.json', import.meta.url), 'utf8'));

beforeAll(() => loadShapeLibrary());

describe('golden level fingerprints', () => {
  it('the fixture covers the golden set', () => {
    expect(Object.keys(golden).map(Number)).toEqual([...GOLDEN_LEVELS].sort((a, b) => a - b));
  });

  it('every golden level builds the stored board (run `npm run levels:hashes` only for an intended change)', () => {
    expect(goldenHashes()).toEqual(golden);
  }, 120000);

  it('the hash sees a one-cell change', () => {
    const L = generateLevel(12);
    const before = levelHash(L);
    const moved = { ...L, arrows: L.arrows.map((a, i) => (i ? a : { ...a, path: [...a.path.slice(1), a.path[0]] })) };
    expect(levelHash(moved)).not.toBe(before);
    expect(levelHash(L)).toBe(before);
  });
});

describe('no engine-dependent behaviour in the generator', () => {
  /** A different stable sort (merge sort): a correct comparator gives the same order as the engine's sort. */
  function mergeSort(cmp = (a, b) => (String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0)) {
    const a = this.slice();
    const sort = (xs) => {
      if (xs.length < 2) return xs;
      const mid = xs.length >> 1;
      const [l, r] = [sort(xs.slice(0, mid)), sort(xs.slice(mid))];
      const out = [];
      while (l.length && r.length) out.push(cmp(r[0], l[0]) < 0 ? r.shift() : l.shift());
      return out.concat(l, r);
    };
    const sorted = sort(a);
    for (let i = 0; i < sorted.length; i++) this[i] = sorted[i];
    return this;
  }

  it('boards do not depend on how Array.prototype.sort compares (no rng() in a comparator)', () => {
    const sample = [8, 14, 25, 60, 333];
    const want = sample.map((n) => levelHash(generateLevel(n)));
    const native = Array.prototype.sort;
    Array.prototype.sort = mergeSort;
    try {
      expect(sample.map((n) => levelHash(generateLevel(n)))).toEqual(want);
    } finally {
      Array.prototype.sort = native;
    }
  }, 60000);

  it('boards do not depend on Math.log, Math.exp, Math.pow, Math.sin or Math.cos', () => {
    const sample = [9, 30, 250, 5000];
    const want = sample.map((n) => levelHash(generateLevel(n)));
    const saved = {};
    for (const f of ['log', 'exp', 'pow', 'sin', 'cos', 'tan', 'atan2', 'hypot']) {
      saved[f] = Math[f];
      Math[f] = () => {
        throw new Error(`Math.${f} used in level generation`);
      };
    }
    try {
      expect(sample.map((n) => levelHash(generateLevel(n)))).toEqual(want);
    } finally {
      Object.assign(Math, saved);
    }
  }, 60000);

  it('the engine source has no platform-dependent math and no rng() inside a sort comparator', () => {
    const files = [
      'board.js',
      'deepen.js',
      'difficulty.js',
      'dirMetrics.js',
      'fill.js',
      'firstMoves.js',
      'generator.js',
      'grow.js',
      'hardBoard.js',
      'heads.js',
      'levels.js',
      'longArrows.js',
      'masks.js',
      'metrics.js',
      'reshape.js',
      'rng.js',
      'shapes.js',
      'solver.js',
      'styleMetrics.js',
      'tidy.js',
      'shapes/library.js',
      'shapes/plan.js',
    ];
    for (const f of files) {
      const src = readFileSync(new URL(`../src/engine/${f}`, import.meta.url), 'utf8').replace(
        /\/\*[\s\S]*?\*\/|\/\/.*$/gm,
        '',
      );
      expect(src, f).not.toMatch(/Math\.(log|exp|pow|sin|cos|tan|atan2?|hypot|cbrt|random)\b/);
      expect(src, f).not.toMatch(/\.sort\([^)]*rng\(\)/);
      // ** is only allowed with an integer exponent (exact)
      expect(src.match(/\*\*\s*[A-Za-z_(]/g), f).toBeNull();
    }
  });
});

describe('deterministic math', () => {
  const close = (a, b) => Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(b));

  it('dlog, dexp and dpow agree with Math to 12 digits', () => {
    for (let i = 1; i < 3000; i++) {
      const x = i * 0.731 + 1 / i;
      expect(close(dlog(x), Math.log(x)), `log ${x}`).toBe(true);
      expect(close(dexp(x / 400), Math.exp(x / 400)), `exp ${x}`).toBe(true);
      expect(close(dpow(x, 0.37), x ** 0.37), `pow ${x}`).toBe(true);
    }
  });

  it('exact cases: integer powers, square roots, edges', () => {
    expect(dpow(3, 4)).toBe(81);
    expect(dpow(2, -2)).toBe(0.25);
    expect(dpow(0.49, 0.5)).toBe(Math.sqrt(0.49));
    expect(dpow(5, 0)).toBe(1);
    expect(dlog(1)).toBe(0);
    expect(dlog(0)).toBe(-Infinity);
    expect(Number.isNaN(dlog(-1))).toBe(true);
    expect(dexp(0)).toBe(1);
    expect(dexp(1000)).toBe(Infinity);
  });
});

describe('the in-app check hook', () => {
  it('only debug builds expose window.__arrowLevelHashes (the release build drops the block)', () => {
    const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
    expect(main).toMatch(/if \(__AD_DEBUG__\) \{\s*window\.__arrowLevelHashes = async/);
  });
});

describe('saves never hold a board', () => {
  it('a save keeps only the level number: the board is rebuilt fresh when the level is played', () => {
    const s = sanitize({
      version: 8,
      progress: { current: 12, unlocked: 12, completed: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
      wallet: { coins: 400, diamonds: 3, hints: 2 },
      level: { arrows: [{ id: 0, dir: 1, path: [{ r: 0, c: 0 }] }] },
      board: 'old',
      arrowsLeft: [1, 2],
    });
    expect(s.progress.current).toBe(12);
    expect(s.progress.completed).toHaveLength(11);
    expect(s.wallet).toMatchObject({ coins: 400, diamonds: 3, hints: 2 });
    for (const k of ['level', 'board', 'arrowsLeft']) expect(s).not.toHaveProperty(k);
  });
});
