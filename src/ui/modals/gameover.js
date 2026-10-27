import { continueWithHint, restart } from '../../game/game.js';
import { state } from '../../game/state.js';
import { $ } from '../dom.js';
import { goBack } from '../navigation.js';
import { closeModals, onModalBack, openModal } from './modal.js';

/** Show the out-of-hearts dialog. */
export function showGameOver() {
  $('continue-count').textContent = state.hints;
  $('btn-continue').disabled = state.hints <= 0;
  openModal('modal-gameover');
}

/** Wire the game-over buttons. Back leaves the finished level. */
export function bindGameOver() {
  $('btn-tryagain').addEventListener('click', restart);
  $('btn-continue').addEventListener('click', continueWithHint);
  onModalBack('modal-gameover', () => {
    closeModals();
    goBack();
  });
}
