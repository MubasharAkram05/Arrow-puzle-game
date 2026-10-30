/**
 * Badge details as a bottom sheet: big badge, name, description, current step, progress, reward and a Claim
 * button when a step is ready. Claiming plays the unlock animation (scale, shine, confetti) and flies the
 * diamonds to the counter.
 */
import { badges } from '../../game/badges.js';
import { achievementContext, claim } from '../../game/rewards.js';
import { state } from '../../game/state.js';
import { saveProgress } from '../../storage/save.js';
import { $ } from '../dom.js';
import { closeModals, openModal } from '../modals/modal.js';
import { badgeSVG } from './badge.js';
import { flyCurrency } from './currencyBar.js';
import { icon } from './icons.js';

let group = null;
let onClaimed = () => {};

const findBadge = (g) => badges(achievementContext(), state.claimed).find((b) => b.group === g);

function render() {
  const b = findBadge(group);
  const step = b.next || null;
  const done = !step;
  const title = b.label ? `${b.title} ${b.label}` : b.title;
  const desc = done ? 'All steps earned.' : step.desc;
  const stepText = b.steps > 1 ? `Step ${done ? b.steps : step.step} of ${b.steps}` : '';
  const pct = b.goal ? Math.min(1, b.value / b.goal) : 1;
  $('badge-sheet-body').innerHTML = `
    <div class="bs-art" id="bs-art">${badgeSVG(b, 'big')}<span class="burst" aria-hidden="true"></span></div>
    <h3>${title}</h3>
    <p class="muted">${desc}</p>
    ${stepText ? `<small class="bs-step">${stepText}</small>` : ''}
    ${
      done
        ? `<p class="bs-done">${icon('check')}Earned</p>`
        : `<div class="bs-progress"><div class="xp-bar"><i style="transform:scaleX(${pct})"></i></div><small>${b.value.toLocaleString('en-US')} / ${b.goal.toLocaleString('en-US')}</small></div>
    <p class="bs-reward">Reward <b><svg class="cur-icon"><use href="#i-gem" /></svg>${step.reward}</b></p>
    ${b.state === 'ready' ? `<button class="btn primary big" id="bs-claim" data-claim="${step.id}">Claim</button>` : ''}`
    }`;
}

/**
 * Open the sheet for a badge group.
 * @param {string} g group id
 */
export function openBadgeSheet(g) {
  group = g;
  render();
  openModal('modal-badge');
}

function onClaim(btn) {
  const before = state.diamonds;
  const res = claim(btn.dataset.claim);
  if (!res.ok) return render();
  saveProgress();
  btn.disabled = true;
  const art = $('bs-art');
  art.querySelector('.bdg').outerHTML = badgeSVG(findBadge(group), 'big');
  art.querySelector('.burst').innerHTML = '<i></i>'.repeat(10);
  art.classList.add('unlocking');
  flyCurrency(btn, 'diamonds', before, res.diamonds);
  onClaimed();
  setTimeout(() => {
    art.classList.remove('unlocking');
    render();
  }, 1100);
}

/**
 * Wire the sheet once.
 * @param {() => void} claimed called after a claim (the profile refreshes its badges)
 */
export function bindBadgeSheet(claimed) {
  onClaimed = claimed;
  $('badge-sheet-body').addEventListener('click', (e) => {
    const b = e.target.closest('#bs-claim');
    if (b) onClaim(b);
  });
  $('modal-badge').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModals();
  });
}
