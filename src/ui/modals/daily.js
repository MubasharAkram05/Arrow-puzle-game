/**
 * Daily Reward popup (Home): seven reward cards. Past days of the current cycle show a check, today's card glows
 * and claims, later days are dimmed. Opens by itself once per day; closing it keeps a "Daily Reward" button with a
 * dot on Home until today's reward is claimed. Rules live in src/game/daily.js.
 */
import { DAILY } from '../../config.js';
import { dailyStatus } from '../../game/daily.js';
import { claimDailyReward } from '../../game/rewards.js';
import { state } from '../../game/state.js';
import { saveProgress } from '../../storage/save.js';
import { flyCurrency, renderCurrency } from '../components/currencyBar.js';
import { icon } from '../components/icons.js';
import { toast } from '../components/toast.js';
import { $ } from '../dom.js';
import { closeModals, openModal } from './modal.js';

let autoShownDay = null; // the popup opens by itself once per day
let onChange = () => {};

/** Reward amounts of a card, e.g. "2 💎 + 1 hint". */
function rewardHTML(r) {
  const parts = [];
  if (r.coins) parts.push(`<span><svg class="cur-icon"><use href="#i-coin" /></svg>${r.coins}</span>`);
  if (r.diamonds) parts.push(`<span><svg class="cur-icon"><use href="#i-gem" /></svg>${r.diamonds}</span>`);
  if (r.hints) parts.push(`<span>${icon('bulb')}${r.hints}</span>`);
  return parts.join('');
}

function render() {
  const s = dailyStatus(state.daily, Date.now());
  // days of the current 7-day cycle before today's card are done
  const doneUpTo = s.state === 'claimed' ? s.day : s.day - 1;
  $('daily-row').innerHTML = DAILY.rewards
    .map((r, i) => {
      const d = i + 1;
      const today = d === s.day && s.state === 'available';
      const cls = d <= doneUpTo ? 'past' : today ? 'today' : 'future';
      const inner = `<b>Day ${d}</b><span class="dr-amt">${rewardHTML(r)}</span>${
        d <= doneUpTo ? icon('check', 'dr-check') : today ? '<span class="dr-claim">Claim</span>' : ''
      }`;
      return `<li class="dr ${cls}${d === DAILY.rewards.length ? ' big' : ''}">${
        today
          ? `<button class="dr-btn" id="btn-daily-claim" aria-label="Claim day ${d} reward">${inner}</button>`
          : inner
      }</li>`;
    })
    .join('');
  const streak = s.state === 'available' ? s.streak - 1 : s.streak;
  $('daily-sub').textContent = `${streak} day streak · best ${state.daily.best}`;
  $('daily-note').textContent =
    s.state === 'claimed'
      ? 'Come back tomorrow for the next reward.'
      : s.state === 'clock'
        ? "Your device's date looks off, so there is no reward right now. Check the date and time settings."
        : '';
}

/** Open the popup. */
export function openDaily() {
  render();
  openModal('modal-daily');
}

/** Is a reward waiting today? */
export const dailyAvailable = () => dailyStatus(state.daily, Date.now()).state === 'available';

/** On Home: open the popup by itself the first time today's reward is waiting. */
export function maybeShowDaily() {
  const s = dailyStatus(state.daily, Date.now());
  if (s.state !== 'available' || autoShownDay === s.today) return;
  autoShownDay = s.today;
  openDaily();
}

function onClaim(btn) {
  const res = claimDailyReward();
  if (!res.ok) return render();
  saveProgress();
  flyCurrency(btn, 'coins', res.before.coins, res.reward.coins || 0, 300);
  flyCurrency(btn, 'diamonds', res.before.diamonds, res.reward.diamonds || 0, 500);
  if (res.reward.hints) toast(`+${res.reward.hints} hint`);
  render();
  onChange();
  setTimeout(() => {
    closeModals();
    renderCurrency();
    onChange();
  }, 1400);
}

/**
 * Wire the popup once.
 * @param {() => void} changed called after a claim (Home refreshes its button and streak)
 */
export function bindDaily(changed) {
  onChange = changed;
  $('daily-row').addEventListener('click', (e) => {
    const b = e.target.closest('#btn-daily-claim');
    if (b) onClaim(b);
  });
}
