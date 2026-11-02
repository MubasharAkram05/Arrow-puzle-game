/**
 * Awards tab: the award badges (3 per row on a phone, for showing off; claiming happens in the Achievements
 * list) and the Monthly Trophies of the current year, with earlier years folded away when there is data.
 * Rules: src/game/awards.js and src/game/trophies.js.
 */
import { awardBadges, latestIds, newCount } from '../../../game/awards.js';
import { achievementContext } from '../../../game/rewards.js';
import { state } from '../../../game/state.js';
import { dayNumber } from '../../../game/daily.js';
import { dayDate, pastYears, yearTrophies } from '../../../game/trophies.js';
import { saveProgress } from '../../../storage/save.js';
import { bindBadgeSheet, openBadgeSheet } from '../../components/badgeSheet.js';
import { clayBadgeSVG } from '../../components/clayBadge.js';
import { trophySVG } from '../../components/trophyArt.js';
import { $ } from '../../dom.js';

const fmt = (n) => n.toLocaleString('en-US');

/** Sections, filled by renderAwardsPage. */
export const awardsPageSkeleton = () => `
  <h3 class="section-title">Awards</h3>
  <div class="aw-grid" id="aw-grid" role="list"></div>
  <h3 class="section-title">Monthly Trophies</h3>
  <div id="trophy-years"></div>`;

/** Current awards (with the "new" flags as they are before this view marks them seen). */
const currentAwards = () => awardBadges(achievementContext(), state.claimed, state.seenBadges);

/** Number of badges with a red dot (for the tab dot). */
export const newAwardsCount = () => newCount(currentAwards());

/** One badge tile. */
function tileHTML(a) {
  const progress =
    a.state === 'earned' && a.earned === a.steps.length
      ? `${fmt(a.goal)} of ${fmt(a.goal)}`
      : `${fmt(a.value)} of ${fmt(a.goal)}`;
  const label = `${a.title}, ${a.state === 'earned' ? 'earned' : 'locked'}${a.isNew ? ', new' : ''}`;
  return `<button class="aw-tile aw-${a.state}" role="listitem" data-group="${a.group}" aria-label="${label}">
    <span class="aw-art">${clayBadgeSVG(a, 'big')}${a.isNew ? '<i class="aw-dot" aria-hidden="true"></i>' : ''}</span>
    <b>${a.title}</b><small>${progress}</small>
  </button>`;
}

/** One year of trophies. */
function yearHTML(year, now) {
  return `<div class="tr-grid">${yearTrophies(state.dailyDays, year, now)
    .map(
      (
        t,
      ) => `<div class="tr-tile tr-tile-${t.state}${t.current ? ' current' : ''}" aria-label="${t.name} ${year}: ${t.claimed} of ${t.days} days">
        ${trophySVG(t, year)}<b>${t.name.slice(0, 3)}</b><small>${t.state === 'future' ? `0 of ${t.days}` : `${t.claimed} of ${t.days}`}</small>
      </div>`,
    )
    .join('')}</div>`;
}

/** Draw the tab (badges keep their dots for this view). */
export function renderAwardsPage() {
  $('aw-grid').innerHTML = currentAwards().map(tileHTML).join('');
  const now = Date.now();
  const year = dayDate(dayNumber(now)).year;
  const past = pastYears(state.dailyDays, now)
    .map((y) => `<details class="tr-year"><summary>${y}</summary>${yearHTML(y, now)}</details>`)
    .join('');
  $('trophy-years').innerHTML = `<h4 class="tr-year-title">${year}</h4>${yearHTML(year, now)}${past}`;
}

/**
 * The tab was viewed: its new badges count as seen from now on (their dots stay until the next render).
 * @returns {boolean} true when something changed
 */
export function markAwardsSeen() {
  const ids = latestIds(currentAwards()).filter((id) => !state.seenBadges.has(id));
  if (!ids.length) return false;
  state.seenBadges = new Set([...state.seenBadges, ...ids]);
  saveProgress();
  return true;
}

/** Wire the tab once. */
export function bindAwardsPage() {
  $('aw-grid').addEventListener('click', (e) => {
    const t = e.target.closest('[data-group]');
    if (t) openBadgeSheet(t.dataset.group);
  });
  bindBadgeSheet();
}
