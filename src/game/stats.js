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
  };
}

/**
 * Count a level win.
 * @param {ReturnType<typeof newStats>} s
 * @param {boolean} perfect no heart lost
 * @returns {ReturnType<typeof newStats>}
 */
export function recordWin(s, perfect) {
  const streak = s.streak + 1;
  const perfectStreak = perfect ? s.perfectStreak + 1 : 0;
  return {
    ...s,
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
