/**
 * Migrations from older save formats: v1 (single key) and v2 (before the shop expansion). Pure.
 */
import { REWARDS } from '../config.js';
import { sanitize } from './schema.js';
import { obj } from './validators.js';

/** Chapter size used by saves made before chapters had 40 levels. */
export const OLD_CHAPTER_SIZE = 20;

/**
 * Convert rewarded chapter numbers from an older chapter size to the current one.
 * A new chapter counts as rewarded only when every old chapter inside it was rewarded,
 * so no player loses a chapter reward (at worst a half-rewarded chapter pays again).
 * @param {number[]} rewarded old chapter numbers
 * @param {number} oldSize
 * @returns {number[]}
 */
export function convertChapters(rewarded, oldSize) {
  const size = REWARDS.chapterSize;
  if (oldSize === size) return rewarded;
  const old = new Set(rewarded);
  const lastLevel = Math.max(0, ...rewarded) * oldSize;
  const out = [];
  for (let c = 1; (c - 1) * size < lastLevel; c++) {
    const first = (c - 1) * size + 1;
    let all = true;
    for (let l = first; l < first + size; l += oldSize) if (!old.has(Math.ceil(l / oldSize))) all = false;
    if (all) out.push(c);
  }
  return out;
}

/**
 * Convert a v1 save to the current format. Keeps level progress, hints, settings and the equipped style
 * (every style was free in v1, so the one in use stays owned). Daily records are dropped.
 * @param {unknown} raw
 * @returns {object} sanitized current save
 */
export function migrateV1(raw) {
  const v = obj(raw);
  return sanitize({
    progress: {
      current: v.current,
      unlocked: v.unlocked,
      completed: v.completed,
      perfect: v.perfect,
      masks: v.masks,
      chaptersRewarded: v.chaptersRewarded,
    },
    wallet: { coins: v.coins, diamonds: v.diamonds, hints: v.hints },
    xp: v.xp,
    stats: v.stats,
    achievements: { claimed: v.claimed },
    items: {
      owned: { styles: ['classic', v.style, ...(obj(v.owned).styles || [])], themes: obj(v.owned).themes },
      style: v.style,
      accent: v.accent,
    },
    profile: { avatar: v.avatar, name: v.name },
    settings: { theme: v.theme, sound: v.sound, vibration: v.vibration, grid: v.grid },
  });
}

/**
 * Convert a v2 save to v3. v3 keeps every v2 field (progress, coins, diamonds, items, achievements,
 * settings) and adds booster inventory, cosmetics, offers and seen "New" badges, which start empty
 * unless the v2 save already had them.
 * @param {unknown} raw
 * @returns {object} sanitized v3 save
 */
export function migrateV2(raw) {
  return sanitize({ ...obj(raw), version: 3 });
}
