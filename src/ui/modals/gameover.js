import { MAX_REFILLS_PER_LEVEL, PRICES } from '../../config.js';
import { canAfford } from '../../game/economy.js';
import { restart, resumePlay } from '../../game/game.js';
import { buyContinue, refillHeart, wallet } from '../../game/rewards.js';
import { state } from '../../game/state.js';
import { renderCurrency } from '../components/currencyBar.js';
import { $ } from '../dom.js';
import { goBack } from '../navigation.js';
import { missingText, priceHTML } from './ask.js';
import { closeModals, onModalBack, openModal } from './modal.js';

/**
 * Enable a paid button or disable it with the reason shown under it.
 * @param {string} id button id
 * @param {string} noteId note element id
 * @param {object} price
 * @param {string} [blocked] reason that wins over the price check
 */
function setBuyButton(id, noteId, price, blocked = '') {
  const reason = blocked || (canAfford(wallet(), price) ? '' : missingText(price));
  $(id).disabled = !!reason;
  $(noteId).textContent = reason;
}

/** Show the out-of-hearts dialog with the current prices and limits. */
export function showGameOver() {
  $('refill-price').innerHTML = priceHTML(PRICES.heartRefill);
  $('continue-price').innerHTML = priceHTML(PRICES.continueGame);
  const limit =
    state.refillsUsed >= MAX_REFILLS_PER_LEVEL ? `Limit reached: ${MAX_REFILLS_PER_LEVEL} refills per level.` : '';
  setBuyButton('btn-refill', 'refill-note', PRICES.heartRefill, limit);
  setBuyButton('btn-continue', 'continue-note', PRICES.continueGame);
  openModal('modal-gameover');
}

/** Wire the game-over buttons. Back leaves the finished level. */
export function bindGameOver() {
  $('btn-tryagain').addEventListener('click', restart);
  $('btn-refill').addEventListener('click', () => {
    if (!refillHeart().ok) return showGameOver();
    renderCurrency();
    resumePlay();
  });
  $('btn-continue').addEventListener('click', () => {
    if (!buyContinue().ok) return showGameOver();
    renderCurrency();
    resumePlay();
  });
  onModalBack('modal-gameover', () => {
    closeModals();
    goBack();
  });
}
