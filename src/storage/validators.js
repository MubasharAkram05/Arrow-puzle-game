/**
 * Small validators shared by the save schema: numbers, lists, cosmetics and avatars. Pure.
 */
import { MAX_DAILY_DAYS } from '../game/trophies.js';
import { BOOSTER_REFUND } from '../config.js';
import { CATEGORIES, findItem, newCosmetics } from '../game/cosmetics.js';

export const LIMIT = 1e9; // keeps absurd numbers out of the UI

/** Whole number >= 0; anything else (negative, NaN, string, Infinity) becomes the fallback. */
export const count = (v, fallback = 0) => (Number.isFinite(v) && v >= 0 ? Math.min(Math.floor(v), LIMIT) : fallback);
/** Level number >= 1 or null. */
export const level = (v) => (Number.isInteger(v) && v >= 1 && v <= LIMIT ? v : null);
/** Sorted, de-duplicated list of level numbers. */
export const levels = (v) => (Array.isArray(v) ? [...new Set(v.map(level).filter(Boolean))].sort((a, b) => a - b) : []);
/** Millisecond timestamp (0 = never); anything invalid becomes 0. */
export const timestamp = (v) => (Number.isFinite(v) && v > 0 && v < 1e14 ? Math.floor(v) : 0);
export const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
export const bool = (v, fallback) => (typeof v === 'boolean' ? v : fallback);
export const oneOf = (v, list, fallback) => (list.includes(v) ? v : fallback);

/**
 * "New" badge keys already seen: short "category:id" strings, unique, capped.
 * @param {unknown} v
 * @returns {string[]}
 */
export function seenKeys(v) {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((k) => typeof k === 'string' && /^[a-z]+:[a-z0-9-]{1,24}$/i.test(k)))].slice(0, 200);
}

/**
 * Validate cosmetics: owned lists keep only real items (plus the free defaults),
 * and an equipped item must be owned.
 * @param {unknown} raw
 * @returns {ReturnType<typeof newCosmetics>}
 */
export function sanitizeCosmetics(raw) {
  const def = newCosmetics();
  const c = obj(raw);
  const owned = obj(c.owned);
  const equipped = obj(c.equipped);
  const out = { owned: {}, equipped: {} };
  for (const cat of [...CATEGORIES, 'avatar']) {
    const list = Array.isArray(owned[cat])
      ? owned[cat].filter((id) => typeof id === 'string' && findItem(cat, id))
      : [];
    out.owned[cat] = [...new Set([...def.owned[cat], ...list])];
  }
  for (const cat of CATEGORIES) {
    out.equipped[cat] = out.owned[cat].includes(equipped[cat]) ? equipped[cat] : def.equipped[cat];
  }
  return out;
}

/**
 * Avatar index: 0-11 are free, 12-17 are premium and need to be owned; anything else wraps into the free ones.
 * @param {number} i
 * @param {{owned: Record<string, string[]>}} cosmetics
 * @returns {number}
 */
export function avatarIndex(i, cosmetics) {
  if (i < 12) return i;
  if (i < 18) return cosmetics.owned.avatar.includes(`p${i - 11}`) ? i : 0;
  return i % 12;
}

/** Owned ids filtered to real items, always including the free one. */
export function ownedList(v, items) {
  const ids = items.map((i) => i.id);
  const list = Array.isArray(v) ? v.filter((id) => ids.includes(id)) : [];
  return [...new Set([ids[0], ...list])];
}

/**
 * Collected shape ids: unique short id strings (checked against the library when shown, not here, because
 * the library loads later).
 * @param {unknown} v
 * @returns {string[]}
 */
export function shapeIds(v) {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((x) => typeof x === 'string' && /^[A-Za-z0-9-]{1,40}$/.test(x)))];
}

/**
 * Daily reward record (see src/game/daily.js). Day numbers must be plausible; the streak can't exceed the best.
 * @param {unknown} raw
 * @returns {import('../game/daily.js').DailyRecord}
 */
export function sanitizeDaily(raw) {
  const d = obj(raw);
  const day = (v) => (Number.isInteger(v) && v > 0 && v < 1e6 ? v : null);
  const streak = count(d.streak);
  const lastClaim = day(d.lastClaim);
  return {
    lastClaim,
    streak: lastClaim === null ? 0 : streak,
    best: Math.max(count(d.best), lastClaim === null ? 0 : streak),
    lastSeen: timestamp(d.lastSeen),
    blockedDay: day(d.blockedDay),
  };
}

/**
 * Days the daily reward was claimed (local day numbers, oldest first), for the monthly trophies. A save from
 * before 3.16.0 has no list: it is rebuilt from the record, since a streak is a run of consecutive claimed
 * days ending at lastClaim. Earlier days are unknown and count as not claimed (their months start at 0).
 * @param {unknown} raw
 * @param {import('../game/daily.js').DailyRecord} daily already sanitized
 * @returns {number[]}
 */
export function dailyDays(raw, daily) {
  if (!Array.isArray(raw)) {
    if (daily.lastClaim === null) return [];
    const n = Math.max(1, Math.min(daily.streak, MAX_DAILY_DAYS));
    return Array.from({ length: n }, (_, i) => daily.lastClaim - n + 1 + i);
  }
  const ok = raw.filter((v) => Number.isInteger(v) && v > 0 && v < 1e6);
  return [...new Set(ok)].sort((a, b) => a - b).slice(-MAX_DAILY_DAYS);
}

/**
 * Claimed achievement ids, with renamed ids mapped to their new ones.
 * @param {unknown} raw
 * @param {Record<string, string>} renamed
 * @returns {string[]}
 */
export function claimedIds(raw, renamed) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((x) => typeof x === 'string').map((x) => renamed[x] ?? x))];
}

/**
 * Claimed achievement steps whose award badge has been seen on the Awards tab (no red dot). A save from
 * before 3.16.0 has no list: everything already claimed counts as seen, so old badges don't all show a dot.
 * @param {unknown} raw
 * @param {string[]} claimed
 * @returns {string[]}
 */
export function seenBadgeIds(raw, claimed) {
  if (!Array.isArray(raw)) return [...claimed];
  return [...new Set(raw.filter((x) => typeof x === 'string' && claimed.includes(x)))];
}

/**
 * Coins and diamonds owed for boosters a save still holds (they were removed; see BOOSTER_REFUND).
 * @param {unknown} raw the save's old `boosters` record
 * @returns {{coins: number, diamonds: number}}
 */
export function boosterRefund(raw) {
  const b = obj(raw);
  let coins = 0;
  let diamonds = 0;
  for (const [id, pay] of Object.entries(BOOSTER_REFUND)) {
    const n = count(b[id]);
    coins += n * (pay.coins || 0);
    diamonds += n * (pay.diamonds || 0);
  }
  return { coins: Math.min(coins, LIMIT), diamonds: Math.min(diamonds, LIMIT) };
}

/**
 * Refund waiting to be announced (a toast once), or null.
 * @param {unknown} raw
 * @returns {{coins: number, diamonds: number}|null}
 */
export function pendingRefund(raw) {
  const r = obj(raw);
  const coins = count(r.coins);
  const diamonds = count(r.diamonds);
  return coins || diamonds ? { coins, diamonds } : null;
}
