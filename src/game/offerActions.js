/**
 * Applies shop offers to the game state (no DOM). Rules live in offers.js.
 */
import { OFFERS, SHOP_STYLES, SHOP_THEMES } from '../config.js';
import { claimGift, exchange, starterPackVisible, weeklySale } from './offers.js';
import { buyCosmeticItem, buyItem, credit, pay } from './rewards.js';
import { state } from './state.js';

/**
 * Is the starter pack on offer for this player?
 * @returns {boolean}
 */
export function starterPackAvailable() {
  return starterPackVisible({ bought: state.offers.starterBought, unlocked: state.progress.unlocked });
}

/**
 * Buy the one-time starter pack: hints and the Dark Slate style.
 * @returns {{ok: boolean, reason?: string, missing?: object}}
 */
export function buyStarterPack() {
  if (!starterPackAvailable()) return { ok: false, reason: 'unavailable' };
  const res = pay(OFFERS.starterPack.price);
  if (!res.ok) return res;
  const c = OFFERS.starterPack.contents;
  state.hints += c.hints;
  if (!state.owned.styles.includes(c.style)) state.owned = { ...state.owned, styles: [...state.owned.styles, c.style] };
  state.offers = { ...state.offers, starterBought: true };
  return { ok: true };
}

/**
 * Claim the free gift now.
 * @param {number} [now]
 * @returns {{ok: boolean, coins: number, reason?: string}}
 */
export function claimFreeGift(now = Date.now()) {
  const res = claimGift(now, state.offers.giftLast);
  state.offers = { ...state.offers, giftLast: res.last };
  if (res.ok) credit({ coins: res.coins }, 'gift');
  return res;
}

/**
 * Exchange coins for diamonds (counts as coins spent).
 * @param {number} times diamonds to buy
 * @returns {{ok: boolean, missing?: object}}
 */
export function exchangeCoins(times) {
  const res = exchange({ coins: state.coins, diamonds: state.diamonds }, times);
  if (!res.ok) return res;
  const spent = state.coins - res.wallet.coins;
  state.coins = res.wallet.coins;
  state.diamonds = res.wallet.diamonds;
  state.stats = { ...state.stats, coinsSpent: state.stats.coinsSpent + spent };
  return { ok: true };
}

/**
 * Buy this week's sale item at the sale price.
 * @param {Date} [date]
 * @returns {{ok: boolean, reason?: string, missing?: object}}
 */
export function buySaleItem(date = new Date()) {
  const s = weeklySale(date);
  if (s.cat === 'styles' || s.cat === 'themes') {
    const item = (s.cat === 'styles' ? SHOP_STYLES : SHOP_THEMES).find((i) => i.id === s.id);
    if (state.owned[s.cat].includes(s.id)) return { ok: false, reason: 'owned' };
    return buyItem(s.cat, { ...item, price: s.sale });
  }
  return buyCosmeticItem(s.cat, s.id, s.sale);
}
