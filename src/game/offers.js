/**
 * Shop offers: starter pack, free gift timer, coin-to-diamond exchange, weekly sale.
 * Pure functions, no DOM; "now" is always passed in so tests can control the clock.
 */
import { COSMETICS, OFFERS, SHOP_STYLES, SHOP_THEMES } from '../config.js';
import { hashSeed } from '../engine/rng.js';
import { spend } from './economy.js';

/**
 * Should the starter pack be offered?
 * @param {{bought: boolean, unlocked: number}} s
 * @returns {boolean}
 */
export function starterPackVisible(s) {
  return !s.bought && s.unlocked >= OFFERS.starterPack.minLevel;
}

/**
 * Free gift status at a time.
 * @param {number} now ms since epoch
 * @param {number} last last claim time (0 = never)
 * @returns {{ready: boolean, remainingMs: number, clockBack: boolean}}
 */
export function giftStatus(now, last) {
  const interval = OFFERS.freeGift.intervalMs;
  if (!last) return { ready: true, remainingMs: 0, clockBack: false };
  if (now < last) return { ready: false, remainingMs: interval, clockBack: true };
  const left = last + interval - now;
  return { ready: left <= 0, remainingMs: Math.max(0, left), clockBack: false };
}

/**
 * Claim the free gift. When the clock moved backward, nothing is paid and the timer restarts from now.
 * @param {number} now
 * @param {number} last
 * @returns {{ok: boolean, coins: number, last: number, reason?: 'wait'|'clock'}}
 */
export function claimGift(now, last) {
  const s = giftStatus(now, last);
  if (s.clockBack) return { ok: false, coins: 0, last: now, reason: 'clock' };
  if (!s.ready) return { ok: false, coins: 0, last, reason: 'wait' };
  return { ok: true, coins: OFFERS.freeGift.coins, last: now };
}

/**
 * Countdown label, e.g. "3h 05m" or "4m 09s".
 * @param {number} ms
 * @returns {string}
 */
export function formatCountdown(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(s % 60).padStart(2, '0')}s`;
}

/**
 * Exchange coins for diamonds.
 * @param {{coins: number, diamonds: number}} wallet
 * @param {number} times how many diamonds to buy (1 or the bulk amount)
 * @returns {{ok: boolean, wallet: object, missing?: object}}
 */
export function exchange(wallet, times) {
  const n = Number.isInteger(times) && times > 0 ? times : 1;
  const res = spend(wallet, { coins: OFFERS.exchange.coins * n });
  if (!res.ok) return { ok: false, wallet, missing: res.missing };
  return { ok: true, wallet: { ...res.wallet, diamonds: res.wallet.diamonds + OFFERS.exchange.diamonds * n } };
}

/**
 * ISO 8601 week of a date, in UTC so every time zone agrees.
 * @param {Date} date
 * @returns {{year: number, week: number}}
 */
export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day); // Thursday of this week decides the year
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return { year: d.getUTCFullYear(), week: Math.ceil(((d - yearStart) / 86400000 + 1) / 7) };
}

/**
 * Every paid cosmetic that can be on sale, as { cat, id, name, price }.
 * Styles and themes use the categories "styles" and "themes".
 * @returns {{cat: string, id: string, name: string, price: object}[]}
 */
export function saleCandidates() {
  const out = [];
  for (const s of SHOP_STYLES) if (s.price) out.push({ cat: 'styles', id: s.id, name: s.name, price: s.price });
  for (const t of SHOP_THEMES) if (t.price) out.push({ cat: 'themes', id: t.id, name: t.name, price: t.price });
  for (const cat of Object.keys(COSMETICS)) {
    for (const i of COSMETICS[cat]) if (i.price) out.push({ cat, id: i.id, name: i.name, price: i.price });
  }
  return out;
}

/**
 * Discounted price (coins rounded to 5, diamonds rounded, never below 1).
 * @param {{coins?: number, diamonds?: number}} price
 * @returns {{coins?: number, diamonds?: number}}
 */
export function salePrice(price) {
  const k = 1 - OFFERS.weeklySale.discount;
  if (price.diamonds) return { diamonds: Math.max(1, Math.round(price.diamonds * k)) };
  return { coins: Math.max(5, Math.round((price.coins * k) / 5) * 5) };
}

/**
 * This week's sale item: the same for everyone during an ISO week.
 * @param {Date} date
 * @returns {{cat: string, id: string, name: string, price: object, sale: object, week: number, year: number}}
 */
export function weeklySale(date) {
  const { year, week } = isoWeek(date);
  const list = saleCandidates();
  const item = list[hashSeed(year, week) % list.length];
  return { ...item, sale: salePrice(item.price), week, year };
}
