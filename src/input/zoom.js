/**
 * Pinch to zoom and drag to pan the board. The board card gets a CSS transform
 * (translate + scale), so taps, the hint hand and effects keep working through getBoundingClientRect.
 */
import { ZOOM } from '../config.js';
import { $ } from '../ui/dom.js';

const pointers = new Map(); // pointerId -> {x, y}
let view = { s: 1, x: 0, y: 0 };
let maxScale = 1;
let gesture = null; // {kind: 'pinch'|'pan', ...start values}
let lastEmptyTap = 0;

/** Apply the current view to the board card. */
function apply() {
  $('board-card').style.transform = view.s === 1 ? '' : `translate(${view.x}px, ${view.y}px) scale(${view.s})`;
  $('board-wrap').classList.toggle('zoomed', view.s > 1);
  $('btn-fit').hidden = view.s <= 1;
}

/** Keep the zoomed board covering the middle of the view: it can't be dragged away. */
function clampView() {
  view.s = Math.min(maxScale, Math.max(1, view.s));
  const card = $('board-card');
  const w = card.offsetWidth;
  const h = card.offsetHeight;
  // transform-origin is the card's centre, so the overflow on each side is half the extra size
  const mx = (w * (view.s - 1)) / 2;
  const my = (h * (view.s - 1)) / 2;
  view.x = Math.min(mx, Math.max(-mx, view.x));
  view.y = Math.min(my, Math.max(-my, view.y));
}

/**
 * Reset to the fitted board and set how far this board may zoom.
 * @param {number} cellPx on-screen cell size at scale 1
 */
export function resetZoom(cellPx) {
  if (cellPx) maxScale = Math.max(1, Math.min(ZOOM.maxScale, ZOOM.targetCellPx / cellPx));
  view = { s: 1, x: 0, y: 0 };
  pointers.clear();
  gesture = null;
  apply();
}

/** @returns {boolean} true when this board can zoom (big board, small cells) */
export const canZoom = () => maxScale > 1.05;

/** Midpoint and distance of the first two pointers. */
function pinchInfo() {
  const [a, b] = [...pointers.values()];
  return { mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, dist: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
}

/** Card centre on screen (without the current translate). */
function origin() {
  const r = $('board-card').getBoundingClientRect();
  return { cx: r.left + r.width / 2 - view.x, cy: r.top + r.height / 2 - view.y };
}

/**
 * Zoom to scale s keeping the screen point (px, py) still.
 * @param {number} s
 * @param {number} px
 * @param {number} py
 * @param {{s: number, x: number, y: number}} from view at the start of the gesture
 */
function zoomAt(s, px, py, from) {
  const { cx, cy } = origin();
  const k = Math.min(maxScale, Math.max(1, s)) / from.s;
  view.s = from.s * k;
  view.x = px - cx - (px - cx - from.x) * k;
  view.y = py - cy - (py - cy - from.y) * k;
  clampView();
  apply();
}

/**
 * Pointer went down on the board area.
 * @param {PointerEvent} e
 */
function onDown(e) {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
  if (pointers.size === 2 && canZoom()) {
    const p = pinchInfo();
    gesture = { kind: 'pinch', ...p, from: { ...view } };
    hideZoomHint();
  }
}

/** @param {PointerEvent} e */
function onMove(e) {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  p.x = e.clientX;
  p.y = e.clientY;
  if (gesture?.kind === 'pinch' && pointers.size >= 2) {
    const now = pinchInfo();
    const from = gesture.from;
    zoomAt(from.s * (now.dist / gesture.dist), gesture.mx, gesture.my, from);
    // two-finger drag pans as well
    view.x += now.mx - gesture.mx;
    view.y += now.my - gesture.my;
    clampView();
    apply();
    gesture.from = { ...view };
    gesture.mx = now.mx;
    gesture.my = now.my;
    gesture.dist = now.dist;
    return;
  }
  if (pointers.size === 1 && view.s > 1) {
    if (!gesture && Math.hypot(p.x - p.x0, p.y - p.y0) > ZOOM.dragPx) {
      gesture = { kind: 'pan', x: p.x, y: p.y };
    }
    if (gesture?.kind === 'pan') {
      view.x += p.x - gesture.x;
      view.y += p.y - gesture.y;
      gesture.x = p.x;
      gesture.y = p.y;
      clampView();
      apply();
    }
  }
}

/**
 * Pointer released. Returns whether this release counts as a tap on the board.
 * @param {PointerEvent} e
 * @returns {boolean}
 */
export function releaseIsTap(e) {
  const p = pointers.get(e.pointerId);
  const wasGesture = !!gesture || pointers.size > 1;
  pointers.delete(e.pointerId);
  if (!pointers.size) gesture = null;
  if (!p || wasGesture) return false;
  return Math.hypot(e.clientX - p.x0, e.clientY - p.y0) <= ZOOM.dragPx;
}

/** Back to the whole board (also used before a hint or Reveal so the highlight is on screen). */
export function fit() {
  view = { s: 1, x: 0, y: 0 };
  apply();
}

/** A tap that hit no arrow: a quick second one resets the zoom. */
export function emptyTap() {
  const now = Date.now();
  if (view.s > 1 && now - lastEmptyTap < ZOOM.doubleTapMs) {
    fit();
    lastEmptyTap = 0;
    return;
  }
  lastEmptyTap = now;
}

/** Ctrl/trackpad wheel zoom for desktop browsers. */
function onWheel(e) {
  if (!canZoom()) return;
  e.preventDefault();
  zoomAt(view.s * Math.exp(-e.deltaY * 0.0025), e.clientX, e.clientY, { ...view });
}

/**
 * Show "Pinch to zoom" on the first few dense boards (remembered per device).
 * @param {number} cols board width in cells
 */
export function maybeShowZoomHint(cols) {
  if (!canZoom() || cols < ZOOM.hintMinCols) return;
  let seen = 0;
  try {
    seen = Number(localStorage.getItem(ZOOM.hintKey)) || 0;
    localStorage.setItem(ZOOM.hintKey, String(seen + 1));
  } catch {
    // storage blocked: show it anyway
  }
  if (seen >= ZOOM.hintTimes) return;
  const el = $('zoom-hint');
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(hideZoomHint, ZOOM.hintMs);
}

/** Hide the zoom hint. */
export function hideZoomHint() {
  $('zoom-hint').classList.remove('show');
}

/** Wire zoom gestures on the board area once. */
export function bindZoom() {
  const wrap = $('board-wrap');
  wrap.addEventListener('pointerdown', onDown);
  wrap.addEventListener('pointermove', onMove);
  const end = (e) => {
    if (pointers.has(e.pointerId)) releaseIsTap(e);
  };
  wrap.addEventListener('pointercancel', end);
  wrap.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && end(e));
  wrap.addEventListener('wheel', onWheel, { passive: false });
  $('btn-fit').addEventListener('pointerdown', (e) => e.stopPropagation());
  $('btn-fit').addEventListener('click', fit);
}
