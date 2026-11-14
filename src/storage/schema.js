/**
 * Save format v8, validation and loading (v7, v6, v5, v4, v3, v2 and v1 saves are migrated, see migrate.js).
 * Pure: storage is passed in, so tests can use a fake.
 */
import { REWARDS, SHOP_STYLES, SHOP_THEMES, START_HINTS, THEMES } from '../config.js';
import { newCosmetics } from '../game/cosmetics.js';
import { newDaily } from '../game/daily.js';
import {
  convertChapters,
  legacyShapes,
  migrateV1,
  migrateV2,
  migrateV3,
  migrateV4,
  migrateV5,
  migrateV6,
  migrateV7,
  OLD_CHAPTER_SIZE,
  STYLE_UPGRADE,
} from './migrate.js';
import {
  avatarIndex,
  bool,
  boosterRefund,
  claimedIds,
  dailyDays,
  count,
  level,
  levels,
  obj,
  oneOf,
  ownedList,
  pendingRefund,
  sanitizeCosmetics,
  sanitizeDaily,
  sanitizeQuests,
  seenBadgeIds,
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
export const V4_BACKUP_KEY = 'arrowEscape:v4:backup';
export const V5_KEY = 'arrowEscape:v5';
export const V5_BACKUP_KEY = 'arrowEscape:v5:backup';
export const V6_KEY = 'arrowEscape:v6';
export const V6_BACKUP_KEY = 'arrowEscape:v6:backup';
export const V7_KEY = 'arrowEscape:v7';
export const V7_BACKUP_KEY = 'arrowEscape:v7:backup';
export const V8_KEY = 'arrowEscape:v8';
export const BACKUP_KEY = 'arrowEscape:v8:backup';
export const VERSION = 8;
const STAT_KEYS = [
  'arrowsCleared',
  'wins',
  'streak',
  'bestStreak',
  'perfectStreak',
  'bestPerfectStreak',
  'coinsSpent',
  'playSeconds',
  'hintsUsed',
  'cleanLevels',
  'comebacks',
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
    pendingRefund: null,
    cosmetics: newCosmetics(),
    offers: { starterBought: false, giftLast: 0 },
    seenNew: [],
    daily: newDaily(),
    dailyDays: [],
    seenBadges: [],
    quests: { week: 0, counts: {}, claimed: [], chests: [] },
    xp: 0,
    stats: Object.fromEntries(STAT_KEYS.map((k) => [k, 0])),
    achievements: { claimed: [], progress: {} },
    items: { owned: { styles: ['classic'], themes: ['blue'] }, style: 'classic', accent: 'blue' },
    profile: { avatar: 0, name: 'Player' },
    settings: { theme: 'auto', sound: true, vibration: true, grid: false },
  };
}

export {
  convertChapters,
  migrateV1,
  migrateV2,
  migrateV3,
  migrateV4,
  migrateV5,
  migrateV6,
  migrateV7,
  OLD_CHAPTER_SIZE,
  sanitizeCosmetics,
  STYLE_UPGRADE,
};

/** Renamed achievement ids: the old single-step Shape Solver claim counts as Shape Solver I (never paid twice). */
const RENAMED_CLAIMS = Object.freeze({ 'shape-solver': 'shape-solver-1' });

