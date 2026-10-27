import { describe, expect, it } from 'vitest';
import { analyzeLevel, meetsGoals } from '../src/engine/index.js';

// Chain: 0 is free, 1 waits for 0, 2 waits for 1 (and so for 0 too).
const chain = {
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

// Arrow 2 points up through both 0 and 1, which are independent and free.
const fan = {
  rows: 3,
  cols: 4,
  mask: null,
  arrows: [
    {
      id: 0,
      dir: 3,
      path: [
        { r: 0, c: 0 },
        { r: 0, c: 1 },
      ],
    },
    {
      id: 1,
      dir: 1,
      path: [
        { r: 1, c: 3 },
        { r: 1, c: 2 },
      ],
    },
    {
      id: 2,
      dir: 0,
      path: [
        { r: 2, c: 1 },
        { r: 2, c: 2 },
      ],
    },
  ],
};

describe('analyzeLevel', () => {
  it('counts every arrow that must leave first, through the whole chain', () => {
    const r = analyzeLevel(chain);
    expect(r.depths).toEqual([0, 1, 2]);
    expect(r.startFree).toBe(1);
    expect(r.maxDepth).toBe(2);
    expect(r.avgDepth).toBe(1);
    expect(r.rounds).toBe(3);
    expect(r.solvable).toBe(true);
  });

  it('only counts arrows actually in the way', () => {
    const r = analyzeLevel(fan);
    expect(r.depths).toEqual([0, 0, 1]);
    expect(r.startFree).toBe(2);
    expect(r.startFreeRatio).toBeCloseTo(2 / 3);
    expect(r.rounds).toBe(2);
  });

  it('marks a deadlock as unsolvable', () => {
    const deadlock = {
      rows: 1,
      cols: 4,
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
          dir: 3,
          path: [
            { r: 0, c: 2 },
            { r: 0, c: 3 },
          ],
        },
      ],
    };
    expect(analyzeLevel(deadlock).solvable).toBe(false);
  });
});

describe('meetsGoals', () => {
  const report = analyzeLevel(chain);

  it('passes when there are no goals', () => {
    expect(meetsGoals(report, null)).toBe(true);
  });

  it('checks start-free cap, average depth and chain length', () => {
    expect(meetsGoals(report, { maxStartFree: 1, minAvgDepth: 1, minRounds: 3 })).toBe(true);
    expect(meetsGoals(report, { maxStartFree: 0, minAvgDepth: 1, minRounds: 3 })).toBe(false);
    expect(meetsGoals(report, { maxStartFree: 1, minAvgDepth: 1.5, minRounds: 3 })).toBe(false);
    expect(meetsGoals(report, { maxStartFree: 1, minAvgDepth: 1, minRounds: 4 })).toBe(false);
  });
});
