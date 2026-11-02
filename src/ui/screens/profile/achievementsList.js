/**
 * Achievements on the Profile tab: a single-column list, one row per achievement group (its current step).
 * Ready rows sort to the top with a Claim button, then rows in progress, then completed rows (greyed, with a
 * check). Claiming plays the burst on the row's badge and flies the diamonds to the counter.
 * Rules: src/game/achievementList.js.
 */
import { achievementRows } from '../../../game/achievementList.js';
import { achievementContext, claim } from '../../../game/rewards.js';
import { state } from '../../../game/state.js';
import { saveProgress } from '../../../storage/save.js';
import { clayBadgeSVG } from '../../components/clayBadge.js';
import { flyCurrency } from '../../components/currencyBar.js';
import { icon } from '../../components/icons.js';
import { $ } from '../../dom.js';

const fmt = (n) => n.toLocaleString('en-US');

/** The section, filled by renderAchievements. */
export const achievementsSkeleton = () =>
  `<h3 class="section-title">Achievements</h3><ul class="ach-list" id="ach-list"></ul>`;

/** One row. */
function rowHTML(r) {
  const pct = r.goal ? Math.min(1, r.value / r.goal) : 1;
  // grey until the group's first step is claimed
  const badge = { group: r.group, state: r.state === 'progress' && r.step === 1 ? 'locked' : 'earned' };
  const side =
    r.state === 'ready'
      ? `<button class="btn primary ach-claim" data-claim="${r.id}">Claim</button>`
      : r.state === 'done'
        ? `<span class="ach-check" aria-label="Completed">${icon('check')}</span>`
        : '';
  return `<li class="ach-row ach-${r.state}" data-id="${r.id}">
    <span class="ach-badge">${clayBadgeSVG(badge, 'mini')}<span class="burst" aria-hidden="true"></span></span>
    <div class="ach-main">
      <div class="ach-title"><b>${r.title}</b>${r.steps > 1 ? `<small class="ach-step">Step ${r.step}/${r.steps}</small>` : ''}</div>
      <p>${r.desc}</p>
      <div class="ach-progress"><div class="xp-bar"><i style="transform:scaleX(${pct})"></i></div><small>${fmt(r.value)}/${fmt(r.goal)}</small></div>
    </div>
    <div class="ach-side">
      <span class="ach-reward"><svg class="cur-icon"><use href="#i-gem" /></svg>${r.reward}</span>
      ${side}
    </div>
  </li>`;
}

/** Fill the list. */
export function renderAchievements() {
  $('ach-list').innerHTML = achievementRows(achievementContext(), state.claimed).map(rowHTML).join('');
}

/**
 * Wire the list once.
 * @param {() => void} changed called after a claim (stats, tab dots, nav dot, Awards tab)
 */
export function bindAchievements(changed) {
  $('ach-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-claim]');
    if (!btn) return;
    const before = state.diamonds;
    const res = claim(btn.dataset.claim);
    if (!res.ok) return renderAchievements();
    saveProgress();
    btn.disabled = true;
    const row = btn.closest('.ach-row');
    row.querySelector('.burst').innerHTML = '<i></i>'.repeat(10);
    row.classList.add('claiming');
    flyCurrency(btn, 'diamonds', before, res.diamonds);
    // let the burst play, then re-sort (the next step or the completed row takes its place)
    setTimeout(() => {
      renderAchievements();
      changed();
    }, 800);
  });
}
