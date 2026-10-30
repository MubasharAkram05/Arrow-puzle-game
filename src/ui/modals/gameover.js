import { MAX_REFILLS_PER_LEVEL, PRICES } from '../../config.js';
import { canAfford } from '../../game/economy.js';
import { restart, resumePlay, startLevel } from '../../game/game.js';
import { buyContinue, refillHeart, skipLevel, wallet } from '../../game/rewards.js';
import { isTestPlay } from '../../game/unlock.js';
import { state } from '../../game/state.js';
import { saveProgress } from '../../storage/save.js';
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
  $('skip-price').innerHTML = priceHTML(PRICES.skipLevel);
  const limit =
    state.refillsUsed >= MAX_REFILLS_PER_LEVEL ? `Limit reached: ${MAX_REFILLS_PER_LEVEL} refills per level.` : '';
  setBuyButton('btn-refill', 'refill-note', PRICES.heartRefill, limit);
  setBuyButton('btn-continue', 'continue-note', PRICES.continueGame);
  setBuyButton(
    'btn-skip',
    'skip-note',
    PRICES.skipLevel,
    isTestPlay(state.levelNum, state.progress) ? 'Not in test mode.' : '',
  );
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
  $('btn-skip').addEventListener('click', () => {
    if (!skipLevel(state.levelNum).ok) return showGameOver();
    saveProgress();
    renderCurrency();
    closeModals();
    startLevel(state.progress.current);
  });
  onModalBack('modal-gameover', () => {
    closeModals();
    goBack();
  });
}
