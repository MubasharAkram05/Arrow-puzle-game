/**
 * Shop "Watch ad" rows (3.26.0): +1 diamond, +1 hint, +40 coins (ADS.earn). Always visible, with the ad icon and
 * "x/N today". Tapping one plays a rewarded ad; the reward comes only after the ad completes. With no ad loaded
 * the player sees "No ad right now, try again in a moment", and "Daily limit reached, come back tomorrow" when
 * the kind's limit (or the overall daily cap) is used up.
 */
import { ADS } from '../../../config.js';
import { earnState, watchRewardedAd } from '../../../ads/index.js';
import { adEarn } from '../../../game/rewards.js';
import { state } from '../../../game/state.js';
import { flyCurrency } from '../../components/currencyBar.js';
import { icon } from '../../components/icons.js';
import { done } from './actions.js';

const KINDS = {
  diamond: {
    icon: '<svg class="cur-icon" aria-hidden="true"><use href="#i-gem" /></svg>',
    unit: ['diamond', 'diamonds'],
  },
  hint: { icon: icon('bulb'), unit: ['hint', 'hints'] },
  coins: { icon: '<svg class="cur-icon" aria-hidden="true"><use href="#i-coin" /></svg>', unit: ['coin', 'coins'] },
};

/** "Watch ad: +40 coins" */
export function earnLabel(kind) {
  const n = ADS.earn[kind].amount;
  return `Watch ad: +${n} ${KINDS[kind].unit[n === 1 ? 0 : 1]}`;
}

/**
 * One "Watch ad" row.
 * @param {'diamond'|'hint'|'coins'} kind
 * @returns {string}
 */
export function earnRow(kind) {
  const s = earnState(kind);
  const sub = s.state === 'limit' ? 'Daily limit reached' : s.state === 'noad' ? 'Loading an ad…' : 'Watch a short ad';
  return `<button class="earn-row" data-kind="adearn" data-id="${kind}" data-state="${s.state}">
    <span class="earn-icon">${KINDS[kind].icon}</span>
    <span class="earn-text"><b>${earnLabel(kind)}</b><small>${sub}</small></span>
    <span class="earn-side"><span class="earn-pill">${icon('ad')}Ad</span><small class="earn-count">${s.used}/${s.cap} today</small></span>
  </button>`;
}

/**
 * A "Watch ad" row was tapped: play the ad, then give the reward.
 * @param {HTMLElement} el
 */
export async function onEarn(el) {
  const kind = el.dataset.id;
  if (!KINDS[kind]) return;
  const before = { coins: state.coins, diamonds: state.diamonds };
  if (!(await watchRewardedAd(kind))) return done('adearn', kind);
  const n = adEarn(kind);
  // the shop may have been redrawn while the ad played: fly from the row that is on screen now
  const from = document.querySelector(`#shop-panel .earn-row[data-id="${kind}"]`) || el;
  if (kind === 'coins') flyCurrency(from, 'coins', before.coins, n);
  if (kind === 'diamond') flyCurrency(from, 'diamonds', before.diamonds, n);
  done('adearn', kind, `+${n} ${KINDS[kind].unit[n === 1 ? 0 : 1]}`);
}
