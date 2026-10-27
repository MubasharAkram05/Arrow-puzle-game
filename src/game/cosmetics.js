/**
 * Cosmetics: ownership, purchase and equipping. Pure functions, no DOM.
 * Shape: { owned: { [category]: string[] }, equipped: { [category]: string } }.
 * Premium avatars are owned here (category "avatar"); the 12 free avatars are always available.
 */
import { COSMETICS } from '../config.js';
import { spend } from './economy.js';

/** Categories that have an equipped item (avatars are equipped through the profile). */
export const CATEGORIES = Object.freeze(['effect', 'board', 'head', 'confetti', 'sound', 'frame']);

/**
 * Item of a category, or undefined.
 * @param {string} cat
 * @param {string} id
 * @returns {{id: string, name: string, price: object|null, achievement?: string}|undefined}
 */
export function findItem(cat, id) {
  return (COSMETICS[cat] || []).find((i) => i.id === id);
}

/**
 * Defaults: every free item owned and equipped.
 * @returns {{owned: Record<string, string[]>, equipped: Record<string, string>}}
 */
export function newCosmetics() {
  const owned = { avatar: [] };
  const equipped = {};
  for (const cat of CATEGORIES) {
    owned[cat] = [COSMETICS[cat][0].id];
    equipped[cat] = COSMETICS[cat][0].id;
  }
  return { owned, equipped };
}

/**
 * Does the player own an item?
 * @param {ReturnType<typeof newCosmetics>} cos
 * @param {string} cat
 * @param {string} id
 * @returns {boolean}
 */
export function isOwned(cos, cat, id) {
  const item = findItem(cat, id);
  return !!item && (item.price === null || (cos.owned[cat] || []).includes(id));
}

/**
 * Add an item to the owned list (purchase or achievement reward).
 * @returns {ReturnType<typeof newCosmetics>}
 */
export function grantCosmetic(cos, cat, id) {
  if (!findItem(cat, id) || (cos.owned[cat] || []).includes(id)) return cos;
  return { ...cos, owned: { ...cos.owned, [cat]: [...(cos.owned[cat] || []), id] } };
}

/**
 * Buy an item.
 * @param {{coins: number, diamonds: number}} wallet
 * @param {ReturnType<typeof newCosmetics>} cos
 * @param {string} cat
 * @param {string} id
 * @param {object} [price] price to pay (defaults to the item price, e.g. a sale price)
 * @returns {{ok: boolean, reason?: string, missing?: object, wallet: object, cos: object}}
 */
export function buyCosmetic(wallet, cos, cat, id, price) {
  const item = findItem(cat, id);
  if (!item) return { ok: false, reason: 'unknown', wallet, cos };
  if (isOwned(cos, cat, id)) return { ok: false, reason: 'owned', wallet, cos };
  const res = spend(wallet, price || item.price);
  if (!res.ok) return { ok: false, reason: 'funds', missing: res.missing, wallet, cos };
  return { ok: true, wallet: res.wallet, cos: grantCosmetic(cos, cat, id) };
}

/**
 * Equip an owned item.
 * @returns {{ok: boolean, cos: ReturnType<typeof newCosmetics>}}
 */
export function equipCosmetic(cos, cat, id) {
  if (!CATEGORIES.includes(cat) || !isOwned(cos, cat, id)) return { ok: false, cos };
  return { ok: true, cos: { ...cos, equipped: { ...cos.equipped, [cat]: id } } };
}

/**
 * Cosmetics an achievement unlocks for free.
 * @param {string} achievementId
 * @returns {{cat: string, id: string}[]}
 */
export function achievementUnlocks(achievementId) {
  const out = [];
  for (const cat of Object.keys(COSMETICS)) {
    for (const item of COSMETICS[cat]) if (item.achievement === achievementId) out.push({ cat, id: item.id });
  }
  return out;
}
