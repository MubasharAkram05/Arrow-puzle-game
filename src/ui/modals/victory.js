import {
  adUiShown,
  maybeInterstitial,
  noteLevelWin,
  onAdsChange,
  rewardedAvailable,
  watchRewardedAd,
} from '../../ads/index.js';
import { adDoubleCoins } from '../../game/rewards.js';
import { saveProgress } from '../../storage/save.js';
import { startLevel } from '../../game/game.js';
import { state } from '../../game/state.js';
import { drawArrows, strokeMetrics } from '../../render/board.js';
import { startConfetti } from '../../render/confetti.js';
import { flyCurrency, renderCurrency } from '../components/currencyBar.js';
import { $ } from '../dom.js';
import { goHome } from '../screens/home.js';
import { closeModals, onModalBack, openModal } from './modal.js';
import { getShape } from '../../engine/index.js';
import { toast } from '../components/toast.js';
import { SHOW_SHAPE_COLLECTION } from '../../config.js';

const reduced = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const counts = new Map();

/**
 * Count a reward number up to its value ("+N"), with a small bump at the end. Reduced motion: set at once.
 * @param {string} id element id
 * @param {number} from
 * @param {number} to
 * @param {number} [delay] ms
 */
function countTo(id, from, to, delay = 0) {
  const el = $(id);
  cancelAnimationFrame(counts.get(id));
  clearTimeout(counts.get(id + ':t'));
  el.textContent = `+${from}`;
  if (reduced() || from === to) {
    el.textContent = `+${to}`;
    return;
  }
  const ms = 600;
  counts.set(
    id + ':t',
    setTimeout(() => {
      const t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / ms);
        el.textContent = `+${Math.round(from + (to - from) * (1 - (1 - k) ** 3))}`;
        if (k < 1) counts.set(id, requestAnimationFrame(step));
        else {
          const wrap = el.parentElement;
          wrap.classList.remove('bump');
          void wrap.offsetWidth;
          wrap.classList.add('bump');
        }
      };
      counts.set(id, requestAnimationFrame(step));
    }, delay),
  );
}

/** Rewards row: coins, diamonds (only when earned) and XP, each counting up. One total each, no breakdown. */
function renderRewards(reward, xp) {
  $('win-gems-wrap').hidden = !reward.diamonds;
  countTo('win-coins', 0, reward.coins, 150);
  countTo('win-gems', 0, reward.diamonds || 0, 250);
  countTo('win-xp', 0, xp, 350);
}

/** Draw the solved level in the white card. */
function renderPreview() {
  const preview = state.level.arrows.map((a) => ({ id: a.id, dir: a.dir, path: a.path }));
  const { rows, cols } = state.level;
  // small boards sit compact in the middle of the card, big ones fill most of it
  const box = $('mini-card').clientWidth * 0.8;
  const n = Math.max(rows, cols);
  const cell = Math.min(box / n, Math.max(14, 90 / n));
  const svg = $('mini-board');
  drawArrows(svg, preview, state.level, false, { ...strokeMetrics(cell, 0.62), head: state.cosmetics.equipped.head });
  svg.setAttribute('width', Math.floor(cell * cols));
  svg.setAttribute('height', Math.floor(cell * rows));
}

/** Level the "Next Level" button starts. */
let nextLevel = 1;
/** Level just won and the coins it paid (for 2x coins and the interstitial rules). */
let wonLevel = 1;
let wonCoins = 0;
let doubled = false;

/**
 * "Watch ad: 2x coins": only while a rewarded ad is loaded (and the daily cap allows it), once per win, when the
 * win paid coins. After the ad it stays as a disabled "Collected!".
 */
function renderDouble() {
  const btn = $('btn-double');
  btn.hidden = !adUiShown() || (!doubled && !(wonCoins > 0 && rewardedAvailable()));
  btn.disabled = doubled;
  btn.classList.toggle('collected', doubled);
  $('double-label').textContent = doubled ? 'Collected!' : 'Watch ad: 2x coins';
  btn.querySelector('use').setAttribute('href', doubled ? '#i-check' : '#i-play');
  $('double-amt').textContent = `+${wonCoins}`;
}

/** Leave the victory screen: an interstitial may show first (src/ads, after level 10, every 3 wins, 6 min). */
async function leave(then) {
  await maybeInterstitial(wonLevel);
  then();
}

/**
 * Show the victory screen; coins and diamonds fly from the card to the counters.
 * @param {{reward: object, xp: number, before: {coins: number, diamonds: number}, next?: number, newShape?: string|null}} summary from applyWin
 */
export function showVictory(summary) {
  nextLevel = summary.next ?? state.progress.current;
  wonLevel = state.levelNum;
  wonCoins = summary.reward.coins;
  doubled = false;
  noteLevelWin();
  renderDouble();
  $('next-sub').textContent = `Level ${nextLevel}`;
  $('victory-title').textContent = `Level ${wonLevel} Complete!`;
  $('victory-sub').textContent = summary.reward.perfect ? 'Perfect!' : '';
  renderRewards(summary.reward, summary.xp);
  renderCurrency(summary.before, $('modal-victory'));
  openModal('modal-victory');
  renderPreview();
  startConfetti();
  // the coins fly once from the rewards row to the top counter
  const from = $('win-rewards');
  flyCurrency(from, 'coins', summary.before.coins, summary.reward.coins, 450);
  flyCurrency(from, 'diamonds', summary.before.diamonds, summary.reward.diamonds, 750);
  if (SHOW_SHAPE_COLLECTION && summary.newShape)
    setTimeout(() => toast(`New shape collected: ${getShape(summary.newShape).name}!`), 900);
}

/** Wire the victory buttons. Back acts like "Home". */
export function bindVictory() {
  $('btn-next').addEventListener('click', () =>
    leave(() => {
      closeModals();
      startLevel(nextLevel);
    }),
  );
  $('btn-main').addEventListener('click', () => leave(goHome));
  onModalBack('modal-victory', () => leave(goHome));
  $('btn-double').addEventListener('click', async () => {
    if (doubled || !(await watchRewardedAd())) return renderDouble();
    doubled = true;
    adDoubleCoins(wonCoins);
    saveProgress();
    renderDouble();
    countTo('win-coins', wonCoins, wonCoins * 2);
    renderCurrency();
  });
  onAdsChange(() => {
    if ($('modal-victory').classList.contains('open')) renderDouble();
  });
}
