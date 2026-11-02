/**
 * Award badges on the Awards tab: one per achievement group, for showing off (claiming happens in the
 * Achievements list). Pure.
 *
 * A badge is earned once at least one of its steps is claimed, and shows the goal of its latest claimed
 * step (10, 25, 100, ...). Until then it is locked. A badge is new while its latest claimed step has not been
 * seen on the Awards tab.
 */
import { ACHIEVEMENT_DEFS } from '../config.js';
import { achievementStatus } from './achievements.js';
import { badgeTier } from './badges.js';

/**
 * @typedef {{step: number, goal: number, reward: number, desc: string, claimed: boolean, done: boolean}} AwardStep
 * @typedef {{group: string, title: string, desc: string, icon: string, state: 'locked'|'earned', isNew: boolean,
 *   tier: string, tierGoal: number, earned: number, value: number, goal: number, latestId: string|null,
 *   steps: AwardStep[]}} Award
 */

/**
 * Every group's award, in config order.
 * @param {import('./achievements.js').AchievementContext} ctx
 * @param {Set<string>} claimed
 * @param {Set<string>} seen claimed steps already seen on the Awards tab
 * @returns {Award[]}
 */
export function awardBadges(ctx, claimed, seen) {
  const status = achievementStatus(ctx, claimed);
  return ACHIEVEMENT_DEFS.map((g) => {
    const steps = status.filter((s) => s.def.group === g.id);
    const got = steps.filter((s) => s.claimed);
    const latest = got.length ? got[got.length - 1].def : null;
    const next = steps.find((s) => !s.claimed);
    const shown = next || steps[steps.length - 1];
    return {
      group: g.id,
      title: g.title,
      desc: g.desc.replace('{goal}', String(shown.def.goal.toLocaleString('en-US'))),
      icon: g.icon,
      state: latest ? 'earned' : 'locked',
      isNew: !!latest && !seen.has(latest.id),
      tier: latest ? badgeTier(latest) : badgeTier(steps[0].def),
      tierGoal: latest ? latest.goal : 0,
      earned: got.length,
      value: shown.value,
      goal: shown.def.goal,
      latestId: latest ? latest.id : null,
      steps: steps.map((s) => ({
        step: s.def.step,
        goal: s.def.goal,
        reward: s.def.reward,
        desc: s.def.desc,
        claimed: s.claimed,
        done: s.done,
      })),
    };
  });
}

/**
 * Ids to mark as seen after the Awards tab was shown (the latest claimed step of every earned badge).
 * @param {Award[]} awards
 * @returns {string[]}
 */
export const latestIds = (awards) => awards.filter((a) => a.latestId).map((a) => a.latestId);

/**
 * Number of badges with a red dot.
 * @param {Award[]} awards
 * @returns {number}
 */
export const newCount = (awards) => awards.filter((a) => a.isNew).length;
