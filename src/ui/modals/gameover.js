import { MAX_REFILLS_PER_LEVEL, PRICES } from '../../config.js';
import { canAfford } from '../../game/economy.js';
import { restart, resumePlay } from '../../game/game.js';
import { onAdsChange, rewardedAvailable, watchRewardedAd } from '../../ads/index.js';
import { adRefillHeart, buyGameOverHeart, wallet } from '../../game/rewards.js';
import { state } from '../../game/state.js';
import { renderCurrency } from '../components/currencyBar.js';
import { $ } from '../dom.js';
import { goBack } from '../navigation.js';
import { missingText, priceHTML } from './ask.js';
import { closeModals, onModalBack, openModal } from './modal.js';

/**
 * Out of Hearts (3.26.0): three choices, in this order.
 *  1. "+1 heart" for diamonds (PRICES.gameOverHeart); disabled with "Need X more diamonds" when short
 *  2. "Watch ad: +1 heart"; only while a rewarded ad is loaded and the daily cap allows it, and within the
 *     per-level refill limit (it counts as a refill)
 *  3. "Try Again"
 * Each heart continues the level. Buying a heart with coins stays on the hearts during play (game screen).
 */
export function showGameOver() {
  $('heart-gems-price').innerHTML = priceHTML(PRICES.gameOverHeart);
  const short = canAfford(wallet(), PRICES.gameOverHeart) ? '' : missingText(PRICES.gameOverHeart);
  $('btn-heart-gems').disabled = !!short;
  $('heart-gems-note').textContent = short;
  renderAdButton();
  openModal('modal-gameover');
}

/** The ad row: only with an ad ready and refills left this level. */
function renderAdButton() {
  $('btn-heart-ad').hidden = !rewardedAvailable() || state.refillsUsed >= MAX_REFILLS_PER_LEVEL;
}

/** Wire the game-over buttons. Back leaves the finished level. */
export function bindGameOver() {
  $('btn-tryagain').addEventListener('click', restart);
  $('btn-heart-gems').addEventListener('click', () => {
    if (!buyGameOverHeart().ok) return showGameOver();
    renderCurrency();
    resumePlay();
  });
  $('btn-heart-ad').addEventListener('click', async () => {
    // the heart comes only once the ad has reported its reward
    if (!(await watchRewardedAd()) || !adRefillHeart().ok) return showGameOver();
    resumePlay();
  });
  onAdsChange(() => {
    if ($('modal-gameover').classList.contains('open')) renderAdButton();
  });
  onModalBack('modal-gameover', () => {
    closeModals();
    goBack();
  });
}
