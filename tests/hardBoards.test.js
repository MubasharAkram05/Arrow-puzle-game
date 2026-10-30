import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  analyzeLevel,
  buildLevel,
  buildOccupancy,
  generateLevel,
  getLevelConfig,
  hashSeed,
  loadShapeLibrary,
  meetsGoals,
  mulberry32,
  rayArrows,
  validateLevel,
} from '../src/engine/index.js';
import { freePerMove, longestNearestChain } from '../src/engine/metrics.js';
import { deepenLevel } from '../src/engine/deepen.js';
import { hideFreeMoves } from '../src/engine/firstMoves.js';
import { joinLate, makeDecoys } from '../src/engine/reshape.js';
import { LEVELS, TIER_FLOORS } from '../src/config.js';

beforeAll(() => loadShapeLibrary());

/** A level-n board built by reverse peeling only (none of the hard passes), so a pass can be tested alone. */
function plainBoard(n, attempt = 0) {
  const cfg = { ...getLevelConfig(n), deepen: undefined };
  return buildLevel(cfg, mulberry32(hashSeed(n, attempt)));
}

const freeCount = (b) => {
  const occ = buildOccupancy(b);
  return b.arrows.filter((a) => !rayArrows(occ, b, a).length).length;
};
const compact = (b) => {
  b.arrows = b.arrows.filter((a) => a.path.length);
  b.arrows.forEach((a, i) => (a.id = i));
};

describe('difficulty metrics', () => {
  it('freePerMove: one arrow per move, oldest free first; a single chain has 1 option at every move', () => {
    // 0 free; 1 waits for 0; 2 waits for 1
    expect(freePerMove([[], [0], [1]])).toEqual({ freePerMove: 1, minFree: 1, solved: 3 });
    // 0 and 1 free; 2 waits for both
    expect(freePerMove([[], [], [0, 1]])).toMatchObject({ minFree: 1, solved: 3 });
  });

  it('longestNearestChain follows the nearest blocker of each arrow', () => {
    expect(longestNearestChain([null, 0, 1, 1])).toBe(3);
    expect(longestNearestChain([null, null])).toBe(1);
  });

  it('analyzeLevel reports free arrows per round, decoys and free heads on the ring', () => {
    const board = {
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
    const r = analyzeLevel(board);
    expect(r.freePerRound).toBe(1); // 3 arrows over 3 rounds
    expect(r.longestChain).toBe(3);
    expect(r.decoyRatio).toBeCloseTo(2 / 3); // 1 and 2 each have exactly one arrow in the way
    expect(r.edgeFreeRatio).toBe(1); // the only free head is on the border
  });
});

describe('hard-board passes keep every board solvable', () => {
  it('deepenLevel turns arrows so the solve gets longer, never shorter', () => {
    for (const n of [40, 250, 5000]) {
      const b = plainBoard(n);
      const before = analyzeLevel(b);
      expect(deepenLevel(b, { passes: 3, decoys: true })).toBeGreaterThan(0);
      const after = analyzeLevel(b);
      expect(validateLevel(b)).toEqual([]);
      expect(after.rounds).toBeGreaterThan(before.rounds);
      expect(after.startFree).toBe(before.startFree);
    }
  });

  it('joinLate makes fewer arrows without fewer solve rounds or new free arrows', () => {
    const b = plainBoard(250);
    const before = analyzeLevel(b);
    const done = joinLate(b, 30, LEVELS.maxLen);
    compact(b);
    const after = analyzeLevel(b);
    expect(done).toBeGreaterThan(0);
    expect(b.arrows).toHaveLength(before.depths.length - done);
    expect(after.rounds).toBeGreaterThanOrEqual(before.rounds);
    expect(after.startFree).toBe(before.startFree);
    expect(validateLevel(b)).toEqual([]);
  });

  it('makeDecoys adds decoys inside its cell budget and frees nothing', () => {
    const b = plainBoard(1000);
    const before = analyzeLevel(b);
    const cut = makeDecoys(b, 120, { maxCut: 30 });
    const after = analyzeLevel(b);
    expect(cut).toBeGreaterThan(0);
    expect(cut).toBeLessThanOrEqual(120);
    expect(after.decoyRatio).toBeGreaterThan(before.decoyRatio);
    expect(after.startFree).toBe(before.startFree);
    expect(validateLevel(b)).toEqual([]);
  });

  it('hideFreeMoves never adds free arrows and keeps at least one', () => {
    for (let at = 0; at < 4; at++) {
      const b = plainBoard(600, at);
      const before = freeCount(b);
      hideFreeMoves(b, mulberry32(at), 2, 60, 0.5);
      compact(b);
      expect(freeCount(b)).toBeGreaterThanOrEqual(1);
      expect(freeCount(b)).toBeLessThanOrEqual(before);
      expect(validateLevel(b)).toEqual([]);
    }
  });

  it('plain hard boards hide a first move inside the board (the corridor end)', () => {
    const plain = [];
    for (let n = 101; n < 160; n++) if (n % 3) plain.push(n); // every 3rd level is a shape
    for (const n of plain) expect(analyzeLevel(generateLevel(n)).edgeFreeRatio, `level ${n}`).toBeLessThan(1);
  });
});

describe('tiers', () => {
  it('each tier is at least as hard as the one before on every floor', () => {
    const order = LEVELS.curve.tiers.map((t) => TIER_FLOORS[t.label]);
    for (let i = 1; i < order.length; i++) {
      const [a, b] = [order[i - 1], order[i]];
      expect(b.boost).toBeGreaterThanOrEqual(a.boost);
      expect(b.minLongestChain).toBeGreaterThanOrEqual(a.minLongestChain);
      expect(b.minDecoyRatio).toBeGreaterThanOrEqual(a.minDecoyRatio);
      expect(b.maxStartFree).toBeLessThanOrEqual(a.maxStartFree);
      expect(b.maxFreePerRound).toBeLessThanOrEqual(a.maxFreePerRound);
      expect(b.maxEdgeFreeRatio).toBeLessThanOrEqual(a.maxEdgeFreeRatio);
    }
  });

  it('the tutorial (levels 1-3) is exactly the same as before', () => {
    const strip = (lv) => lv.arrows.map((a) => ({ id: a.id, dir: a.dir, path: a.path.map((p) => [p.r, p.c]) }));
    const hash = createHash('md5')
      .update(JSON.stringify([1, 2, 3].map((n) => strip(generateLevel(n)))))
      .digest('hex');
    expect(hash).toBe('977824cfc70f75bd8fae6e5c598f21a0');
  });

  it('meetsGoals checks the new floors', () => {
    const r = { solvable: true, depths: [0], startFree: 1, avgDepth: 5, rounds: 5 };
    const ok = { ...r, freePerRound: 2, longestChain: 9, decoyRatio: 0.2, edgeFreeRatio: 0 };
    const goals = { maxStartFree: 2, minAvgDepth: 1, minRounds: 1, ...TIER_FLOORS.Normal };
    expect(meetsGoals(ok, goals)).toBe(true);
    expect(meetsGoals({ ...ok, freePerRound: 3.5 }, goals)).toBe(false);
    expect(meetsGoals({ ...ok, longestChain: 7 }, goals)).toBe(false);
    expect(meetsGoals({ ...ok, decoyRatio: 0.1 }, goals)).toBe(false);
    expect(meetsGoals({ ...ok, edgeFreeRatio: 1 }, goals)).toBe(false);
  });
});
