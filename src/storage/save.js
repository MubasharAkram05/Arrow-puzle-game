import { START_HINTS, STORE_KEY, STYLES, THEMES } from '../config.js';
import { newProgress, state } from '../game/state.js';

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
  if (STYLES.some((s) => s.id === d.style)) state.style = d.style;
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

/** Clear progress and hints, keep settings. */
export function resetProgress() {
  state.progress = newProgress();
  state.hints = START_HINTS;
  saveProgress();
}
