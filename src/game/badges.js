/**
 * Award badges: one badge per achievement group, built on the achievement rules (achievements.js). Pure.
 *
 * Tiers follow the step: Bronze, Silver, Gold, Diamond; single-step achievements are Gold.
 * A badge is locked (nothing earned yet), ready (a step can be claimed) or earned (its latest claimed step
 * shows, with progress toward the next one if there is one).
 */
import { ACHIEVEMENT_DEFS } from '../config.js';
import { ACHIEVEMENTS, achievementStatus } from './achievements.js';

export const TIERS = ['bronze', 'silver', 'gold', 'diamond'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

/**
 * Tier of an achievement step.
 * @param {{step: number, steps: number}} def
 * @returns {'bronze'|'silver'|'gold'|'diamond'}
 */
export const badgeTier = (def) => (def.steps === 1 ? 'gold' : TIERS[Math.min(def.step, TIERS.length) - 1]);

/** Roman numeral of a step ("" for single-step achievements). */
export const stepLabel = (def) => (def.steps === 1 ? '' : ROMAN[def.step - 1] || String(def.step));

/**
 * @typedef {object} Badge
 * @property {string} group
 * @property {string} title group title (no step numeral)
 * @property {string} icon
 * @property {'locked'|'ready'|'earned'} state
 * @property {string} tier tier shown: the claimable step when ready, the latest earned step when earned,
 *   the next step when locked
 * @property {string} label roman numeral of that step ("" for single-step)
 * @property {object} next the step to work on or claim (null once every step is claimed)
 * @property {number} value progress toward `next`
 * @property {number} goal
 * @property {number} earned steps claimed
 * @property {number} steps
 */

/**
 * Every group's badge, in display order.
 * @param {import('./achievements.js').AchievementContext} ctx
 * @param {Set<string>} claimed
 * @returns {Badge[]}
 */
export function badges(ctx, claimed) {
  const status = achievementStatus(ctx, claimed);
  return ACHIEVEMENT_DEFS.map((g) => {
    const steps = status.filter((s) => s.def.group === g.id);
    const got = steps.filter((s) => s.claimed);
    const next = steps.find((s) => !s.claimed) || null;
    const ready = next?.claimable;
    const state = ready ? 'ready' : got.length ? 'earned' : 'locked';
    const shown = ready || !got.length ? next.def : got[got.length - 1].def;
    return {
      group: g.id,
      title: g.title,
      icon: g.icon,
      state,
      tier: badgeTier(shown),
      label: stepLabel(shown),
      next: next ? next.def : null,
      value: next ? next.value : steps[steps.length - 1].value,
      goal: next ? next.def.goal : steps[steps.length - 1].def.goal,
      earned: got.length,
      steps: steps.length,
    };
  });
}

/**
 * The newest earned badges (latest claims first), one per group.
 * @param {Set<string>|string[]} claimed claimed achievement ids, oldest first (save order)
 * @param {number} [count]
 * @returns {{group: string, def: object}[]}
 */
export function newestBadges(claimed, count = 3) {
  const byId = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
  const out = [];
  const seen = new Set();
  for (const id of [...claimed].reverse()) {
    const def = byId.get(id); // claims of removed achievements are skipped
    if (!def || seen.has(def.group)) continue;
    seen.add(def.group);
    out.push({ group: def.group, def });
    if (out.length === count) break;
  }
  return out;
}
