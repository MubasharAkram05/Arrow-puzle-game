import { maybeInterstitial, noteLevelWin, onAdsChange, rewardedAvailable, watchRewardedAd } from '../../ads/index.js';
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

const CUR = (kind, n) =>
  `<span class="amt"><svg class="cur-icon" aria-hidden="true"><use href="#i-${kind}" /></svg>+${n}</span>`;

/** Fill the reward breakdown (base, hearts, difficulty, perfect, chapter...) and the totals. */
function renderRewards(reward, xp) {
  $('reward-lines').innerHTML = reward.lines
    .map((l) => {
      const coins = l.coins ? `<span class="amt">${l.coins > 0 ? '+' : ''}${l.coins}</span>` : '';
      const gems = l.diamonds ? CUR('gem', l.diamonds) : '';
      return `<li><span>${l.label}</span><span>${coins}${gems}</span></li>`;
    })
    .join('');
  $('reward-total').innerHTML =
    CUR('coin', reward.coins) +
    (reward.diamonds ? CUR('gem', reward.diamonds) : '') +
    `<span class="xp">+${xp} XP</span>`;
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

/** Level the "Next Game" button starts. */
let nextLevel = 1;
/** Level just won and the coins it paid (for 2x coins and the interstitial rules). */
let wonLevel = 1;
let wonCoins = 0;
let doubled = false;

/** "Watch ad: 2x coins": only while a rewarded ad is loaded, once per win, when the win paid coins. */
function renderDouble() {
  const show = !doubled && wonCoins > 0 && rewardedAvailable();
  $('btn-double').hidden = !show;
  if (show) $('double-label').textContent = `Watch ad: +${wonCoins} coins (2x)`;
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
  renderRewards(summary.reward, summary.xp);
  renderCurrency(summary.before, $('modal-victory'));
  openModal('modal-victory');
  renderPreview();
  startConfetti();
  const card = $('mini-card');
  flyCurrency(card, 'coins', summary.before.coins, summary.reward.coins, 450);
  flyCurrency(card, 'diamonds', summary.before.diamonds, summary.reward.diamonds, 750);
  if (SHOW_SHAPE_COLLECTION && summary.newShape)
    setTimeout(() => toast(`New shape collected: ${getShape(summary.newShape).name}!`), 900);
}

/** Wire the victory buttons. Back acts like "Main". */
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
    const before = { coins: state.coins, diamonds: state.diamonds };
    adDoubleCoins(wonCoins);
    saveProgress();
    renderDouble();
    flyCurrency($('btn-double'), 'coins', before.coins, wonCoins);
    toast(`+${wonCoins} coins`);
  });
  onAdsChange(() => {
    if ($('modal-victory').classList.contains('open')) renderDouble();
  });
}
