import { CELL } from '../config.js';
import { state } from '../game/state.js';
import { $ } from '../ui/dom.js';

/**
 * Show the pointing hand (and optional "Tap to remove" tooltip) over an arrow head.
 * @param {number} id arrow id
 * @param {boolean} withTip
 */
export function showPointer(id, withTip) {
  state.pointerId = id;
  $('pointer-tip').style.display = withTip ? '' : 'none';
  $('pointer').classList.add('show');
  placePointer();
}

/** Hide the hand. */
export function hidePointer() {
  state.pointerId = -1;
  $('pointer').classList.remove('show');
}

/** Position the hand so the fingertip sits on the arrow head. */
export function placePointer() {
  if (state.pointerId === -1) return;
  const a = state.arrows[state.pointerId];
  const wrapRect = $('board-wrap').getBoundingClientRect();
  const rect = $('board').getBoundingClientRect();
  const scale = rect.width / (state.level.cols * CELL);
  const x = rect.left - wrapRect.left + a.geom.hx * scale;
  const y = rect.top - wrapRect.top + a.geom.hy * scale;
  // fingertip is near (12/24, 2/24) of the 44px hand
  $('pointer').style.transform = `translate(${x - 20}px, ${y - 4}px)`;
}
