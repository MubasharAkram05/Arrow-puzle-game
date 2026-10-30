import { beforeEach, describe, expect, it } from 'vitest';
import { OFFERS } from '../src/config.js';
import {
  buySaleItem,
  buyStarterPack,
  claimFreeGift,
  exchangeCoins,
  starterPackAvailable,
} from '../src/game/offerActions.js';
import {
  claimGift,
  exchange,
  formatCountdown,
  giftStatus,
  isoWeek,
  saleCandidates,
  salePrice,
  weeklySale,
} from '../src/game/offers.js';
import { state } from '../src/game/state.js';
import { applySave } from '../src/storage/save.js';
import { defaultSave } from '../src/storage/schema.js';

const H = 60 * 60 * 1000;
const T0 = Date.UTC(2026, 9, 27, 12, 0, 0);

describe('free gift timer', () => {
  it('is ready the first time and every 4 hours after a claim', () => {
    expect(giftStatus(T0, 0).ready).toBe(true);
    const first = claimGift(T0, 0);
    expect(first).toMatchObject({ ok: true, coins: 30, last: T0 });
    expect(claimGift(T0 + 3 * H, T0)).toMatchObject({ ok: false, reason: 'wait', last: T0 });
    expect(giftStatus(T0 + 3 * H, T0).remainingMs).toBe(H);
    expect(claimGift(T0 + 4 * H, T0).ok).toBe(true);
  });

  it('pays nothing when the clock moved backward and restarts the timer from now', () => {
    const back = T0 - 2 * H;
    expect(giftStatus(back, T0)).toMatchObject({ ready: false, clockBack: true });
    const res = claimGift(back, T0);
    expect(res).toMatchObject({ ok: false, coins: 0, reason: 'clock', last: back });
    expect(claimGift(back + 3 * H, res.last).ok).toBe(false);
    expect(claimGift(back + 4 * H, res.last).ok).toBe(true);
  });

  it('formats the countdown', () => {
    expect(formatCountdown(3 * H + 5 * 60 * 1000)).toBe('3h 05m');
    expect(formatCountdown(4 * 60 * 1000 + 9000)).toBe('4m 09s');
    expect(formatCountdown(-5)).toBe('0m 00s');
    expect(formatCountdown(79 * H + 31 * 60 * 1000)).toBe('3d 7h');
  });
});

describe('exchange', () => {
  it('turns 500 coins into 1 diamond and 2500 into 5', () => {
    expect(exchange({ coins: 1200, diamonds: 1 }, 1)).toEqual({ ok: true, wallet: { coins: 700, diamonds: 2 } });
    expect(exchange({ coins: 2500, diamonds: 0 }, 5).wallet).toEqual({ coins: 0, diamonds: 5 });
  });

  it('refuses without enough coins', () => {
    const res = exchange({ coins: 2400, diamonds: 0 }, 5);
    expect(res.ok).toBe(false);
    expect(res.missing.coins).toBe(100);
  });
});

describe('weekly sale', () => {
  it('computes ISO weeks (including the year edge)', () => {
    expect(isoWeek(new Date(Date.UTC(2026, 9, 27)))).toEqual({ year: 2026, week: 44 });
    expect(isoWeek(new Date(Date.UTC(2021, 0, 3)))).toEqual({ year: 2020, week: 53 });
    expect(isoWeek(new Date(Date.UTC(2024, 11, 30)))).toEqual({ year: 2025, week: 1 });
  });

  it('picks the same item for the whole week and for every time zone', () => {
    const mon = weeklySale(new Date(Date.UTC(2026, 9, 26, 0, 30)));
    const sun = weeklySale(new Date(Date.UTC(2026, 10, 1, 23, 30)));
    expect(sun.id).toBe(mon.id);
    expect(sun.cat).toBe(mon.cat);
    const weeks = new Set();
    for (let w = 0; w < 30; w++) weeks.add(weeklySale(new Date(T0 + w * 7 * 24 * H)).id);
    expect(weeks.size).toBeGreaterThan(5);
  });

  it('takes 30% off (coins rounded to 5, diamonds at least 1)', () => {
    expect(salePrice({ coins: 400 })).toEqual({ coins: 280 });
    expect(salePrice({ coins: 250 })).toEqual({ coins: 175 });
    expect(salePrice({ diamonds: 3 })).toEqual({ diamonds: 2 });
    expect(salePrice({ diamonds: 1 })).toEqual({ diamonds: 1 });
    expect(saleCandidates().every((c) => c.price)).toBe(true);
  });
});

describe('offers in the game state', () => {
  beforeEach(() => applySave(defaultSave()));

  it('starter pack: hidden before level 5, one purchase only', () => {
    state.diamonds = 10;
    expect(starterPackAvailable()).toBe(false);
    state.progress.unlocked = 5;
    expect(starterPackAvailable()).toBe(true);
    expect(buyStarterPack().ok).toBe(true);
    expect(state.diamonds).toBe(7);
    expect(state.hints).toBe(3 + 5);
    // 5 hints + Dark Slate style only (Shields were removed in 3.11.0)
    expect(state).not.toHaveProperty('boosters');
    expect(state.owned.styles).toContain('slate');
    expect(starterPackAvailable()).toBe(false);
    expect(buyStarterPack()).toMatchObject({ ok: false, reason: 'unavailable' });
    expect(state.diamonds).toBe(7);
  });

  it('starter pack needs 3 diamonds', () => {
    state.progress.unlocked = 9;
    state.diamonds = 2;
    expect(buyStarterPack().ok).toBe(false);
    expect(state.offers.starterBought).toBe(false);
  });

  it('free gift credits coins and remembers the claim time', () => {
    expect(claimFreeGift(T0)).toMatchObject({ ok: true, coins: OFFERS.freeGift.coins });
    expect(state.coins).toBe(30);
    expect(claimFreeGift(T0 + H).ok).toBe(false);
    expect(claimFreeGift(T0 - H)).toMatchObject({ ok: false, reason: 'clock' });
    expect(state.coins).toBe(30);
    expect(state.offers.giftLast).toBe(T0 - H);
  });

  it('exchange and sale purchases update the wallet', () => {
    state.coins = 1000;
    expect(exchangeCoins(1).ok).toBe(true);
    expect(state.diamonds).toBe(1);
    expect(state.stats.coinsSpent).toBe(500);
    state.coins = 5000;
    state.diamonds = 20;
    const date = new Date(T0);
    const sale = weeklySale(date);
    expect(buySaleItem(date).ok).toBe(true);
    const spent = 5000 - state.coins + (20 - state.diamonds);
    expect(spent).toBe(sale.sale.coins || sale.sale.diamonds);
    expect(buySaleItem(date).ok).toBe(false);
  });
});
