/**
 * Achievements. Pure: progress is computed from a context of saved progress and stats;
 * only the set of claimed ids is stored.
 */
import { chapterLevels } from './economy.js';

/**
 * @typedef {{completed: Set<number>, perfect: Set<number>, masks: Set<number>, stats: object}} AchievementContext
 * @typedef {{id: string, title: string, desc: string, icon: string, goal: number, reward: number, progress: (c: AchievementContext) => number}} Achievement
 */

/** @type {ReadonlyArray<Achievement>} reward is in diamonds */
export const ACHIEVEMENTS = Object.freeze([
  {
    id: 'first-escape',
    title: 'First Escape',
    desc: 'Finish level 1',
    icon: 'play',
    goal: 1,
    reward: 1,
    progress: (c) => (c.completed.has(1) ? 1 : 0),
  },
  {
    id: 'perfectionist',
    title: 'Perfectionist',
    desc: 'Finish 10 levels without losing a heart',
    icon: 'crown-o',
    goal: 10,
    reward: 3,
    progress: (c) => c.perfect.size,
  },
  {
    id: 'chapter-master',
    title: 'Chapter Master',
    desc: 'Finish every level of chapter 1',
    icon: 'trophy',
    goal: 20,
    reward: 2,
    progress: (c) => chapterLevels(1).filter((l) => c.completed.has(l)).length,
  },
  {
    id: 'arrow-hunter',
    title: 'Arrow Hunter',
    desc: 'Clear 1000 arrows',
    icon: 'target',
    goal: 1000,
    reward: 5,
    progress: (c) => c.stats.arrowsCleared,
  },
  {
    id: 'no-mistakes',
    title: 'No Mistakes',
    desc: 'Finish 5 levels in a row without losing a heart',
    icon: 'fire',
    goal: 5,
    reward: 3,
    progress: (c) => c.stats.bestPerfectStreak,
  },
  {
    id: 'shape-solver',
    title: 'Shape Solver',
    desc: 'Finish 5 shape levels',
    icon: 'shape-heart',
    goal: 5,
    reward: 3,
    progress: (c) => c.masks.size,
  },
  {
    id: 'big-spender',
    title: 'Big Spender',
    desc: 'Spend 1000 coins',
    icon: 'shop',
    goal: 1000,
    reward: 2,
    progress: (c) => c.stats.coinsSpent,
  },
]);

/**
 * Status of every achievement.
 * @param {AchievementContext} ctx
 * @param {Set<string>} claimed
 * @returns {{def: Achievement, value: number, done: boolean, claimed: boolean, claimable: boolean}[]}
 */
export function achievementStatus(ctx, claimed) {
  return ACHIEVEMENTS.map((def) => {
    const value = Math.min(def.goal, Math.max(0, def.progress(ctx) || 0));
    const done = value >= def.goal;
    const isClaimed = claimed.has(def.id);
    return { def, value, done, claimed: isClaimed, claimable: done && !isClaimed };
  });
}

/**
 * Number of finished achievements waiting to be claimed.
 * @param {AchievementContext} ctx
 * @param {Set<string>} claimed
 * @returns {number}
 */
export function claimableCount(ctx, claimed) {
  return achievementStatus(ctx, claimed).filter((a) => a.claimable).length;
}

/**
 * Claim an achievement.
 * @param {string} id
 * @param {AchievementContext} ctx
 * @param {Set<string>} claimed
 * @returns {{ok: boolean, reason?: 'unknown'|'not-done'|'claimed', diamonds: number, claimed: Set<string>}}
 */
export function claimAchievement(id, ctx, claimed) {
  const def = ACHIEVEMENTS.find((a) => a.id === id);
  if (!def) return { ok: false, reason: 'unknown', diamonds: 0, claimed };
  if (claimed.has(id)) return { ok: false, reason: 'claimed', diamonds: 0, claimed };
  if ((def.progress(ctx) || 0) < def.goal) return { ok: false, reason: 'not-done', diamonds: 0, claimed };
  return { ok: true, diamonds: def.reward, claimed: new Set([...claimed, id]) };
}
