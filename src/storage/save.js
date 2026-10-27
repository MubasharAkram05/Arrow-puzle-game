import { SHOP_STYLES, START_HINTS, STORE_KEY, THEMES } from '../config.js';
import { newProgress, state } from '../game/state.js';
import { newStats } from '../game/stats.js';

const isInt = (v, min) => Number.isInteger(v) && v >= min;

/**
 * Apply a parsed save object to the state. Bad or missing fields keep their defaults.
 * @param {unknown} d
 */
export function applySave(d) {
  if (!d || typeof d !== 'object') return;
  const p = state.progress;
  p.unlocked = isInt(d.unlocked, 1) ? d.unlocked : 1;
  p.current = Math.min(isInt(d.current, 1) ? d.current : 1, p.unlocked);
  if (Array.isArray(d.completed)) p.completed = new Set(d.completed.filter((n) => isInt(n, 1)));
  if (isInt(d.hints, 0)) state.hints = Math.min(d.hints, 999);
  for (const key of ['coins', 'diamonds', 'xp']) if (isInt(d[key], 0)) state[key] = d[key];
  for (const key of ['perfect', 'masks', 'chaptersRewarded']) {
    if (Array.isArray(d[key])) p[key] = new Set(d[key].filter((n) => isInt(n, 1)));
  }
  if (d.stats && typeof d.stats === 'object') {
    for (const k in state.stats) if (isInt(d.stats[k], 0)) state.stats[k] = d.stats[k];
  }
  if (THEMES.includes(d.theme)) state.theme = d.theme;
  if (SHOP_STYLES.some((s) => s.id === d.style)) state.style = d.style;
  if (Array.isArray(d.claimed)) state.claimed = new Set(d.claimed.filter((x) => typeof x === 'string'));
  if (d.owned && Array.isArray(d.owned.styles) && Array.isArray(d.owned.themes)) state.owned = d.owned;
  if (typeof d.accent === 'string') state.accent = d.accent;
  if (isInt(d.avatar, 0)) state.avatar = d.avatar;
  if (typeof d.name === 'string') state.name = d.name;
  for (const key of ['sound', 'vibration', 'grid']) {
    if (typeof d[key] === 'boolean') state[key] = d[key];
  }
}

/** Read saved data. Works (with defaults) when storage is blocked or corrupt. */
export function loadSave() {
  let d;
  try {
    d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
  } catch {
    d = null;
  }
  applySave(d);
}

/**
 * Serializable snapshot of progress and settings.
 * @returns {object}
 */
export function snapshot() {
  const p = state.progress;
  return {
    current: p.current,
    unlocked: p.unlocked,
    completed: Array.from(p.completed),
    perfect: Array.from(p.perfect),
    masks: Array.from(p.masks),
    chaptersRewarded: Array.from(p.chaptersRewarded),
    coins: state.coins,
    diamonds: state.diamonds,
    xp: state.xp,
    stats: state.stats,
    claimed: Array.from(state.claimed),
    owned: state.owned,
    accent: state.accent,
    avatar: state.avatar,
    name: state.name,
    hints: state.hints,
    theme: state.theme,
    style: state.style,
    sound: state.sound,
    vibration: state.vibration,
    grid: state.grid,
  };
}

/** Write progress and settings. Failures (private mode, full storage) are ignored. */
export function saveProgress() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(snapshot()));
  } catch {
    // storage unavailable
  }
}

/** Clear progress, currency, items, XP, stats and achievements. Settings, avatar and name stay. */
export function resetProgress() {
  state.progress = newProgress();
  state.hints = START_HINTS;
  state.coins = 0;
  state.diamonds = 0;
  state.xp = 0;
  state.stats = newStats();
  state.claimed = new Set();
  state.owned = { styles: ['classic'], themes: ['blue'] };
  state.style = 'classic';
  state.accent = 'blue';
  saveProgress();
}
