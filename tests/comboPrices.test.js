/**
 * Combo prices (3.22.0): an item can cost coins and diamonds together; buying needs both.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { COSMETICS, SHOP_STYLES, SHOP_THEMES } from '../src/config.js';
import { buyCosmetic, newCosmetics } from '../src/game/cosmetics.js';
import { canAfford, isCombo, missingLabel, priceLabel, shortfall, spend } from '../src/game/economy.js';
import { salePrice, saleCandidates } from '../src/game/offers.js';
import { buyCosmeticItem, buyItem } from '../src/game/rewards.js';
import { state } from '../src/game/state.js';
import { applySave } from '../src/storage/save.js';
import { defaultSave } from '../src/storage/schema.js';

const all = [
  ...SHOP_STYLES.map((i) => ({ cat: 'styles', ...i })),
  ...SHOP_THEMES.map((i) => ({ cat: 'themes', ...i })),
  ...Object.entries(COSMETICS).flatMap(([cat, list]) => list.map((i) => ({ cat, ...i }))),
];
const price = (cat, id) => all.find((i) => i.cat === cat && i.id === id).price;

describe('combo price rules', () => {
  it('labels show both amounts', () => {
    expect(priceLabel({ coins: 600, diamonds: 3 })).toBe('600 coins + 3 diamonds');
    expect(priceLabel({ coins: 1500, diamonds: 1 })).toBe('1,500 coins + 1 diamond');
    expect(priceLabel({ coins: 90 })).toBe('90 coins');
    expect(priceLabel({ diamonds: 3 })).toBe('3 diamonds');
    expect(isCombo({ coins: 600, diamonds: 3 })).toBe(true);
    expect(isCombo({ coins: 600 })).toBe(false);
  });

  it('buying needs both amounts', () => {
    const p = { coins: 600, diamonds: 3 };
    expect(canAfford({ coins: 600, diamonds: 3 }, p)).toBe(true);
    expect(spend({ coins: 700, diamonds: 5 }, p)).toEqual({ ok: true, wallet: { coins: 100, diamonds: 2 } });
    expect(canAfford({ coins: 599, diamonds: 9 }, p)).toBe(false);
    expect(canAfford({ coins: 9999, diamonds: 2 }, p)).toBe(false);
  });

  it('says exactly what is missing', () => {
    const p = { coins: 600, diamonds: 3 };
    expect(missingLabel(shortfall({ coins: 480, diamonds: 2 }, p))).toBe('Need 120 more coins and 1 more diamond');
    expect(missingLabel(shortfall({ coins: 480, diamonds: 3 }, p))).toBe('Need 120 more coins');
    expect(missingLabel(shortfall({ coins: 600, diamonds: 0 }, p))).toBe('Need 3 more diamonds');
    expect(missingLabel(shortfall({ coins: 599, diamonds: 3 }, p))).toBe('Need 1 more coin');
    expect(missingLabel(shortfall({ coins: 600, diamonds: 3 }, p))).toBe('');
  });

  it('the weekly sale takes 30% off both parts', () => {
    expect(salePrice({ coins: 1000, diamonds: 5 })).toEqual({ coins: 700, diamonds: 4 });
    expect(salePrice({ coins: 600, diamonds: 3 })).toEqual({ coins: 420, diamonds: 2 });
    expect(saleCandidates().some((c) => isCombo(c.price))).toBe(true);
  });
});

describe('combo items in the shop', () => {
  it('the top premium items cost coins + diamonds, from 600 + 3 up to 1500 + 8', () => {
    for (const [cat, id] of [
      ['effect', 'rocket'],
      ['board', 'stars'],
      ['frame', 'gold'],
      ['frame', 'diamond'],
      ...COSMETICS.avatar.map((a) => ['avatar', a.id]),
    ])
      expect(isCombo(price(cat, id)), `${cat}:${id}`).toBe(true);
    const combos = all.filter((i) => i.price && isCombo(i.price));
    for (const i of combos) {
      expect(i.price.coins, i.id).toBeGreaterThanOrEqual(600);
      expect(i.price.coins, i.id).toBeLessThanOrEqual(1500);
      expect(i.price.diamonds, i.id).toBeGreaterThanOrEqual(3);
      expect(i.price.diamonds, i.id).toBeLessThanOrEqual(8);
    }
  });

  it('5 new premium combo items: 2 arrow styles, 1 escape effect, 1 board, 1 frame', () => {
    const fresh = [
      ['styles', 'rose'],
      ['styles', 'neon'],
      ['effect', 'aurora'],
      ['board', 'blueprint'],
      ['frame', 'prism'],
    ];
    for (const [cat, id] of fresh) expect(isCombo(price(cat, id)), `${cat}:${id}`).toBe(true);
  });
});

describe('buying a combo item', () => {
  beforeEach(() => applySave(defaultSave()));

  it('enough of both: pays both and owns it', () => {
    const res = buyCosmetic({ coins: 1100, diamonds: 6 }, newCosmetics(), 'effect', 'rocket');
    expect(res.ok).toBe(true);
    expect(res.wallet).toEqual({ coins: 100, diamonds: 1 });
    state.coins = 1100;
    state.diamonds = 6;
    expect(
      buyItem(
        'styles',
        SHOP_STYLES.find((s) => s.id === 'neon'),
      ).ok,
    ).toBe(true);
    expect(state.owned.styles).toContain('neon');
    expect([state.coins, state.diamonds]).toEqual([0, 0]);
  });

  it('short of coins, of diamonds, or of both: nothing is paid', () => {
    for (const [coins, diamonds, missing] of [
      [999, 5, { coins: 1, diamonds: 0 }],
      [1000, 4, { coins: 0, diamonds: 1 }],
      [880, 4, { coins: 120, diamonds: 1 }],
    ]) {
      state.coins = coins;
      state.diamonds = diamonds;
      const res = buyCosmeticItem('effect', 'rocket');
      expect(res).toMatchObject({ ok: false, missing });
      expect([state.coins, state.diamonds]).toEqual([coins, diamonds]);
      expect(state.cosmetics.owned.effect).not.toContain('rocket');
    }
  });

  it('coins spent on a combo item count toward Big Spender', () => {
    state.coins = 600;
    state.diamonds = 3;
    expect(buyCosmeticItem('avatar', 'p1').ok).toBe(true);
    expect(state.stats.coinsSpent).toBe(600);
  });
});
