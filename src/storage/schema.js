/**
 * Save format v4, validation and loading (v3, v2 and v1 saves are migrated, see migrate.js).
 * Pure: storage is passed in, so tests can use a fake.
 */
import { REWARDS, SHOP_STYLES, SHOP_THEMES, START_HINTS, THEMES } from '../config.js';
import { BOOSTER_IDS } from '../game/boosters.js';
import { newCosmetics } from '../game/cosmetics.js';
import { convertChapters, legacyShapes, migrateV1, migrateV2, migrateV3, OLD_CHAPTER_SIZE } from './migrate.js';
import {
  avatarIndex,
  bool,
  count,
  level,
  levels,
  obj,
  oneOf,
  ownedList,
  sanitizeCosmetics,
  seenKeys,
  shapeIds,
  timestamp,
} from './validators.js';

export const V1_KEY = 'arrowEscape.save.v1';
export const V2_KEY = 'arrowEscape:v2';
export const V2_BACKUP_KEY = 'arrowEscape:v2:backup';
export const V3_KEY = 'arrowEscape:v3';
export const V3_BACKUP_KEY = 'arrowEscape:v3:backup';
export const V4_KEY = 'arrowEscape:v4';
export const BACKUP_KEY = 'arrowEscape:v4:backup';
export const VERSION = 4;
const STAT_KEYS = [
  'arrowsCleared',
  'wins',
  'streak',
  'bestStreak',
  'perfectStreak',
  'bestPerfectStreak',
  'coinsSpent',
  'playSeconds',
  'boostersUsed',
  'hintsUsed',
];
/**
 * A new player's save.
 * @returns {object}
 */
export function defaultSave() {
  return {
    version: VERSION,
    progress: {
      current: 1,
      unlocked: 1,
      completed: [],
      perfect: [],
      masks: [],
      shapes: [],
      chaptersRewarded: [],
      chapterSize: REWARDS.chapterSize,
    },
    wallet: { coins: 0, diamonds: 0, hints: START_HINTS },
    boosters: { shield: 0, extraHeart: 0 },
    cosmetics: newCosmetics(),
    offers: { starterBought: false, giftLast: 0 },
    seenNew: [],
    xp: 0,
    stats: Object.fromEntries(STAT_KEYS.map((k) => [k, 0])),
    achievements: { claimed: [], progress: {} },
    items: { owned: { styles: ['classic'], themes: ['blue'] }, style: 'classic', accent: 'blue' },
    profile: { avatar: 0, name: 'Player' },
    settings: { theme: 'auto', sound: true, vibration: true, grid: false },
  };
}

export { convertChapters, migrateV1, migrateV2, migrateV3, OLD_CHAPTER_SIZE, sanitizeCosmetics };

/**
 * Validate any parsed value into a complete v4 save. Unknown keys are dropped,
 * bad numbers become 0, and an equipped item must be owned. Saves from before the shape collection
 * (no `shapes` list) get the shapes of their finished shape levels.
 * @param {unknown} raw
 * @returns {object}
 */
