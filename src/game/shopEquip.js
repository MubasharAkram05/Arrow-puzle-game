/**
 * Equipping owned items from the Shop (the only place to equip since 3.16.0). Pure: works on a state-like
 * object (style, accent, owned, cosmetics, avatar) and returns whether anything changed.
 *
 * Categories: 'styles' and 'themes' (state.owned), the cosmetic categories of cosmetics.js (state.cosmetics)
 * and 'avatar' (premium avatars, worn as an avatar index). Free items (price null) are always owned.
 */
import { COSMETICS, SHOP_STYLES, SHOP_THEMES } from '../config.js';
import { equipCosmetic, findItem } from './cosmetics.js';

/** Every category the Shop can equip. */
export const SHOP_CATEGORIES = Object.freeze([
  'styles',
  'themes',
  'effect',
  'board',
  'head',
  'confetti',
  'sound',
  'frame',
  'avatar',
]);

/** Number of built-in avatars before the premium ones (premium p1 is avatar index BUILT_IN). */
const BUILT_IN = 12;

/** Avatar index for a premium avatar id (p1 -> 12). */
export const premiumAvatarIndex = (id) => BUILT_IN + Number(String(id).slice(1)) - 1;

/**
 * The shop item for a category and id.
 * @param {string} cat
 * @param {string} id
 * @returns {{id: string, name: string, price: object|null}|undefined}
 */
export function shopItem(cat, id) {
  if (cat === 'styles') return SHOP_STYLES.find((i) => i.id === id);
  if (cat === 'themes') return SHOP_THEMES.find((i) => i.id === id);
  if (cat === 'avatar') return COSMETICS.avatar.find((i) => i.id === id);
  return findItem(cat, id);
}

/**
 * Does the player own this item?
 * @param {object} st state-like object
 * @param {string} cat
 * @param {string} id
 * @returns {boolean}
 */
export function ownsShopItem(st, cat, id) {
  const item = shopItem(cat, id);
  if (!item) return false;
  if (item.price === null || item.price === undefined) return true;
  if (cat === 'styles' || cat === 'themes') return st.owned[cat].includes(id);
  return st.cosmetics.owned[cat].includes(id);
}

/**
 * Is this item the one in use?
 * @param {object} st
 * @param {string} cat
 * @param {string} id
 * @returns {boolean}
 */
export function isEquipped(st, cat, id) {
  if (cat === 'styles') return st.style === id;
  if (cat === 'themes') return st.accent === id;
  if (cat === 'avatar') return st.avatar === premiumAvatarIndex(id);
  return st.cosmetics.equipped[cat] === id;
}

/**
 * Equip an owned item (mutates st).
 * @param {object} st
 * @param {string} cat
 * @param {string} id
 * @returns {boolean} false when the item is unknown or not owned
 */
export function equipShopItem(st, cat, id) {
  if (!ownsShopItem(st, cat, id)) return false;
  if (cat === 'styles') st.style = id;
  else if (cat === 'themes') st.accent = id;
  else if (cat === 'avatar') st.avatar = premiumAvatarIndex(id);
  else {
    const res = equipCosmetic(st.cosmetics, cat, id);
    if (!res.ok) return false;
    st.cosmetics = res.cos;
  }
  return true;
}
