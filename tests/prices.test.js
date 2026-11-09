/**
 * Prices (3.22.0): consumables and every shop item, read from src/config.js.
 */
import { describe, expect, it } from 'vitest';
import { COSMETICS, MAX_REFILLS_PER_LEVEL, OFFERS, PRICES, SHOP_STYLES, SHOP_THEMES } from '../src/config.js';
import { salePrice } from '../src/game/offers.js';
import { buyContinue, buyHints, refillHeart } from '../src/game/rewards.js';
import { state } from '../src/game/state.js';
import { sanitize } from '../src/storage/schema.js';

const items = () => [
  ...SHOP_STYLES.map((i) => ({ cat: 'styles', ...i })),
  ...SHOP_THEMES.map((i) => ({ cat: 'themes', ...i })),
  ...Object.entries(COSMETICS).flatMap(([cat, list]) => list.map((i) => ({ cat, ...i }))),
];

describe('consumable prices', () => {
  it('hint 90, 5-hint pack 350, heart refill 150 (max 2 per level), continue 3 diamonds', () => {
    expect(PRICES.hint).toEqual({ coins: 90 });
    expect(PRICES.hintPack).toEqual({ coins: 350, count: 5 });
    expect(PRICES.heartRefill).toEqual({ coins: 150 });
    expect(PRICES.continueGame).toEqual({ diamonds: 3 });
  });

  it('buying takes the new amounts', () => {
    state.coins = 500;
    state.diamonds = 0;
    state.hints = 0;
    expect(buyHints(PRICES.hint).ok).toBe(true);
    expect(state.coins).toBe(410);
    expect(buyHints(PRICES.hintPack).ok).toBe(true);
    expect(state.coins).toBe(60);
    expect(state.hints).toBe(6);
    expect(buyHints(PRICES.hint).ok).toBe(false);
    // refills: 150 each, still at most 2 per level attempt
    Object.assign(state, { coins: 1000, diamonds: 3, hearts: 1, maxHearts: 5, refillsUsed: 0 });
    expect(MAX_REFILLS_PER_LEVEL).toBe(2);
    expect(refillHeart().ok).toBe(true);
    expect(refillHeart().ok).toBe(true);
    expect(refillHeart()).toMatchObject({ ok: false, reason: 'limit' });
    expect(state.coins).toBe(700);
    expect(buyContinue().ok).toBe(true);
    expect(state.diamonds).toBe(0);
  });
});

describe('shop item prices', () => {
  it('coins-only items cost 400-900 coins, diamonds-only items 4-15 diamonds', () => {
    for (const i of items()) {
      if (!i.price) continue;
      if (i.price.coins && !i.price.diamonds) {
        expect(i.price.coins, i.id).toBeGreaterThanOrEqual(400);
        expect(i.price.coins, i.id).toBeLessThanOrEqual(900);
      }
      if (i.price.diamonds && !i.price.coins) {
        expect(i.price.diamonds, i.id).toBeGreaterThanOrEqual(4);
        expect(i.price.diamonds, i.id).toBeLessThanOrEqual(15);
      }
    }
  });

  it('the weekly sale takes 30% off the new price', () => {
    expect(OFFERS.weeklySale.discount).toBe(0.3);
    expect(salePrice({ coins: 800 })).toEqual({ coins: 560 });
    expect(salePrice({ diamonds: 8 })).toEqual({ diamonds: 6 });
  });

  it('items bought at the old prices stay owned', () => {
    const save = sanitize({
      version: 6,
      items: { owned: { styles: ['classic', 'slate'], themes: ['blue', 'coral'] }, style: 'slate', accent: 'coral' },
      cosmetics: {
        owned: { effect: ['default', 'rocket'], board: ['plain', 'stars'] },
        equipped: { effect: 'rocket' },
      },
    });
    expect(save.items.owned.styles).toContain('slate');
    expect(save.items.owned.themes).toContain('coral');
    expect(save.cosmetics.owned.effect).toContain('rocket');
    expect(save.cosmetics.owned.board).toContain('stars');
    expect(save.cosmetics.equipped.effect).toBe('rocket');
  });
});
