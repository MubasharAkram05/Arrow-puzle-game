/**
 * Achievements. Pure: progress is computed from a context of saved progress and stats;
 * only the set of claimed ids is stored. Goals and rewards live in ACHIEVEMENT_DEFS (config.js).
 *
 * A group can have several steps (e.g. Level Climber 25 / 50 / 100 / 250). Each step is its own achievement
 * with its own id (`level-climber-2`); single-step groups keep their plain id (`first-escape`), so saves made
 * before steps existed keep their claims. Only the next unclaimed step of a group is shown, and steps are
 * claimed in order, so nothing pays twice.
 */
import { ACHIEVEMENT_DEFS } from '../config.js';
import { tierLabel } from '../engine/index.js';
import { chapterLevels } from './economy.js';

/**
 * @typedef {{completed: Set<number>, perfect: Set<number>, masks: Set<number>, unlocked: number, stats: object, dailyBest: number}} AchievementContext
 * @typedef {{id: string, group: string, step: number, steps: number, title: string, desc: string, icon: string, goal: number, reward: number, progress: (c: AchievementContext) => number}} Achievement
 */

const HARD_TIERS = new Set(['Hard', 'Super Hard', 'Expert']);

/** Progress of each group, from the context. */
const PROGRESS = {
  'first-escape': (c) => (c.completed.has(1) ? 1 : 0),
  perfectionist: (c) => c.perfect.size,
  'chapter-master': (c) => chapterLevels(1).filter((l) => c.completed.has(l)).length,
  'arrow-hunter': (c) => c.stats.arrowsCleared,
  'no-mistakes': (c) => c.stats.bestPerfectStreak,
  'shape-solver': (c) => c.masks.size,
  'big-spender': (c) => c.stats.coinsSpent,
  'level-climber': (c) => c.unlocked,
  'brain-power': (c) => c.stats.cleanLevels,
  comeback: (c) => c.stats.comebacks,
  'daily-player': (c) => c.dailyBest,
  // counted from finished levels, so old saves get credit for Hard levels they already beat
  'hard-worker': (c) => {
    let n = 0;
    for (const l of c.completed) if (HARD_TIERS.has(tierLabel(l))) n++;
    return n;
  },
};

/** @type {ReadonlyArray<Achievement>} every step of every group, in display order */
export const ACHIEVEMENTS = Object.freeze(
  ACHIEVEMENT_DEFS.flatMap((g) =>
    g.steps.map((s, i) => ({
      id: g.steps.length === 1 ? g.id : `${g.id}-${i + 1}`,
      group: g.id,
      step: i + 1,
      steps: g.steps.length,
      title: g.steps.length === 1 ? g.title : `${g.title} ${['I', 'II', 'III', 'IV', 'V'][i] || i + 1}`,
      desc: g.desc.replace('{goal}', s.goal.toLocaleString('en-US')),
      icon: g.icon,
      goal: s.goal,
      reward: s.reward,
      progress: PROGRESS[g.id],
    })),
  ),
);

/**
 * Status of every achievement step.
 * @param {AchievementContext} ctx
 * @param {Set<string>} claimed
 * @returns {{def: Achievement, value: number, done: boolean, claimed: boolean, claimable: boolean}[]}
 */
export function achievementStatus(ctx, claimed) {
  return ACHIEVEMENTS.map((def) => {
    const value = Math.min(def.goal, Math.max(0, def.progress(ctx) || 0));
    const done = value >= def.goal;
    const isClaimed = claimed.has(def.id);
    const earlierOpen = ACHIEVEMENTS.some((d) => d.group === def.group && d.step < def.step && !claimed.has(d.id));
    return { def, value, done, claimed: isClaimed, claimable: done && !isClaimed && !earlierOpen };
  });
}

/**
 * What the profile shows: per group, the first unclaimed step (or the last step once all are claimed).
 * @param {AchievementContext} ctx
 * @param {Set<string>} claimed
 * @returns {ReturnType<typeof achievementStatus>}
 */
export function visibleAchievements(ctx, claimed) {
  const all = achievementStatus(ctx, claimed);
  const out = [];
  for (const g of ACHIEVEMENT_DEFS) {
    const steps = all.filter((a) => a.def.group === g.id);
    out.push(steps.find((a) => !a.claimed) || steps[steps.length - 1]);
  }
  return out;
}

/**
 * Number of finished achievements waiting to be claimed (the next step of each group).
 * @param {AchievementContext} ctx
 * @param {Set<string>} claimed
 * @returns {number}
 */
export function claimableCount(ctx, claimed) {
  return achievementStatus(ctx, claimed).filter((a) => a.claimable).length;
}

/**
 * Claim an achievement step.
 * @param {string} id
 * @param {AchievementContext} ctx
 * @param {Set<string>} claimed
 * @returns {{ok: boolean, reason?: 'unknown'|'not-done'|'claimed'|'order', diamonds: number, claimed: Set<string>}}
 */
export function claimAchievement(id, ctx, claimed) {
  const s = achievementStatus(ctx, claimed).find((a) => a.def.id === id);
  if (!s) return { ok: false, reason: 'unknown', diamonds: 0, claimed };
  if (s.claimed) return { ok: false, reason: 'claimed', diamonds: 0, claimed };
  if (!s.done) return { ok: false, reason: 'not-done', diamonds: 0, claimed };
  if (!s.claimable) return { ok: false, reason: 'order', diamonds: 0, claimed };
  return { ok: true, diamonds: s.def.reward, claimed: new Set([...claimed, id]) };
}
