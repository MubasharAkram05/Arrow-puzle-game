import { MAX_REFILLS_PER_LEVEL, PRICES } from '../../config.js';
import { shortfall } from '../../game/economy.js';
import { restart, resumePlay } from '../../game/game.js';
import { adUiShown, onAdsChange, rewardedAvailable, watchRewardedAd } from '../../ads/index.js';
import { adRefillHeart, buyGameOverHeart, wallet } from '../../game/rewards.js';
import { state } from '../../game/state.js';
import { renderHearts } from '../../render/hud.js';
import { renderCurrency } from '../components/currencyBar.js';
import { $ } from '../dom.js';
import { goBack } from '../navigation.js';
import { heartOffer } from './gameoverOffer.js';
import { closeModals, onModalBack, openModal } from './modal.js';

/**
 * Out of Hearts (3.26.0): a "Get +1 heart" card with Watch Ad (primary) and diamonds (secondary) side by side,
 * then Try Again. How the two buttons look comes from heartOffer() (gameoverOffer.js). Each heart continues the
 * level; the ad heart comes only after the full ad and counts toward the refills per level.
 */
export function showGameOver() {
  renderHearts(-1); // the top bar shows every heart as lost while this is open
  renderOffer();
  openModal('modal-gameover');
}

/** Paint the two buttons and the note for what is available right now. */
function renderOffer() {
  const o = heartOffer({
    adReady: rewardedAvailable(),
    refillsLeft: MAX_REFILLS_PER_LEVEL - state.refillsUsed,
    missingDiamonds: shortfall(wallet(), PRICES.gameOverHeart).diamonds,
  });
  const ad = $('btn-heart-ad');
  // the production web has no ads: only the diamonds button there
  ad.hidden = !adUiShown();
  ad.disabled = o.ad !== 'ready';
  ad.dataset.state = o.ad;
  $('heart-ad-label').textContent = { ready: 'Watch Ad', unavailable: 'Ad not available', limit: 'No refills left' }[
    o.ad
  ];
  const gems = $('btn-heart-gems');
  gems.dataset.state = o.gems;
  // short of diamonds: it stays tappable (it shakes), but says it is disabled
  if (o.gems === 'short') gems.setAttribute('aria-disabled', 'true');
  else gems.removeAttribute('aria-disabled');
  $('heart-gems-cost').textContent = String(PRICES.gameOverHeart.diamonds);
  $('heart-note').textContent = o.note;
  $('go-offer').dataset.both = String(o.ad !== 'ready' && o.gems === 'short');
}

/** Wire the game-over buttons. Back leaves the finished level. */
export function bindGameOver() {
  $('btn-tryagain').addEventListener('click', restart);
  $('btn-heart-gems').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    if (btn.dataset.state === 'short') {
      btn.classList.remove('shake');
      void btn.offsetWidth; // restart the shake on every tap
      btn.classList.add('shake');
      return;
    }
    if (!buyGameOverHeart().ok) return renderOffer();
    renderCurrency();
    resumePlay();
  });
  $('btn-heart-ad').addEventListener('click', async () => {
    // the heart comes only once the ad has reported its reward
    if (!(await watchRewardedAd()) || !adRefillHeart().ok) return showGameOver();
    resumePlay();
  });
  onAdsChange(() => {
    if ($('modal-gameover').classList.contains('open')) renderOffer();
  });
  onModalBack('modal-gameover', () => {
    closeModals();
    goBack();
  });
}
