import { dateKey } from '../../engine/index.js';
import { initAudio } from '../../audio/sound.js';
import { startDaily, startLevel } from '../../game/game.js';
import { clearHint } from '../../game/hints.js';
import { state } from '../../game/state.js';
import { hidePointer } from '../../render/pointer.js';
import { $, shortDate } from '../dom.js';
import { closeModals } from '../modals/modal.js';
import { resetTo } from '../navigation.js';
import { openLevels } from './levels.js';

/** Fill in the home screen labels and show it as the root screen. */
export function goHome() {
  closeModals();
  clearHint();
  hidePointer();
  const now = new Date();
  $('play-sub').textContent = `Level ${state.progress.current}`;
  $('daily-day').textContent = now.getDate();
  const done = !!state.progress.daily[dateKey(now)];
  $('daily-sub').textContent = `${shortDate(now)} · ${done ? 'Completed' : 'Super Hard'}`;
  $('btn-daily').classList.toggle('done', done);
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
}
