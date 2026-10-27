import { describe, expect, it } from 'vitest';
import { solveLevel, validateLevel } from '../src/engine/index.js';

const chain = {
  rows: 3,
  cols: 3,
  mask: null,
  fill: 6 / 9,
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

// Two arrows pointing at each other: neither can ever leave.
const deadlock = {
  rows: 1,
  cols: 4,
  mask: null,
  fill: 1,
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
      dir: 3,
      path: [
        { r: 0, c: 2 },
        { r: 0, c: 3 },
      ],
    },
  ],
};

describe('solveLevel', () => {
  it('solves a chain in dependency order, one arrow per round', () => {
    expect(solveLevel(chain)).toEqual({ solvable: true, order: [0, 1, 2], rounds: 3 });
  });

  it('reports a deadlock as unsolvable', () => {
    const res = solveLevel(deadlock);
    expect(res.solvable).toBe(false);
    expect(res.order).toEqual([]);
  });

  it('removes independent arrows in the same round', () => {
    const level = {
      rows: 2,
      cols: 2,
      arrows: [
        {
          id: 0,
          dir: 0,
          path: [
            { r: 0, c: 0 },
            { r: 1, c: 0 },
          ],
        },
        {
          id: 1,
          dir: 0,
          path: [
            { r: 0, c: 1 },
            { r: 1, c: 1 },
          ],
        },
      ],
    };
    expect(solveLevel(level).rounds).toBe(1);
  });
});

describe('validateLevel', () => {
  it('accepts a correct board apart from low fill', () => {
    expect(validateLevel(chain)).toEqual(['fill 0.67']);
  });

  it('flags overlaps, gaps, bad heads and deadlocks', () => {
    const broken = {
      rows: 3,
      cols: 3,
      mask: null,
      fill: 1,
      arrows: [
        {
          id: 0,
          dir: 2,
          path: [
            { r: 0, c: 0 },
            { r: 0, c: 1 },
          ],
        },
        {
          id: 1,
          dir: 0,
          path: [
            { r: 0, c: 1 },
            { r: 2, c: 1 },
          ],
        },
      ],
    };
    const errs = validateLevel(broken);
    expect(errs).toContain('arrow 0 bad direction');
    expect(errs).toContain('cell overlap at 0,1');
    expect(errs).toContain('arrow 1 not contiguous');
    expect(validateLevel(deadlock)).toContain('not solvable');
  });
});
