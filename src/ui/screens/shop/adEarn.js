/**
 * Shop "Free rewards" (3.26.0): one highlighted card at the top of the All and Offers tabs with three rewarded-ad
 * rows (+1 diamond, +1 hint, +40 coins; ADS.earn) and the Free Gift with its countdown. Each ad row shows the reward
 * icon, the label, "x/N today" with a small progress bar and a "Watch" button; a row at its daily limit looks done
 * ("Come back tomorrow"). The reward comes only after the ad completes; with no ad loaded the player sees "No ad
 * right now, try again in a moment", at the limit "Daily limit reached, come back tomorrow".
 */
import { ADS, OFFERS } from '../../../config.js';
import { earnState, watchRewardedAd } from '../../../ads/index.js';
import { formatCountdown, giftStatus } from '../../../game/offers.js';
import { adEarn } from '../../../game/rewards.js';
import { state } from '../../../game/state.js';
import { flyCurrency } from '../../components/currencyBar.js';
import { icon } from '../../components/icons.js';
import { done } from './actions.js';

const GEM = '<svg class="cur-icon" aria-hidden="true"><use href="#i-gem" /></svg>';
const COIN = '<svg class="cur-icon" aria-hidden="true"><use href="#i-coin" /></svg>';
const KINDS = {
  diamond: { icon: GEM, unit: ['diamond', 'diamonds'] },
  hint: { icon: icon('bulb'), unit: ['hint', 'hints'] },
  coins: { icon: COIN, unit: ['coin', 'coins'] },
};
/** Order of the rows in the card. */
export const EARN_ORDER = ['diamond', 'hint', 'coins'];

/** "+40 coins" */
export function earnLabel(kind) {
  const n = ADS.earn[kind].amount;
  return `+${n} ${KINDS[kind].unit[n === 1 ? 0 : 1]}`;
}

/**
 * What a reward row shows (pure, tested in tests/shopCards.test.js).
 * @param {{state: 'ready'|'noad'|'limit', used: number, cap: number}} s earnState(kind)
 * @returns {{done: boolean, sub: string, button: string, progress: number}}
 */
export function earnView(s) {
  const done = s.state === 'limit';
  return {
    done,
    sub: done ? 'Come back tomorrow' : `${s.used}/${s.cap} today`,
    button: done ? 'Done' : 'Watch',
    progress: s.cap ? Math.min(1, s.used / s.cap) : 0,
  };
}

/**
 * One reward row.
 * @param {'diamond'|'hint'|'coins'} kind
 * @param {{featured?: boolean}} [o] featured: the Hints tab's single highlighted row
 * @returns {string}
 */
export function earnRow(kind, o = {}) {
  const s = earnState(kind);
  const v = earnView(s);
  const btn = v.done
    ? `<span class="earn-btn is-done">${icon('check')}Done</span>`
    : `<span class="earn-btn${s.state === 'noad' ? ' is-wait' : ''}">${icon('ad')}Watch</span>`;
  return `<button class="earn-row${o.featured ? ' featured' : ''}" data-kind="adearn" data-id="${kind}" data-state="${s.state}" aria-label="Watch ad: ${earnLabel(kind)}, ${v.sub}">
    <span class="earn-icon k-${kind}">${KINDS[kind].icon}</span>
    <span class="earn-text"><b>${earnLabel(kind)}</b><small>${v.done ? icon('check') : ''}${v.sub}</small>${v.done ? '' : `<i class="earn-bar"><i style="width:${Math.round(v.progress * 100)}%"></i></i>`}</span>
    ${btn}
  </button>`;
}

/** The Free Gift row (every 4 hours, with its countdown, ticked by the shop shell). */
function giftRow() {
  const g = giftStatus(Date.now(), state.offers.giftLast);
  const right = g.ready
    ? `<span class="earn-btn is-claim">${icon('gift')}Claim</span>`
    : `<span class="earn-btn is-done"><span class="countdown" data-countdown>${formatCountdown(g.remainingMs)}</span></span>`;
  const sub = g.clockBack ? 'Clock changed: timer restarted' : 'Every 4 hours';
  return `<button class="earn-row gift-row" data-kind="gift" data-id="gift" data-state="${g.ready ? 'ready' : 'wait'}">
    <span class="earn-icon k-gift">${icon('gift')}</span>
    <span class="earn-text"><b>Free gift: +${OFFERS.freeGift.coins} coins</b><small>${sub}</small></span>
    ${right}
  </button>`;
}

/** The highlighted "Free rewards" card. */
export function freeRewardsCard() {
  return `<section class="free-card" id="free-rewards" aria-labelledby="free-title">
    <header class="free-head"><span class="free-play">${icon('play')}</span><div><h3 id="free-title">Free rewards</h3><p>Watch a short ad or claim your gift</p></div></header>
    <div class="free-rows">${EARN_ORDER.map((k) => earnRow(k)).join('')}${giftRow()}</div>
  </section>`;
}

/**
 * A "Watch" row was tapped: play the ad, then give the reward.
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