/**
 * Validate any parsed value into a complete v8 save. Unknown keys are dropped, bad numbers become 0, an
 * equipped item must be owned, and fields newer than the save are filled in (e.g. dailyDays, seenBadges).
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
  // saves before v8 stored the old arrow styles (arrow color + background together): each becomes an arrow color
  // and a board, both owned, and the equipped one equips both (STYLE_UPGRADE in migrate.js)
  const legacy = count(d.version) < 8;
  const up = (id) => STYLE_UPGRADE[id] || null;
  // only the old style ids count in an old save: an unknown id there must not become a new arrow color for free
  const oldStyles = Array.isArray(owned.styles) ? owned.styles.filter((id) => STYLE_UPGRADE[id]) : [];
  const styles = ownedList(legacy ? oldStyles.map((id) => up(id)?.arrow ?? id) : owned.styles, SHOP_STYLES);
  const themes = ownedList(owned.themes, SHOP_THEMES);
  const pr = obj(d.profile);
  const name =
    typeof pr.name === 'string' && pr.name.trim().length >= 3 ? pr.name.trim().slice(0, 16) : def.profile.name;
  const se = obj(d.settings);
  const ach = obj(d.achievements);
  const cosmetics = legacy
    ? upgradeBoards(sanitizeCosmetics(d.cosmetics), oldStyles, up(it.style))
    : sanitizeCosmetics(d.cosmetics);
  // Shield and Extra Heart boosters are gone: whatever a save still holds is paid back once
  // (v6 saves never store boosters, so this can't pay twice)
  const refund = boosterRefund(d.boosters);
  const owed = pendingRefund(d.pendingRefund) || { coins: 0, diamonds: 0 };
  const daily = sanitizeDaily(d.daily);
  const claimed = claimedIds(ach.claimed, RENAMED_CLAIMS);
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
    wallet: {
      coins: count(count(w.coins) + refund.coins),
      diamonds: count(count(w.diamonds) + refund.diamonds),
      hints: count(w.hints, START_HINTS),
    },
    pendingRefund: pendingRefund({ coins: owed.coins + refund.coins, diamonds: owed.diamonds + refund.diamonds }),
    cosmetics,
    offers: { starterBought: bool(obj(d.offers).starterBought, false), giftLast: timestamp(obj(d.offers).giftLast) },
    seenNew: seenKeys(d.seenNew),
    daily,
    dailyDays: dailyDays(d.dailyDays, daily),
    seenBadges: seenBadgeIds(d.seenBadges, claimed),
    quests: sanitizeQuests(d.quests),
    xp: count(d.xp),
    stats: Object.fromEntries(STAT_KEYS.map((k) => [k, count(st[k])])),
    achievements: {
      claimed,
      progress: Object.fromEntries(Object.entries(obj(ach.progress)).map(([k, v]) => [k, count(v)])),
    },
    items: {
      owned: { styles, themes },
      style: oneOf(legacy ? (up(it.style)?.arrow ?? it.style) : it.style, styles, 'classic'),
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

/**
 * v8 upgrade of the cosmetics: own the board of every old style the player owned, and when the old style was
 * equipped with the plain board, equip its board (a bought board stays equipped: it was the one on screen).
 * @param {{owned: Record<string, string[]>, equipped: Record<string, string>}} cos sanitized cosmetics
 * @param {string[]} oldStyles old style ids
 * @param {{arrow: string, board: string}|null} equippedUp the upgrade of the equipped old style
 */
function upgradeBoards(cos, oldStyles, equippedUp) {
  const boards = oldStyles.map((id) => STYLE_UPGRADE[id]?.board).filter(Boolean);
  const owned = { ...cos.owned, board: [...new Set([...cos.owned.board, ...boards])] };
  const equipped = { ...cos.equipped };
  if (equippedUp && equipped.board === 'plain' && owned.board.includes(equippedUp.board))
    equipped.board = equippedUp.board;
  return { owned, equipped };
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
 * Read the save: v8, then its backup, then v7, v6, v5, v4, v3, v2 (each or its backup) and v1, migrated to v8.
 * Old keys are removed only after v8 is written. Otherwise defaults. Never throws, even if storage is unavailable.
 * @param {{getItem: Function, setItem: Function, removeItem: Function}|null} storage
 * @returns {{data: object, source: 'v8'|'backup'|'v7'|'v6'|'v5'|'v4'|'v3'|'v2'|'v1'|'new'}}
 */
export function readSave(storage) {
  try {
    const main = readKey(storage, V8_KEY);
    if (main) return { data: sanitize(main), source: 'v8' };
    const backup = readKey(storage, BACKUP_KEY);
    if (backup) return { data: sanitize(backup), source: 'backup' };
    const old = [
      V7_KEY,
      V7_BACKUP_KEY,
      V6_KEY,
      V6_BACKUP_KEY,
      V5_KEY,
      V5_BACKUP_KEY,
      V4_KEY,
      V4_BACKUP_KEY,
      V3_KEY,
      V3_BACKUP_KEY,
      V2_KEY,
      V2_BACKUP_KEY,
      V1_KEY,
    ];
    const v7 = readKey(storage, V7_KEY) || readKey(storage, V7_BACKUP_KEY);
    if (v7) return { data: upgrade(storage, migrateV7(v7), old), source: 'v7' };
    const v6 = readKey(storage, V6_KEY) || readKey(storage, V6_BACKUP_KEY);
    if (v6) return { data: upgrade(storage, migrateV6(v6), old), source: 'v6' };
    const v5 = readKey(storage, V5_KEY) || readKey(storage, V5_BACKUP_KEY);
    if (v5) return { data: upgrade(storage, migrateV5(v5), old), source: 'v5' };
    const v4 = readKey(storage, V4_KEY) || readKey(storage, V4_BACKUP_KEY);
    if (v4) return { data: upgrade(storage, migrateV4(v4), old), source: 'v4' };
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
    storage.setItem(V8_KEY, text);
    storage.setItem(BACKUP_KEY, text);
    return storage.getItem(V8_KEY) === text;
  } catch {
    return false;
  }
}
