/**
 * Achievements tab of the Tasks screen (on the Profile tab before 3.23.0): a single-column list, one row per achievement group (its current step).
 * Ready rows sort to the top, then rows in progress, then completed rows. Every row has the same size side
 * button (3.21.0): Claim (ready: blue, glowing, red dot), a grey Claim (not ready: aria-disabled, a tap
 * shakes it and says what is left) or a green Claimed pill. Claiming plays the burst on the row's badge and
 * flies the diamonds to the counter.
 * Rules: src/game/achievementList.js.
 */
import { achievementRows, notReadyText } from '../../../game/achievementList.js';
import { achievementContext, claim } from '../../../game/rewards.js';
import { state } from '../../../game/state.js';
import { saveProgress } from '../../../storage/save.js';
import { clayBadgeSVG } from '../../components/clayBadge.js';
import { flyCurrency } from '../../components/currencyBar.js';
import { toast } from '../../components/toast.js';
import { $ } from '../../dom.js';
import { claimButtonHTML } from '../../components/claimButton.js';

const fmt = (n) => n.toLocaleString('en-US');

/** Rows as last rendered, by id (the not-ready toast reads their progress). */
let shown = new Map();

/** The Achievements tab of the Tasks screen (moved from Profile in 3.23.0), filled by renderAchievements. */
export const achievementsSkeleton = () =>
  `<p class="tasks-intro">Permanent goals: they never reset.</p><ul class="ach-list" id="ach-list"></ul>`;

/** One row. */
function rowHTML(r) {
  const pct = r.goal ? Math.min(1, r.value / r.goal) : 1;
  // grey until the group's first step is claimed
  const badge = { group: r.group, state: r.state === 'progress' && r.step === 1 ? 'locked' : 'earned' };
  const label = `${fmt(r.value)}/${fmt(r.goal)}`;
  return `<li class="ach-row ach-${r.state}" data-id="${r.id}">
    <span class="ach-badge">${clayBadgeSVG(badge, 'mini')}<span class="burst" aria-hidden="true"></span></span>
    <div class="ach-main">
      <div class="ach-title"><b>${r.title}</b>${r.steps > 1 ? `<small class="ach-step">Step ${r.step}/${r.steps}</small>` : ''}</div>
      <p>${r.desc}</p>
      <div class="ach-bar" style="--p:${pct}" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="${r.goal}" aria-valuenow="${r.value}">
        <i></i><span>${label}</span><span class="on" aria-hidden="true">${label}</span>
      </div>
    </div>
    <div class="ach-side">
      <span class="ach-reward"><svg class="cur-icon"><use href="#i-gem" /></svg>${r.reward}</span>
      ${claimButtonHTML(r)}
    </div>
  </li>`;
}

/** Fill the list. */
export function renderAchievements() {
  const rows = achievementRows(achievementContext(), state.claimed);
  shown = new Map(rows.map((r) => [r.id, r]));
  $('ach-list').innerHTML = rows.map(rowHTML).join('');
}

/**
 * Wire the list once.
 * @param {() => void} changed called after a claim (stats, tab dots, nav dot, Awards tab)
 */
export function bindAchievements(changed) {
  $('ach-list').addEventListener('click', (e) => {
    const locked = e.target.closest('[data-locked]');
    if (locked) {
      const row = shown.get(locked.dataset.locked);
      locked.classList.remove('shake');
      void locked.offsetWidth; // restart the shake on every tap
      locked.classList.add('shake');
      if (row) toast(notReadyText(row));
      return;
    }
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
