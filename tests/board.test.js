import { describe, expect, it } from 'vitest';
import { buildOccupancy, clearArrow, freeArrows, rayArrows, rayBlocker } from '../src/engine/index.js';

// 3x3 board:
//   row 0: A A .     A = arrow 0, head (0,1) pointing right
//   row 1: B . .     B = arrow 1, head (1,0) pointing up (blocked by A at (0,0))
//   row 2: B C C     C = arrow 2, head (2,1) pointing left (blocked by B)
const level = {
  rows: 3,
  cols: 3,
  mask: null,
  arrows: [
    {
      id: 0,
      dir: 1,
      path: [
        { r: 0, c: 1 },
        { r: 0, c: 0 },
      ],
    },
    {
      id: 1,
      dir: 0,
      path: [
        { r: 1, c: 0 },
        { r: 2, c: 0 },
      ],
    },
    {
      id: 2,
      dir: 3,
      path: [
        { r: 2, c: 1 },
        { r: 2, c: 2 },
      ],
    },
  ],
};

describe('buildOccupancy', () => {
  it('maps every cell to its arrow id or -1', () => {
    expect(Array.from(buildOccupancy(level))).toEqual([0, 0, -1, 1, -1, -1, 1, 2, 2]);
  });
});

describe('rayBlocker', () => {
  it('returns null when the way out is clear', () => {
    const occ = buildOccupancy(level);
    expect(rayBlocker(occ, 3, 3, level.arrows[0].path[0], 1)).toBeNull();
  });

  it('returns the first blocker and the gap before it', () => {
    const occ = buildOccupancy(level);
    expect(rayBlocker(occ, 3, 3, level.arrows[1].path[0], 0)).toEqual({ id: 0, dist: 0 });
    expect(rayBlocker(occ, 3, 3, { r: 2, c: 2 }, 0)).toBeNull();
    expect(rayBlocker(occ, 3, 3, { r: 1, c: 2 }, 3)).toEqual({ id: 1, dist: 1 });
  });
});

describe('rayArrows', () => {
  it('lists each distinct arrow in front of the head once', () => {
    const occ = buildOccupancy(level);
    expect(rayArrows(occ, level, level.arrows[2])).toEqual([1]);
    expect(rayArrows(occ, level, level.arrows[0])).toEqual([]);
  });
});

describe('freeArrows + clearArrow', () => {
  it('frees arrows as blockers are removed', () => {
    const occ = buildOccupancy(level);
    const removed = new Uint8Array(3);
    expect(freeArrows(occ, level, removed)).toEqual([0]);
    clearArrow(occ, 3, level.arrows[0]);
    removed[0] = 1;
    expect(freeArrows(occ, level, removed)).toEqual([1]);
    clearArrow(occ, 3, level.arrows[1]);
    removed[1] = 1;
    expect(freeArrows(occ, level, removed)).toEqual([2]);
  });
});
