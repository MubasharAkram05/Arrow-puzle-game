import { initAudio } from '../../audio/sound.js';
import { startLevel } from '../../game/game.js';
import { clearHint } from '../../game/hints.js';
import { state } from '../../game/state.js';
import { hidePointer } from '../../render/pointer.js';
import { renderCurrency } from '../components/currencyBar.js';
import { $ } from '../dom.js';
import { closeModals } from '../modals/modal.js';
import { onReturn, resetTo } from '../navigation.js';

/** Fill in the home screen labels. */
function renderHome() {
  $('play-sub').textContent = `Level ${state.progress.current}`;
  renderCurrency();
}

/** Show home as the root screen. */
export function goHome() {
  closeModals();
  clearHint();
  hidePointer();
  renderHome();
  resetTo('screen-home');
}

/** Wire the home screen buttons. */
export function bindHome() {
  $('btn-play').addEventListener('click', () => {
    initAudio();
    startLevel(state.progress.current);
  });
  onReturn('screen-home', renderHome);
}
