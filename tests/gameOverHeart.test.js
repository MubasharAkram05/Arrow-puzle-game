/**
 * Game Over hearts (3.26.0): +1 heart for 3 diamonds, or +1 heart for a rewarded ad (within the refill limit).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_REFILLS_PER_LEVEL, PRICES } from '../src/config.js';
import { adRefillHeart, buyGameOverHeart, refillHeart } from '../src/game/rewards.js';
import { state } from '../src/game/state.js';
import { heartOffer } from '../src/ui/modals/gameoverOffer.js';

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

describe('heartOffer: how the Get +1 heart card looks', () => {
  it('ad ready and enough diamonds: Watch Ad primary, diamonds outlined, no note', () => {
    expect(heartOffer({ adReady: true, refillsLeft: 2, missingDiamonds: 0 })).toEqual({
      ad: 'ready',
      gems: 'secondary',
      note: '',
    });
  });

  it('short of diamonds: diamonds disabled and the note says how many are missing', () => {
    const o = heartOffer({ adReady: true, refillsLeft: 1, missingDiamonds: 2 });
    expect(o).toMatchObject({ ad: 'ready', gems: 'short' });
    expect(o.note).toBe('Need 2 more diamonds');
    expect(heartOffer({ adReady: true, refillsLeft: 1, missingDiamonds: 1 }).note).toBe('Need 1 more diamond');
  });

  it('no ad loaded or daily cap reached: Watch Ad disabled, diamonds become the main button', () => {
    expect(heartOffer({ adReady: false, refillsLeft: 2, missingDiamonds: 0 })).toEqual({
      ad: 'unavailable',
      gems: 'main',
      note: '',
    });
  });

  it('no refills left this level: the ad is off even when one is loaded', () => {
    expect(heartOffer({ adReady: true, refillsLeft: 0, missingDiamonds: 0 })).toMatchObject({
      ad: 'limit',
      gems: 'main',
    });
  });

  it('both unavailable: both disabled and a short hint points to Try Again', () => {
    const o = heartOffer({ adReady: false, refillsLeft: 2, missingDiamonds: 3 });
    expect(o).toMatchObject({ ad: 'unavailable', gems: 'short' });
    expect(o.note).toContain('Need 3 more diamonds');
    expect(o.note).toContain('Try Again');
  });
});
