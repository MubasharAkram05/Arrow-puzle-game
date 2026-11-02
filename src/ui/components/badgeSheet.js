/**
 * Award details as a bottom sheet (Awards tab): the big badge, name, description and every step with its
 * progress. For showing off only: steps are claimed in the Achievements list on the Profile tab.
 */
import { awardBadges } from '../../game/awards.js';
import { achievementContext } from '../../game/rewards.js';
import { state } from '../../game/state.js';
import { $ } from '../dom.js';
import { closeModals, openModal } from '../modals/modal.js';
import { clayBadgeSVG } from './clayBadge.js';
import { icon } from './icons.js';

const fmt = (n) => n.toLocaleString('en-US');

/** One step line: done (check), current (progress bar) or later (goal only). */
function stepHTML(s, a, current) {
  const state = s.claimed ? 'done' : current ? 'current' : 'later';
  const pct = Math.min(1, a.value / s.goal);
  const mark = s.claimed
    ? icon('check', 'bs-check')
    : current
      ? `<div class="xp-bar"><i style="transform:scaleX(${pct})"></i></div><small>${fmt(a.value)} / ${fmt(s.goal)}</small>`
      : `<small>${fmt(s.goal)}</small>`;
  return `<li class="bs-s bs-s-${state}"><span class="bs-s-name">${a.steps.length > 1 ? `Step ${s.step}` : 'Goal'}<em>${fmt(s.goal)}</em></span>
    <span class="bs-s-mark">${mark}</span>
    <span class="bs-s-rew"><svg class="cur-icon"><use href="#i-gem" /></svg>${s.reward}</span></li>`;
}

/**
 * Open the sheet for a badge group.
 * @param {string} group
 */
export function openBadgeSheet(group) {
  const a = awardBadges(achievementContext(), state.claimed, state.seenBadges).find((x) => x.group === group);
  if (!a) return;
  const current = a.steps.find((s) => !s.claimed);
  const ready = current && current.done;
  $('badge-sheet-body').innerHTML = `
    <div class="bs-art">${clayBadgeSVG(a, 'huge')}</div>
    <h3>${a.title}</h3>
    <p class="muted">${a.desc}</p>
    <ol class="bs-steps">${a.steps.map((s) => stepHTML(s, a, s === current)).join('')}</ol>
    <p class="bs-note">${
      !current
        ? `${icon('check')}Every step earned`
        : ready
          ? 'Ready! Claim it in the Achievements list on your Profile tab.'
          : `${a.earned} of ${a.steps.length} earned`
    }</p>`;
  openModal('modal-badge');
}

/** Wire the sheet once (a tap on the dimmed backdrop closes it). */
export function bindBadgeSheet() {
  $('modal-badge').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModals();
  });
}
