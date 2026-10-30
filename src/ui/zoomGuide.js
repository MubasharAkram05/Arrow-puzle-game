/**
 * Zoom guide shown when a level starts zoomed: two hands pinching ("Pinch to zoom") and one finger
 * dragging ("Drag to move"). Shown on the first few zoomed levels, then only while the player has
 * never pinched. It fades on the first touch or after a few seconds and never takes taps.
 * The record lives in localStorage (a per-device convenience); blocked storage just shows it.
 */
import { ZOOM } from '../config.js';
import { $ } from './dom.js';

/**
 * Should the guide show for this record? Pure, for tests.
 * @param {{shown: number, pinched: boolean}} rec
 * @param {number} [times]
 * @returns {boolean}
 */
export function shouldShowGuide(rec, times = ZOOM.guideTimes) {
  return rec.shown < times || !rec.pinched;
}

/** @returns {{shown: number, pinched: boolean}} */
function load() {
  try {
    const r = JSON.parse(localStorage.getItem(ZOOM.guideKey));
    return { shown: Math.max(0, Number(r?.shown) || 0), pinched: r?.pinched === true };
  } catch {
    return { shown: 0, pinched: false };
  }
}

function store(rec) {
  try {
    localStorage.setItem(ZOOM.guideKey, JSON.stringify(rec));
  } catch {
    // storage blocked: the guide just shows again next time
  }
}

let timer = 0;

/** Hide the guide (fade out). */
export function hideZoomGuide() {
  clearTimeout(timer);
  $('zoom-guide').classList.remove('show');
}

/** A level started zoomed: show the guide if this player still needs it. */
export function maybeShowZoomGuide() {
  const rec = load();
  if (!shouldShowGuide(rec)) return;
  store({ ...rec, shown: rec.shown + 1 });
  $('zoom-guide').classList.add('show');
  clearTimeout(timer);
  timer = setTimeout(hideZoomGuide, ZOOM.guideMs);
}

/** The player pinched: remember it, so after the first few levels the guide stops. */
export function notePinch() {
  hideZoomGuide();
  const rec = load();
  if (!rec.pinched) store({ ...rec, pinched: true });
}

/** "Show zoom tips again" in Settings. */
export function resetZoomGuide() {
  store({ shown: 0, pinched: false });
}
