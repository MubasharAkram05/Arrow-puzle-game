/**
 * Game Over hearts (3.26.0): +1 heart for 3 diamonds, or +1 heart for a rewarded ad (within the refill limit).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_REFILLS_PER_LEVEL, PRICES } from '../src/config.js';
import { adRefillHeart, buyGameOverHeart, refillHeart } from '../src/game/rewards.js';
import { state } from '../src/game/state.js';

beforeEach(() => Object.assign(state, { coins: 1000, diamonds: 10, hearts: 0, maxHearts: 3, refillsUsed: 0 }));

describe('+1 heart for diamonds', () => {
  it('costs 3 diamonds and gives exactly one heart', () => {
    expect(PRICES.gameOverHeart).toEqual({ diamonds: 3 });
    expect(buyGameOverHeart().ok).toBe(true);
    expect(state.hearts).toBe(1);
    expect(state.diamonds).toBe(7);
  });

  it('short of diamonds: nothing changes, and it says how many are missing', () => {
    state.diamonds = 1;
    expect(buyGameOverHeart()).toMatchObject({ ok: false, missing: { coins: 0, diamonds: 2 } });
    expect([state.hearts, state.diamonds]).toEqual([0, 1]);
  });

  it('not limited per level (it replaces the old unlimited Continue)', () => {
    state.refillsUsed = MAX_REFILLS_PER_LEVEL;
    expect(buyGameOverHeart().ok).toBe(true);
  });
});

describe('+1 heart for a rewarded ad', () => {
  it('gives exactly one heart and counts as one of the 2 refills per level', () => {
    expect(adRefillHeart().ok).toBe(true);
    expect(state.hearts).toBe(1);
    expect(state.refillsUsed).toBe(1);
    expect(refillHeart().ok).toBe(true); // a coin refill uses the other one
    state.hearts = 0;
    expect(adRefillHeart()).toMatchObject({ ok: false, reason: 'limit' });
    expect(state.hearts).toBe(0);
  });
});
