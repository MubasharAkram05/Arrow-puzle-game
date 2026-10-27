import { state } from '../game/state.js';

/**
 * Short vibration when enabled and supported.
 * @param {number} ms
 */
export function vibrate(ms) {
  if (!state.vibration) return;
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch {
    // not supported
  }
}
