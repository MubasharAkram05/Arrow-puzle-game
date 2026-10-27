import { CELL } from '../config.js';
import { state } from '../game/state.js';
import { $ } from '../ui/dom.js';

/**
 * Show the pointing glove over an arrow; withTip also shows the "Tap to remove" bubble under the board.
 * @param {number} id arrow id
 * @param {boolean} withTip
 */
export function showPointer(id, withTip) {
  state.pointerId = id;
  $('pointer').classList.add('show');
  $('tip-bubble').classList.toggle('show', withTip);
  placePointer();
}

/** Hide the glove and the bubble. */
export function hidePointer() {
  state.pointerId = -1;
  $('pointer').classList.remove('show');
  $('tip-bubble').classList.remove('show');
}

/** Middle body cell of an arrow (where the reference points the glove). */
function bodyPoint(a) {
  const p = a.path[Math.floor((a.path.length - 1) / 2)];
  return { x: (p.c + 0.5) * CELL, y: (p.r + 0.5) * CELL };
}

/** Position the glove fingertip on the arrow body and the bubble under the board. */
export function placePointer() {
  if (state.pointerId === -1) return;
  const a = state.arrows[state.pointerId];
  const wrapRect = $('board-wrap').getBoundingClientRect();
  const rect = $('board').getBoundingClientRect();
  const scale = rect.width / (state.level.cols * CELL);
  const pt = bodyPoint(a);
  const x = rect.left - wrapRect.left + pt.x * scale;
  const y = rect.top - wrapRect.top + pt.y * scale;
  // fingertip sits at (6, 6) of the 64px glove
  $('pointer').style.transform = `translate(${x - 6}px, ${y - 6}px)`;
  const bubble = $('tip-bubble');
  const half = bubble.offsetWidth / 2;
  const left = Math.max(8, Math.min(wrapRect.width - 8 - 2 * half, x - half));
  bubble.style.transform = `translate(${left}px, ${rect.bottom - wrapRect.top + 22}px)`;
  bubble.style.setProperty('--nub', `${x - left}px`);
}
