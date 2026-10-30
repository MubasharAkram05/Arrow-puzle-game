/**
 * Per-level help tracking. Pure, no DOM. Using a hint marks the level as assisted: it can't be perfect and
 * doesn't count for Brain Power.
 */

/**
 * Fresh per-level state.
 * @returns {{assisted: boolean}}
 */
export function newLevelAssist() {
  return { assisted: false };
}

/**
 * Is a finished level perfect? No heart lost and no hint used.
 * @param {number} heartsLeft
 * @param {number} maxHearts
 * @param {boolean} assisted a hint was used
 * @returns {boolean}
 */
export function isPerfect(heartsLeft, maxHearts, assisted) {
  return !assisted && heartsLeft >= maxHearts;
}
