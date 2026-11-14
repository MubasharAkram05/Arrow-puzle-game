/**
 * Daily Reward popup (Home), styled as a reward panel: a ribbon banner, Day 1-6 cards in a 3x2 grid and a tall
 * Day 7 gift card on the right. Claimed cards are dimmed with a green check, today's card glows and is claimed
 * with the big button under the panel, later cards carry a small lock. Opens by itself once per day; closing it
 * keeps a "Daily Reward" button with a dot on Home until today's reward is claimed.
 * Rules: src/game/daily.js; card states: src/game/dailyCards.js.
 */
import { dailyStatus, tutorialDone } from '../../game/daily.js';
import { dailyCards, mainReward } from '../../game/dailyCards.js';
import { claimDailyReward } from '../../game/rewards.js';
import { state } from '../../game/state.js';
import { saveProgress } from '../../storage/save.js';
import { GIFT, rewardArt } from '../components/dailyArt.js';
import { flyCurrency, renderCurrency } from '../components/currencyBar.js';
import { icon } from '../components/icons.js';
import { toast } from '../components/toast.js';
import { $ } from '../dom.js';
import { closeModals, openModal } from './modal.js';

let autoShownDay = null; // the popup opens by itself once per day
let onChange = () => {};

/** Amount line: "x200", or every part with a small icon when a card gives more than one thing. */
function amountHTML(r) {
  const parts = [];
  if (r.coins) parts.push(['coin', r.coins]);
  if (r.diamonds) parts.push(['gem', r.diamonds]);
  if (r.hints) parts.push(['bulb', r.hints]);
  if (parts.length === 1) return `x${parts[0][1]}`;
  return parts
    .map(([k, n]) =>
      k === 'bulb'
        ? `<span>${icon('bulb')}x${n}</span>`
        : `<span><svg class="cur-icon"><use href="#i-${k}" /></svg>x${n}</span>`,
    )
    .join('');
}

/** One card. */
function cardHTML(c, last) {
  const badge =
    c.state === 'claimed'
      ? `<span class="drc-badge ok" aria-label="Claimed">${icon('check')}</span>`
      : c.state === 'future'
        ? `<span class="drc-badge lock" aria-label="Locked">${icon('lock')}</span>`
        : '';
  const art = c.day === last ? GIFT : rewardArt(mainReward(c.reward).kind);
  return `<li class="drc drc-${c.state}${c.day === last ? ' drc-big' : ''}" data-day="${c.day}">
    <span class="drc-tab">Day ${c.day}</span>
    <span class="drc-art">${art}</span>
    <b class="drc-amt">${amountHTML(c.reward)}</b>${badge}
  </li>`;
}

function render() {
  const s = dailyStatus(state.daily, Date.now());
  const cards = dailyCards(s);
  $('daily-panel').innerHTML = cards.map((c) => cardHTML(c, cards.length)).join('');
  $('btn-daily-claim').hidden = s.state !== 'available';
  const streak = s.state === 'available' ? s.streak - 1 : s.streak;
  $('daily-streak').textContent = `${streak} day streak · best ${state.daily.best}`;
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
/** Today's reward is waiting and the tutorial is done (a new player gets it after level 3). */
export const dailyAvailable = () =>
  tutorialDone(state.progress) && dailyStatus(state.daily, Date.now()).state === 'available';

/** On Home: open the popup by itself the first time today's reward is waiting. */
export function maybeShowDaily() {
  if (!tutorialDone(state.progress)) return;
  const s = dailyStatus(state.daily, Date.now());
  if (s.state !== 'available' || autoShownDay === s.today) return;
  autoShownDay = s.today;
  openDaily();
}

/** Claim: today's card pops, the reward flies to its counter, then the card shows its check. */
function onClaim(btn) {
  const card = $('daily-panel').querySelector('.drc-today');
  const res = claimDailyReward();
  if (!res.ok) return render();
  saveProgress();
  btn.disabled = true;
  const from = card ? card.querySelector('.drc-art') : btn;
  if (card) card.classList.add('pop');
  flyCurrency(from, 'coins', res.before.coins, res.reward.coins || 0, 250);
  flyCurrency(from, 'diamonds', res.before.diamonds, res.reward.diamonds || 0, 400);
  if (res.reward.hints) toast(`+${res.reward.hints} hint`);
  onChange();
  setTimeout(() => {
    render();
    btn.disabled = false;
  }, 650);
  setTimeout(() => {
    closeModals();
    renderCurrency();
    onChange();
  }, 1600);
}

/**
 * Wire the popup once.
 * @param {() => void} changed called after a claim (Home refreshes its button and streak)
 */
export function bindDaily(changed) {
  onChange = changed;
  $('btn-daily-claim').addEventListener('click', (e) => onClaim(e.currentTarget));
}
