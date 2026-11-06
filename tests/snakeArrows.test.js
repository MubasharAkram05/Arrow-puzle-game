/**
 * Snake arrows (3.18.0): the style metrics (wrap, hug, fill) and the fill pass (fill.js).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { analyzeLevel, generateLevel, loadShapeLibrary, validateLevel } from '../src/engine/index.js';
import { buildOccupancy, rayArrows } from '../src/engine/board.js';
import { styleMetrics } from '../src/engine/styleMetrics.js';
import { fillGaps } from '../src/engine/fill.js';

beforeAll(() => loadShapeLibrary());

const cells = (list) => list.map(([r, c]) => ({ r, c }));

describe('style metrics', () => {
  it('a U holding another arrow counts as a wrap; lines and Ls do not', () => {
    // arrow 0: a U (down the left, along the bottom, up the right) around the head of arrow 1
    const level = {
      rows: 4,
      cols: 5,
      mask: null,
      arrows: [
        {
          id: 0,
          dir: 0,
          path: cells([
            [0, 0],
            [1, 0],
            [2, 0],
            [3, 0],
            [3, 1],
            [3, 2],
            [3, 3],
            [2, 3],
            [1, 3],
            [0, 3],
          ]),
        },
        {
          id: 1,
          dir: 0,
          path: cells([
            [1, 1],
            [2, 1],
            [2, 2],
          ]),
        },
        {
          id: 2,
          dir: 2,
          path: cells([
            [3, 4],
            [2, 4],
            [1, 4],
            [0, 4],
          ]),
        },
      ],
    };
    const s = styleMetrics(level);
    // only the U wraps (the L and the straight line can be on at most 2 sides of a cell)
    expect(s.wrapRatio).toBeCloseTo(1 / 3);
    expect(s.straightShare).toBeCloseTo(1 / 3);
    expect(s.avgLength).toBeCloseTo(17 / 3);
    expect(s.fill).toBeCloseTo(17 / 20);
  });

  it('two lanes side by side hug; a lone arrow does not', () => {
    const lanes = {
      rows: 3,
      cols: 4,
      mask: null,
      arrows: [
        {
          id: 0,
          dir: 1,
          path: cells([
            [0, 3],
            [0, 2],
            [0, 1],
            [0, 0],
          ]),
        },
        {
          id: 1,
          dir: 3,
          path: cells([
            [1, 0],
            [1, 1],
            [1, 2],
            [1, 3],
          ]),
        },
      ],
    };
    expect(styleMetrics(lanes).hugRatio).toBe(1);
    const lone = { ...lanes, arrows: [lanes.arrows[0]] };
    expect(styleMetrics(lone).hugRatio).toBe(0);
  });

  it('turns count every change of direction; 15+ and 3+ turn shares', () => {
    // a staircase of 15 cells: right, down, right, down ... (13 turns)
    const path = [];
    for (let i = 0; i < 15; i++) path.push({ r: Math.floor(i / 2), c: Math.ceil(i / 2) });
    const level = { rows: 8, cols: 9, mask: null, arrows: [{ id: 0, dir: 3, path }] };
    const s = styleMetrics(level);
    expect(s.avgTurns).toBe(13);
    expect(s.turns3Share).toBe(1);
    expect(s.longShare15).toBe(1);
  });
});

describe('fill pass', () => {
  const deps = (lv) => {
    const occ = buildOccupancy(lv);
    return lv.arrows.map((a) => rayArrows(occ, lv, a));
  };
  it.each([10, 120, 640])('level %i: refills cut tails without a cycle, a new free arrow or a lost decoy', (n) => {
    const lv = structuredClone(generateLevel(n));
    // cut the tails of every fifth long arrow (as decoy cuts and first-move passes do)
    for (const a of lv.arrows) if (a.id % 5 === 0 && a.path.length > 8) a.path = a.path.slice(0, 5);
    const before = deps(lv);
    const freeBefore = before.filter((d) => !d.length).length;
    const decoysBefore = before.filter((d) => d.length === 1).length;
    const used = (l) => l.arrows.reduce((s, a) => s + a.path.length, 0);
    const cut = used(lv);
    expect(fillGaps(lv, 40)).toBeGreaterThan(0);
    lv.arrows = lv.arrows.filter((a) => a.path.length);
    lv.arrows.forEach((a, i) => (a.id = i));
    expect(used(lv)).toBeGreaterThan(cut);
    const after = deps(lv);
    expect(after.filter((d) => !d.length).length).toBeLessThanOrEqual(freeBefore);
    expect(after.filter((d) => d.length === 1).length).toBeGreaterThanOrEqual(decoysBefore);
    expect(analyzeLevel(lv).solvable).toBe(true);
    expect(validateLevel({ ...lv, fill: 1 })).toEqual([]);
  });
});
