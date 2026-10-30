/**
 * Awards on the profile: the badge grid (one badge per achievement group) and a row with the three newest
 * earned badges under the name. Tapping a badge opens its sheet (badgeSheet.js).
 */
import { badgeTier, badges, newestBadges, stepLabel } from '../../../game/badges.js';
import { achievementContext } from '../../../game/rewards.js';
import { state } from '../../../game/state.js';
import { badgeSVG } from '../../components/badge.js';
import { bindBadgeSheet, openBadgeSheet } from '../../components/badgeSheet.js';
import { $ } from '../../dom.js';

/** Row of the newest earned badges (under the name). */
export const recentSkeleton = () =>
  `<div class="recent-awards" id="recent-awards"><div class="ra-list" id="ra-list"></div><button class="link-btn ra-all" id="ra-all">See all</button></div>`;

/** The Awards section. */
export const awardsSkeleton = () =>
  `<h3 class="section-title" id="awards-title">Awards</h3><div class="awards-grid" id="awards-grid" role="list"></div>`;

/** One grid tile. */
function tileHTML(b) {
  const sub =
    b.state === 'ready'
      ? 'Claim!'
      : b.next
        ? `${b.value.toLocaleString('en-US')}/${b.goal.toLocaleString('en-US')}`
        : 'Complete';
  return `<button class="award award-${b.state}" role="listitem" data-group="${b.group}" aria-label="${b.title}, ${b.state === 'ready' ? 'ready to claim' : b.state}">
    ${badgeSVG(b)}${b.state === 'ready' ? '<i class="award-dot" aria-hidden="true"></i>' : ''}
    <b>${b.title}</b><small>${sub}</small>
  </button>`;
}

/** Fill the grid and the newest-badges row. */
export function renderAwards() {
  const list = badges(achievementContext(), state.claimed);
  $('awards-grid').innerHTML = list.map(tileHTML).join('');
  const recent = newestBadges(state.claimed);
  const byGroup = new Map(list.map((b) => [b.group, b]));
  $('recent-awards').hidden = !recent.length;
  $('ra-list').innerHTML = recent
    .map(({ group, def }) => {
      // show each recent badge at the step it was earned
      const b = { ...byGroup.get(group), state: 'earned', tier: badgeTier(def), label: stepLabel(def) };
      return `<button class="ra-item" data-group="${group}" aria-label="${b.title}">${badgeSVG(b, 'small')}</button>`;
    })
    .join('');
}

/**
 * Wire the badges once.
 * @param {() => void} changed called after a claim (profile refreshes stats, nav dot, currency)
 */
export function bindAwards(changed) {
  const open = (e) => {
    const t = e.target.closest('[data-group]');
    if (t) openBadgeSheet(t.dataset.group);
  };
  $('awards-grid').addEventListener('click', open);
  $('ra-list').addEventListener('click', open);
  $('ra-all').addEventListener('click', () => $('awards-title').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  bindBadgeSheet(() => {
    renderAwards();
    changed();
  });
}
