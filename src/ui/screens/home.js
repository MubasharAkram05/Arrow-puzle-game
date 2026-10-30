import { initAudio } from '../../audio/sound.js';
import { TEST_UNLOCK_ALL } from '../../config.js';
import { currentStreak } from '../../game/daily.js';
import { startLevel } from '../../game/game.js';
import { clearHint } from '../../game/hints.js';
import { state } from '../../game/state.js';
import { hidePointer } from '../../render/pointer.js';
import { renderCurrency } from '../components/currencyBar.js';
import { $ } from '../dom.js';
import { bindDaily, dailyAvailable, maybeShowDaily, openDaily } from '../modals/daily.js';
import { closeModals } from '../modals/modal.js';
import { onReturn, resetTo } from '../navigation.js';

/** Fill in the home screen labels, the daily streak and the Daily Reward button. */
export function renderHome() {
  $('play-sub').textContent = `Level ${state.progress.current}`;
  $('test-badge').hidden = !TEST_UNLOCK_ALL;
  const streak = currentStreak(state.daily, Date.now());
  $('streak-num').textContent = streak.toLocaleString('en-US');
  $('streak-chip').classList.toggle('cold', streak === 0);
  $('btn-daily').hidden = !dailyAvailable();
  renderCurrency();
}

/** Show home as the root screen. */
export function goHome() {
  closeModals();
  clearHint();
  hidePointer();
  renderHome();
  resetTo('screen-home');
  maybeShowDaily();
}

/** Wire the home screen buttons. */
export function bindHome() {
  $('btn-play').addEventListener('click', () => {
    initAudio();
    startLevel(state.progress.current);
  });
  $('btn-daily').addEventListener('click', openDaily);
  bindDaily(renderHome);
  onReturn('screen-home', renderHome);
}
