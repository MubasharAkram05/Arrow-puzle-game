/**
 * Save format v2, validation and migration from v1. Pure: storage is passed in, so tests can use a fake.
 */
import { REWARDS, SHOP_STYLES, SHOP_THEMES, START_HINTS, THEMES } from '../config.js';

export const V1_KEY = 'arrowEscape.save.v1';
export const V2_KEY = 'arrowEscape:v2';
export const BACKUP_KEY = 'arrowEscape:v2:backup';
const STAT_KEYS = [
  'arrowsCleared',
  'wins',
  'streak',
  'bestStreak',
  'perfectStreak',
  'bestPerfectStreak',
  'coinsSpent',
  'playSeconds',
];
const LIMIT = 1e9; // keeps absurd numbers out of the UI

/** Whole number >= 0; anything else (negative, NaN, string, Infinity) becomes the fallback. */
const count = (v, fallback = 0) => (Number.isFinite(v) && v >= 0 ? Math.min(Math.floor(v), LIMIT) : fallback);
/** Level number >= 1 or null. */
const level = (v) => (Number.isInteger(v) && v >= 1 && v <= LIMIT ? v : null);
/** Sorted, de-duplicated list of level numbers. */
const levels = (v) => (Array.isArray(v) ? [...new Set(v.map(level).filter(Boolean))].sort((a, b) => a - b) : []);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const bool = (v, fallback) => (typeof v === 'boolean' ? v : fallback);
const oneOf = (v, list, fallback) => (list.includes(v) ? v : fallback);

/**
 * A new player's save.
 * @returns {object}
 */
export function defaultSave() {
  return {
    version: 2,
    progress: {
      current: 1,
      unlocked: 1,
      completed: [],
      perfect: [],
      masks: [],
      chaptersRewarded: [],
      chapterSize: REWARDS.chapterSize,
    },
    wallet: { coins: 0, diamonds: 0, hints: START_HINTS },
    xp: 0,
    stats: Object.fromEntries(STAT_KEYS.map((k) => [k, 0])),
    achievements: { claimed: [], progress: {} },
    items: { owned: { styles: ['classic'], themes: ['blue'] }, style: 'classic', accent: 'blue' },
    profile: { avatar: 0, name: 'Player' },
    settings: { theme: 'auto', sound: true, vibration: true, grid: false },
  };
}

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

/** Owned ids filtered to real items, always including the free one. */
function ownedList(v, items) {
  const ids = items.map((i) => i.id);
  const list = Array.isArray(v) ? v.filter((id) => ids.includes(id)) : [];
  return [...new Set([ids[0], ...list])];
}

/**
 * Validate any parsed value into a complete v2 save. Unknown keys are dropped,
 * bad numbers become 0, and an equipped item must be owned.
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
  return {
    version: 2,
    progress: {
      current,
      unlocked,
      completed,
      perfect: levels(p.perfect).filter((n) => completed.includes(n)),
      masks: levels(p.masks).filter((n) => completed.includes(n)),
      // saves without chapterSize were made with 20-level chapters
      chaptersRewarded: convertChapters(levels(p.chaptersRewarded), count(p.chapterSize) || OLD_CHAPTER_SIZE),
      chapterSize: REWARDS.chapterSize,
    },
    wallet: { coins: count(w.coins), diamonds: count(w.diamonds), hints: count(w.hints, START_HINTS) },
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
    profile: { avatar: count(pr.avatar) % 12, name },
    settings: {
      theme: oneOf(se.theme, THEMES, def.settings.theme),
      sound: bool(se.sound, true),
      vibration: bool(se.vibration, true),
      grid: bool(se.grid, false),
    },
  };
}

/**
 * Convert a v1 save to v2. Keeps level progress, hints, settings and the equipped style
 * (every style was free in v1, so the one in use stays owned). Daily records are dropped.
 * @param {unknown} raw
 * @returns {object} sanitized v2 save
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

/** JSON.parse that returns undefined instead of throwing. */
function parse(text) {
  if (typeof text !== 'string') return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * Read the save: v2, then its backup, then v1 (migrated, after which v1 is removed), else defaults.
 * Never throws, even if storage itself is unavailable.
 * @param {{getItem: Function, setItem: Function, removeItem: Function}|null} storage
 * @returns {{data: object, source: 'v2'|'backup'|'v1'|'new'}}
 */
export function readSave(storage) {
  try {
    const main = parse(storage.getItem(V2_KEY));
    if (main && typeof main === 'object') return { data: sanitize(main), source: 'v2' };
    const backup = parse(storage.getItem(BACKUP_KEY));
    if (backup && typeof backup === 'object') return { data: sanitize(backup), source: 'backup' };
    const old = parse(storage.getItem(V1_KEY));
    if (old && typeof old === 'object') {
      const data = migrateV1(old);
      // drop v1 (and its daily data) only once v2 is safely written
      if (writeSave(storage, data)) storage.removeItem(V1_KEY);
      return { data, source: 'v1' };
    }
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
    storage.setItem(V2_KEY, text);
    storage.setItem(BACKUP_KEY, text);
    return storage.getItem(V2_KEY) === text;
  } catch {
    return false;
  }
}
