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
  if (d.daily && typeof d.daily === 'object') {
    for (const k in d.daily) if (/^\d{8}$/.test(k)) p.daily[k] = true;
  }
  if (isInt(d.hints, 0)) state.hints = Math.min(d.hints, 999);
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
  const daily = {};
  Object.keys(p.daily)
    .sort()
    .slice(-90)
    .forEach((k) => {
      daily[k] = true;
    });
  return {
    current: p.current,
    unlocked: p.unlocked,
    completed: Array.from(p.completed),
    daily,
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
