/**
 * Small validators shared by the save schema: numbers, lists, cosmetics and avatars. Pure.
 */
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
