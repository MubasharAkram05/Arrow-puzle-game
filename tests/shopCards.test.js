/**
 * Shop redesign (3.26.0): what each item card shows (Buy, not enough money, Owned, Equipped, locked, Sale and New
 * badges) and the Free rewards rows (x/N today, done at the daily limit). Items, prices and purchase logic are
 * unchanged.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { ADS, OFFERS, SHOP_STYLES } from '../src/config.js';
import { state } from '../src/game/state.js';
import { card, cardMode, section } from '../src/ui/screens/shop/cards.js';
import { EARN_ORDER, earnLabel, earnView, freeRewardsCard } from '../src/ui/screens/shop/adEarn.js';

const W = (coins, diamonds) => ({ coins, diamonds });
const P = { coins: 600 };
const COMBO = { coins: 600, diamonds: 3 };

describe('cardMode', () => {
  it('Buy when the wallet can pay; greyed "short" when it cannot', () => {
    expect(cardMode({ price: P }, W(600, 0))).toBe('buy');
    expect(cardMode({ price: P }, W(599, 99))).toBe('short');
    expect(cardMode({ price: { diamonds: 8 } }, W(9999, 7))).toBe('short');
  });

  it('a combo price needs both amounts', () => {
    expect(cardMode({ price: COMBO }, W(600, 3))).toBe('buy');
    expect(cardMode({ price: COMBO }, W(600, 2))).toBe('short');
    expect(cardMode({ price: COMBO }, W(599, 3))).toBe('short');
  });

  it('a sale price is what counts', () => {
    expect(cardMode({ price: P, sale: { coins: 420 } }, W(420, 0))).toBe('buy');
  });

  it('Owned (tap to equip), Equipped, free items, locked, custom footer', () => {
    expect(cardMode({ price: P, owned: true }, W(0, 0))).toBe('owned');
    expect(cardMode({ price: P, owned: true, equipped: true }, W(0, 0))).toBe('equipped');
    expect(cardMode({ price: null }, W(0, 0))).toBe('owned');
    expect(cardMode({ price: P, locked: 'Unlocks at level 5' }, W(9999, 99))).toBe('locked');
    expect(cardMode({ foot: '<b>x</b>' }, W(0, 0))).toBe('free');
  });
});

describe('card markup', () => {
  beforeEach(() => Object.assign(state, { coins: 500, diamonds: 2, seenNew: new Set() }));
  const mode = (html) => html.match(/data-mode="(\w+)"/)[1];

  it('price button for each state', () => {
    expect(card({ kind: 'styles', id: 'x', name: 'X', preview: '', price: { coins: 400 } })).toMatch(
      /price-btn is-buy/,
    );
    const short = card({ kind: 'styles', id: 'x', name: 'X', preview: '', price: { coins: 900 } });
    expect(mode(short)).toBe('short');
    expect(short).toMatch(/price-btn is-short/);
    const owned = card({ kind: 'styles', id: 'x', name: 'X', preview: '', price: P, owned: true });
    expect(owned).toContain('price-btn is-owned">Equip<');
    const eq = card({ kind: 'styles', id: 'x', name: 'X', preview: '', price: P, owned: true, equipped: true });
    expect(eq).toContain('class="eq-badge"');
    expect(eq).toContain('Equipped');
  });

  it('Sale and New badges in the corner; Sale shows the old price crossed out', () => {
    const html = card({
      kind: 'board',
      id: 'paper',
      name: 'Paper',
      preview: '',
      price: { coins: 600 },
      sale: { coins: 420 },
      newKey: 'board:paper',
    });
    expect(html).toContain('<span class="tag sale">Sale</span>');
    expect(html).toContain('<span class="tag new">New</span>');
    expect(html).toContain('class="old-price"');
  });

  it('an extra tag such as "Save 20%"', () => {
    expect(card({ kind: 'hint', id: 'pack', name: '5 Hints', preview: '', price: P, tag: 'Save 20%' })).toContain(
      '<span class="tag save">Save 20%</span>',
    );
  });

  it('section heading has an icon and a subtitle', () => {
    const html = section('Arrow Styles', [], 'none', { icon: 'palette', sub: 'How the arrows look' });
    expect(html).toContain('class="sec-icon"');
    expect(html).toContain('<p>How the arrows look</p>');
  });

  it('every item card has the same structure: preview, name, one button', () => {
    for (const s of SHOP_STYLES) {
      const html = card({ kind: 'styles', id: s.id, name: s.name, preview: '<i></i>', price: s.price });
      expect(html.match(/class="shop-preview"/g)).toHaveLength(1);
      expect(html.match(/class="card-name"/g)).toHaveLength(1);
      expect(html.match(/class="price-btn /g)).toHaveLength(1);
    }
  });
});

describe('Free rewards rows', () => {
  it('x/N today with progress; done at the limit ("Come back tomorrow")', () => {
    expect(earnView({ state: 'ready', used: 2, cap: 5 })).toEqual({
      done: false,
      sub: '2/5 today',
      button: 'Watch',
      progress: 0.4,
    });
    expect(earnView({ state: 'noad', used: 0, cap: 10 })).toMatchObject({ done: false, button: 'Watch' });
    expect(earnView({ state: 'limit', used: 5, cap: 5 })).toEqual({
      done: true,
      sub: 'Come back tomorrow',
      button: 'Done',
      progress: 1,
    });
  });

  it('labels come from ADS.earn', () => {
    expect(EARN_ORDER.map(earnLabel)).toEqual([
      `+${ADS.earn.diamond.amount} diamond`,
      `+${ADS.earn.hint.amount} hint`,
      `+${ADS.earn.coins.amount} coins`,
    ]);
  });

  it('one card: three Watch rows in order, then the Free Gift with its amount', () => {
    Object.assign(state, { offers: { ...state.offers, giftLast: Date.now() } });
    const html = freeRewardsCard();
    expect(html).toContain('Free rewards');
    const ids = [...html.matchAll(/data-kind="(adearn|gift)" data-id="(\w+)"/g)].map((m) => m[2]);
    expect(ids).toEqual(['diamond', 'hint', 'coins', 'gift']);
    expect(html).toContain(`Free gift: +${OFFERS.freeGift.coins} coins`);
    expect(html).toContain('data-countdown'); // just claimed: the countdown shows
    expect(html.match(/class="earn-btn/g).length).toBe(4);
  });
});

describe('Offers tab', () => {
  it('starter pack (ribbon, items, price), weekly sale (-30%, old price), exchange (arrow)', async () => {
    const { render } = await import('../src/ui/screens/shop/offersTab.js');
    Object.assign(state, { coins: 0, diamonds: 0, offers: { ...state.offers, starterBought: false } });
    state.progress.unlocked = Math.max(state.progress.unlocked, OFFERS.starterPack.minLevel + 1);
    const html = render();
    expect(html).toContain('class="ribbon">One-time offer<');
    expect(html).toContain(`<b>x${OFFERS.starterPack.contents.hints}</b>`);
    expect(html).toContain(`>-${Math.round(OFFERS.weeklySale.discount * 100)}%<`);
    expect(html).toMatch(/class="sale-card"[\s\S]*class="old-price"/);
    expect(html.match(/class="exchange-card"/g)).toHaveLength(2);
    expect(html).toContain('#i-arrow-right');
    // empty wallet: every price button is greyed
    expect(html).not.toMatch(/price-btn is-buy/);
    expect(render({ inAll: true })).not.toContain('Free rewards');
  });
});