export function sanitize(raw) {
  const d = obj(raw);
  const def = defaultSave();
  const p = obj(d.progress);
  const completed = levels(p.completed);
  // unlocked never drops below the furthest completed level + 1, so progress can't be lost
  const unlocked = Math.max(level(p.unlocked) || 1, (completed[completed.length - 1] || 0) + 1);
  const current = Math.min(level(p.current) || 1, unlocked);
  const w = obj(d.wallet);
  const st = obj(d.stats);
  const it = obj(d.items);
  const owned = obj(it.owned);
  const styles = ownedList(owned.styles, SHOP_STYLES);
  const themes = ownedList(owned.themes, SHOP_THEMES);
  const pr = obj(d.profile);
  const name =
    typeof pr.name === 'string' && pr.name.trim().length >= 3 ? pr.name.trim().slice(0, 16) : def.profile.name;
  const se = obj(d.settings);
  const ach = obj(d.achievements);
  const cosmetics = sanitizeCosmetics(d.cosmetics);
  return {
    version: VERSION,
    progress: {
      current,
      unlocked,
      completed,
      perfect: levels(p.perfect).filter((n) => completed.includes(n)),
      masks: levels(p.masks).filter((n) => completed.includes(n)),
      shapes: Array.isArray(p.shapes) ? shapeIds(p.shapes) : legacyShapes(completed),
      // saves without chapterSize were made with 20-level chapters
      chaptersRewarded: convertChapters(levels(p.chaptersRewarded), count(p.chapterSize) || OLD_CHAPTER_SIZE),
      chapterSize: REWARDS.chapterSize,
    },
    wallet: { coins: count(w.coins), diamonds: count(w.diamonds), hints: count(w.hints, START_HINTS) },
    boosters: Object.fromEntries(BOOSTER_IDS.map((id) => [id, count(obj(d.boosters)[id])])),
    cosmetics,
    offers: { starterBought: bool(obj(d.offers).starterBought, false), giftLast: timestamp(obj(d.offers).giftLast) },
    seenNew: seenKeys(d.seenNew),
    xp: count(d.xp),
    stats: Object.fromEntries(STAT_KEYS.map((k) => [k, count(st[k])])),
    achievements: {
      claimed: Array.isArray(ach.claimed) ? [...new Set(ach.claimed.filter((x) => typeof x === 'string'))] : [],
      progress: Object.fromEntries(Object.entries(obj(ach.progress)).map(([k, v]) => [k, count(v)])),
    },
    items: {
      owned: { styles, themes },
      style: oneOf(it.style, styles, 'classic'),
      accent: oneOf(it.accent, themes, 'blue'),
    },
    profile: { avatar: avatarIndex(count(pr.avatar), cosmetics), name },
    settings: {
      theme: oneOf(se.theme, THEMES, def.settings.theme),
      sound: bool(se.sound, true),
      vibration: bool(se.vibration, true),
      grid: bool(se.grid, false),
    },
  };
}

/** JSON.parse that returns undefined instead of throwing. */
function parse(text) {
  if (typeof text !== 'string') return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Parsed object stored under a key, or undefined. */
function readKey(storage, key) {
  const v = parse(storage.getItem(key));
  return v && typeof v === 'object' ? v : undefined;
}

/**
 * Write a migrated save, then drop the old keys only once the new save is safely stored.
 * @returns {object} the migrated data
 */
function upgrade(storage, data, oldKeys) {
  if (writeSave(storage, data)) oldKeys.forEach((k) => storage.removeItem(k));
  return data;
}

/**
 * Read the save: v4, then its backup, then v3 (or its backup), v2 (or its backup) and v1, migrated to v4.
 * Old keys are removed only after v4 is written. Otherwise defaults. Never throws, even if storage is unavailable.
 * @param {{getItem: Function, setItem: Function, removeItem: Function}|null} storage
 * @returns {{data: object, source: 'v4'|'backup'|'v3'|'v2'|'v1'|'new'}}
 */
export function readSave(storage) {
  try {
    const main = readKey(storage, V4_KEY);
    if (main) return { data: sanitize(main), source: 'v4' };
    const backup = readKey(storage, BACKUP_KEY);
    if (backup) return { data: sanitize(backup), source: 'backup' };
    const old = [V3_KEY, V3_BACKUP_KEY, V2_KEY, V2_BACKUP_KEY, V1_KEY];
    const v3 = readKey(storage, V3_KEY) || readKey(storage, V3_BACKUP_KEY);
    if (v3) return { data: upgrade(storage, migrateV3(v3), old), source: 'v3' };
    const v2 = readKey(storage, V2_KEY) || readKey(storage, V2_BACKUP_KEY);
    if (v2) return { data: upgrade(storage, migrateV2(v2), old), source: 'v2' };
    const v1 = readKey(storage, V1_KEY);
    if (v1) return { data: upgrade(storage, migrateV1(v1), old), source: 'v1' };
  } catch {
    // storage blocked: play with defaults
  }
  return { data: defaultSave(), source: 'new' };
}

/**
 * Write the save and a backup copy, then read it back to confirm.
 * @param {{getItem: Function, setItem: Function}} storage
 * @param {object} data
 * @returns {boolean} true when the save is stored and readable
 */
export function writeSave(storage, data) {
  try {
    const text = JSON.stringify(data);
    storage.setItem(V4_KEY, text);
    storage.setItem(BACKUP_KEY, text);
    return storage.getItem(V4_KEY) === text;
  } catch {
    return false;
  }
}
