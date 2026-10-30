/**
 * Player statistics and XP. Pure functions over plain objects (no DOM, no storage).
 */
import { XP } from '../config.js';

/**
 * Fresh stats record.
 * @returns {{arrowsCleared: number, wins: number, streak: number, bestStreak: number, perfectStreak: number, bestPerfectStreak: number, coinsSpent: number, playSeconds: number}}
 */
export function newStats() {
  return {
    arrowsCleared: 0,
    wins: 0,
    streak: 0, // wins in a row without running out of hearts
    bestStreak: 0,
    perfectStreak: 0, // wins in a row without losing a heart
    bestPerfectStreak: 0,
    coinsSpent: 0,
    playSeconds: 0,
    boostersUsed: 0,
    hintsUsed: 0,
    cleanLevels: 0, // levels finished the first time with no hint or booster (Brain Power)
    comebacks: 0, // wins with exactly 1 heart left (Comeback)
  };
}

/**
 * Count a level win.
 * @param {ReturnType<typeof newStats>} s
 * @param {boolean} perfect no heart lost
 * @param {{firstClear?: boolean, assisted?: boolean, heartsLeft?: number}} [win]
 * @returns {ReturnType<typeof newStats>}
 */
export function recordWin(s, perfect, win = {}) {
  const streak = s.streak + 1;
  const perfectStreak = perfect ? s.perfectStreak + 1 : 0;
  return {
    ...s,
    cleanLevels: (s.cleanLevels || 0) + (win.firstClear && !win.assisted ? 1 : 0),
    comebacks: (s.comebacks || 0) + (win.heartsLeft === 1 ? 1 : 0),
    wins: s.wins + 1,
    streak,
    bestStreak: Math.max(s.bestStreak, streak),
    perfectStreak,
    bestPerfectStreak: Math.max(s.bestPerfectStreak, perfectStreak),
  };
}

/**
 * Running out of hearts ends both streaks.
 * @param {ReturnType<typeof newStats>} s
 * @returns {ReturnType<typeof newStats>}
 */
export function recordLoss(s) {
  return { ...s, streak: 0, perfectStreak: 0 };
}

/**
 * XP for one level win.
 * @param {number} heartsLeft
 * @returns {number}
 */
export function xpForWin(heartsLeft) {
  return XP.perLevel + XP.perHeart * Math.max(0, heartsLeft);
}

/**
 * XP needed to go from player level `level` to the next one.
 * @param {number} level
 * @returns {number}
 */
export function xpToNext(level) {
  return 100 + (level - 1) * 50;
}

/**
 * Player level and progress inside it for a total XP amount.
 * @param {number} xp
 * @returns {{level: number, into: number, need: number}}
 */
export function playerLevel(xp) {
  let level = 1;
  let rest = Math.max(0, xp);
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level++;
  }
  return { level, into: rest, need: xpToNext(level) };
}

/**
 * Seconds as a short label, e.g. "1h 05m" or "4m 12s".
 * @param {number} sec
 * @returns {string}
 */
export function formatPlayTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(s % 60).padStart(2, '0')}s`;
}

/** Player names: 3-16 characters, letters (any language), digits, spaces, _ and -. */
export const NAME_MIN = 3;
export const NAME_MAX = 16;

/**
 * Validate a player name.
 * @param {string} raw
 * @returns {string} error message, or '' when the name is fine
 */
export function validateName(raw) {
  const name = String(raw || '').trim();
  if (name.length < NAME_MIN) return `At least ${NAME_MIN} characters`;
  if (name.length > NAME_MAX) return `At most ${NAME_MAX} characters`;
  if (!/^[\p{L}\p{N} _-]+$/u.test(name)) return 'Use letters, numbers, spaces, _ or -';
  return '';
}
