import { restart } from '../../game/game.js';
import { useHint } from '../../game/hints.js';
import { state } from '../../game/state.js';
import { layoutBoard } from '../../render/board.js';
import { renderGrid } from '../../render/hud.js';
import { saveProgress } from '../../storage/save.js';
import { $ } from '../dom.js';
import { openSettings } from '../modals/settings.js';
import { openLevels } from './levels.js';

/** Wire the game screen buttons (top bar and floating buttons). */
export function bindGameScreen() {
  $('btn-levels').addEventListener('click', openLevels);
  $('btn-restart').addEventListener('click', restart);
  $('btn-settings').addEventListener('click', openSettings);
  $('btn-hint').addEventListener('click', useHint);
  $('btn-grid').addEventListener('click', () => {
    state.grid = !state.grid;
    renderGrid();
    saveProgress();
  });
  window.addEventListener('resize', layoutBoard);
}
