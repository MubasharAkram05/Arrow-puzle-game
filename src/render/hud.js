import { state } from '../game/state.js';
import { $, svgEl } from '../ui/dom.js';

const HEART_PATH =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

/** Update the arrows-left pill and the progress bar. */
export function renderProgress() {
  $('remaining').textContent = state.remaining;
  const total = state.level.arrows.length;
  $('progress').style.transform = `scaleX(${(total - state.remaining) / total})`;
}

/**
 * Draw hearts; the heart at popIndex plays the pop animation.
 * @param {number} popIndex -1 for none
 */
export function renderHearts(popIndex) {
  const box = $('hearts');
  box.textContent = '';
  for (let i = 0; i < state.maxHearts; i++) {
    const svg = svgEl('svg', {
      viewBox: '0 0 24 24',
      class: 'heart' + (i < state.hearts ? '' : ' lost') + (i === popIndex ? ' pop' : ''),
    });
    svg.appendChild(svgEl('path', { d: HEART_PATH }));
    box.appendChild(svg);
  }
  box.setAttribute('aria-label', `${state.hearts} hearts left`);
}

/** Hint badge count and disabled state. */
export function renderHintButton() {
  $('hint-count').textContent = state.hints;
  $('btn-hint').disabled = state.hints <= 0 && state.hintId === -1;
}

/** Grid toggle button and dot visibility. */
export function renderGrid() {
  $('board').classList.toggle('no-grid', !state.grid);
  $('btn-grid').classList.toggle('on', state.grid);
  $('btn-grid').setAttribute('aria-pressed', String(state.grid));
}
