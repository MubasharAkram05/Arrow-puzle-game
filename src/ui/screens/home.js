import { dateKey } from '../../engine/index.js';
import { initAudio } from '../../audio/sound.js';
import { startDaily, startLevel } from '../../game/game.js';
import { clearHint } from '../../game/hints.js';
import { state } from '../../game/state.js';
import { hidePointer } from '../../render/pointer.js';
import { $, shortDate } from '../dom.js';
import { closeModals } from '../modals/modal.js';
import { onReturn, resetTo } from '../navigation.js';
import { openLevels } from './levels.js';

/** Fill in the home screen labels (current level, daily status). */
function renderHome() {
  const now = new Date();
  $('play-sub').textContent = `Level ${state.progress.current}`;
  $('daily-day').textContent = now.getDate();
  const done = !!state.progress.daily[dateKey(now)];
  $('daily-sub').textContent = `${shortDate(now)} · ${done ? 'Completed' : 'Super Hard'}`;
  $('btn-daily').classList.toggle('done', done);
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
  $('btn-daily').addEventListener('click', () => {
    initAudio();
    startDaily();
  });
  $('btn-home-levels').addEventListener('click', openLevels);
  onReturn('screen-home', renderHome);
}
