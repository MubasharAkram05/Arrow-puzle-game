import { startLevel } from '../../game/game.js';
import { state } from '../../game/state.js';
import { drawArrows, strokeMetrics } from '../../render/board.js';
import { startConfetti } from '../../render/confetti.js';
import { $ } from '../dom.js';
import { goHome } from '../screens/home.js';
import { closeModals, onModalBack, openModal } from './modal.js';

/** Fill in and show the victory screen with a preview of the solved level. */
export function showVictory() {
  $('next-sub').textContent = `Level ${state.progress.current}`;
  const preview = state.level.arrows.map((a) => ({ id: a.id, dir: a.dir, path: a.path }));
  const { rows, cols } = state.level;
  openModal('modal-victory');
  // small boards sit compact in the middle of the card, big ones fill most of it
  const box = $('mini-card').clientWidth * 0.8;
  const n = Math.max(rows, cols);
  const cell = Math.min(box / n, Math.max(14, 90 / n));
  const svg = $('mini-board');
  drawArrows(svg, preview, state.level, false, strokeMetrics(cell, 0.62));
  svg.setAttribute('width', Math.floor(cell * cols));
  svg.setAttribute('height', Math.floor(cell * rows));
  startConfetti();
}

/** Wire the victory buttons. Back acts like "Main". */
export function bindVictory() {
  $('btn-next').addEventListener('click', () => {
    closeModals();
    startLevel(state.progress.current);
  });
  $('btn-main').addEventListener('click', goHome);
  onModalBack('modal-victory', goHome);
}
