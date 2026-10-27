/**
 * Bridges the game state and the v2 save format (see schema.js for validation and migration).
 */
import { REWARDS, START_HINTS } from '../config.js';
import { achievementStatus } from '../game/achievements.js';
import { newProgress, state } from '../game/state.js';
import { newStats } from '../game/stats.js';
import { newInventory } from '../game/boosters.js';
import { defaultSave, readSave, sanitize, writeSave } from './schema.js';

/** localStorage, or null when the browser blocks it. */
function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Copy a validated v2 save into the game state.
 * @param {object} raw any parsed save (it is sanitized first)
 */
export function applySave(raw) {
  const d = sanitize(raw);
  const p = d.progress;
  state.progress = {
    current: p.current,
    unlocked: p.unlocked,
    completed: new Set(p.completed),
    perfect: new Set(p.perfect),
    masks: new Set(p.masks),
    chaptersRewarded: new Set(p.chaptersRewarded),
  };
  state.coins = d.wallet.coins;
  state.diamonds = d.wallet.diamonds;
  state.hints = d.wallet.hints;
  state.boosters = { ...d.boosters };
  state.xp = d.xp;
  state.stats = { ...newStats(), ...d.stats };
  state.claimed = new Set(d.achievements.claimed);
  state.owned = d.items.owned;
  state.style = d.items.style;
  state.accent = d.items.accent;
  state.avatar = d.profile.avatar;
  state.name = d.profile.name;
  Object.assign(state, d.settings);
}

/**
 * v2 save built from the game state.
 * @returns {object}
 */
export function snapshot() {
  const p = state.progress;
  const progress = {};
  for (const a of achievementStatus(
    { completed: p.completed, perfect: p.perfect, masks: p.masks, stats: state.stats },
    state.claimed,
  )) {
    progress[a.def.id] = a.value;
  }
  return {
    version: 2,
    progress: {
      current: p.current,
      unlocked: p.unlocked,
      completed: [...p.completed],
      perfect: [...p.perfect],
      masks: [...p.masks],
      chaptersRewarded: [...p.chaptersRewarded],
      chapterSize: REWARDS.chapterSize,
    },
    wallet: { coins: state.coins, diamonds: state.diamonds, hints: state.hints },
    boosters: { ...state.boosters },
    xp: state.xp,
    stats: { ...state.stats },
    achievements: { claimed: [...state.claimed], progress },
    items: { owned: state.owned, style: state.style, accent: state.accent },
    profile: { avatar: state.avatar, name: state.name },
    settings: { theme: state.theme, sound: state.sound, vibration: state.vibration, grid: state.grid },
  };
}

/**
 * Load the save (migrating v1 the first time). Works with defaults when storage is blocked or corrupt.
 * @returns {'v2'|'backup'|'v1'|'new'} where the data came from
 */
export function loadSave() {
  const s = storage();
  const { data, source } = s ? readSave(s) : { data: defaultSave(), source: 'new' };
  applySave(data);
  // store the validated, current-format save right away (e.g. after a chapter-size conversion)
  if (s && source !== 'new') writeSave(s, snapshot());
  return source;
}

/** Write progress and settings. Failures (private mode, full storage) are ignored. */
export function saveProgress() {
  const s = storage();
  if (s) writeSave(s, snapshot());
}

/** Clear progress, currency, items, XP, stats and achievements. Settings, avatar and name stay. */
export function resetProgress() {
  state.progress = newProgress();
  state.hints = START_HINTS;
  state.coins = 0;
  state.diamonds = 0;
  state.xp = 0;
  state.stats = newStats();
  state.boosters = newInventory();
  state.claimed = new Set();
  state.owned = { styles: ['classic'], themes: ['blue'] };
  state.style = 'classic';
  state.accent = 'blue';
  saveProgress();
}
