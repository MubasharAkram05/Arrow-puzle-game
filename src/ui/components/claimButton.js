/** The side button of an achievement row (3.21.0). Pure, so tests can check the three states. */
import { icon } from './icons.js';

/**
 * The side button for a row; all three states have the same size, so rows line up.
 * @param {import('../../../game/achievementList.js').AchievementRow} r
 * @returns {string}
 */
export function claimButtonHTML(r) {
  if (r.state === 'ready')
    return `<button type="button" class="ach-claim is-ready" data-claim="${r.id}">Claim<span class="claim-dot" aria-hidden="true"></span></button>`;
  if (r.state === 'done') return `<span class="ach-claim is-claimed">${icon('check')}Claimed</span>`;
  return `<button type="button" class="ach-claim is-locked" data-locked="${r.id}" aria-disabled="true">Claim</button>`;
}
