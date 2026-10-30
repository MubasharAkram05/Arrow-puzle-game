/**
 * Migrations from older save formats: v1 (single key), v2 (before the shop expansion) and v3 (before the
 * shape collection). Pure.
 */
import { REWARDS } from '../config.js';
import { isShapeLevel, ORIGINAL_SHAPES, shapeSlot } from '../engine/index.js';
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
 * Shapes a pre-collection save has already won: before 3.7.0 shape levels cycled through the 20 original
 * shapes (level 6 heart, 9 arrow, ...), so each finished shape level gives the shape it really showed.
 * @param {number[]} completed finished levels
 * @returns {string[]} shape ids
 */
export function legacyShapes(completed) {
  const ids = completed.filter(isShapeLevel).map((n) => ORIGINAL_SHAPES[shapeSlot(n) % ORIGINAL_SHAPES.length]);
  return [...new Set(ids)];
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
 * Convert a v2 save. The current format keeps every v2 field (progress, coins, diamonds, items, achievements,
 * settings) and adds booster inventory, cosmetics, offers, seen "New" badges (start empty unless the v2 save
 * already had them) and the shape collection (filled from finished shape levels).
 * @param {unknown} raw
 * @returns {object} sanitized current save
 */
export function migrateV2(raw) {
  return sanitize({ ...obj(raw), version: 4 });
}

/**
 * Convert a v3 save to v4: everything is kept, and the new shape collection starts with the shapes of the
 * shape levels already finished (see legacyShapes).
 * @param {unknown} raw
 * @returns {object} sanitized v4 save
 */
export function migrateV3(raw) {
  // v3 had no shapes list, so sanitize fills it from the finished shape levels
  return sanitize({ ...obj(raw), version: 4 });
}
