/**
 * Boosters: inventory counts and per-level rules. Pure functions, no DOM.
 * Inventory: { shield, reveal, autoClear, extraHeart } counts.
 * Level state: { shield: active?, autoClears: used this level, moved: any tap made, assisted: booster or hint used }.
 */
import { BOOSTERS } from '../config.js';

/** Booster ids in display order. */
export const BOOSTER_IDS = Object.freeze(['shield', 'reveal', 'autoClear', 'extraHeart']);

/**
 * Empty inventory.
 * @returns {Record<string, number>}
 */
export function newInventory() {
  return Object.fromEntries(BOOSTER_IDS.map((id) => [id, 0]));
}

/**
 * Fresh per-level booster state.
 * @returns {{shield: boolean, autoClears: number, moved: boolean, assisted: boolean}}
 */
export function newLevelBoosts() {
  return { shield: false, autoClears: 0, moved: false, assisted: false };
}

/**
 * Add boosters (a purchase or a pack). Unknown ids and bad counts are ignored.
 * @param {Record<string, number>} inv
 * @param {Record<string, number>} add
 * @returns {Record<string, number>}
 */
export function addBoosters(inv, add) {
  const out = { ...inv };
  for (const id of BOOSTER_IDS) {
    const n = add[id];
    if (Number.isInteger(n) && n > 0) out[id] = (out[id] || 0) + n;
  }
  return out;
}

/**
 * Why a booster can't be used right now, or '' when it can (ignoring the count).
 * @param {string} id
 * @param {ReturnType<typeof newLevelBoosts>} lvl
 * @returns {string}
 */
export function blockedReason(id, lvl) {
  if (id === 'shield' && lvl.shield) return 'A shield is already active';
  if (id === 'autoClear' && lvl.autoClears >= BOOSTERS.autoClear.maxPerLevel) {
    return `Only ${BOOSTERS.autoClear.maxPerLevel} Auto-Clear per level`;
  }
  if (id === 'extraHeart' && lvl.moved) return 'Use it before your first move';
  return '';
}

/**
 * Use one booster from the inventory.
 * @param {string} id
 * @param {Record<string, number>} inv
 * @param {ReturnType<typeof newLevelBoosts>} lvl
 * @returns {{ok: boolean, reason?: string, inv: Record<string, number>, lvl: ReturnType<typeof newLevelBoosts>}}
 */
export function useBooster(id, inv, lvl) {
  if (!BOOSTER_IDS.includes(id)) return { ok: false, reason: 'Unknown booster', inv, lvl };
  const blocked = blockedReason(id, lvl);
  if (blocked) return { ok: false, reason: blocked, inv, lvl };
  if (!(inv[id] > 0)) return { ok: false, reason: 'none', inv, lvl };
  const next = { ...lvl, assisted: true };
  if (id === 'shield') next.shield = true;
  if (id === 'autoClear') next.autoClears = lvl.autoClears + 1;
  return { ok: true, inv: { ...inv, [id]: inv[id] - 1 }, lvl: next };
}

/**
 * A wrong tap happened: an active shield absorbs it (and breaks).
 * @param {ReturnType<typeof newLevelBoosts>} lvl
 * @returns {{absorbed: boolean, lvl: ReturnType<typeof newLevelBoosts>}}
 */
export function absorbWrongTap(lvl) {
  if (!lvl.shield) return { absorbed: false, lvl };
  return { absorbed: true, lvl: { ...lvl, shield: false } };
}

/**
 * Is a finished level perfect? No heart lost and no booster or hint used.
 * @param {number} heartsLeft
 * @param {number} maxHearts
 * @param {boolean} assisted
 * @returns {boolean}
 */
export function isPerfect(heartsLeft, maxHearts, assisted) {
  return !assisted && heartsLeft >= maxHearts;
}
