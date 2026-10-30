/**
 * Pinch to zoom and drag to pan the board. The board card gets a CSS transform
 * (translate + scale), so taps, the hint hand and effects keep working through getBoundingClientRect.
 */
import { ZOOM } from '../config.js';
import { onMinimapTap, setMinimapLevel, updateMinimap } from '../render/minimap.js';
import { placePointer } from '../render/pointer.js';
import { $ } from '../ui/dom.js';
import { hideZoomGuide, notePinch } from '../ui/zoomGuide.js';
import { maxScaleFor, startScale, translateFor } from './zoomMath.js';

const pointers = new Map(); // pointerId -> {x, y}
let view = { s: 1, x: 0, y: 0 };
let maxScale = 1;
let gesture = null; // {kind: 'pinch'|'pan', ...start values}
let lastEmptyTap = 0;

/** Apply the current view to the board card, then follow it with the hand and the mini-map. */
function apply() {
  $('board-card').style.transform = view.s === 1 ? '' : `translate(${view.x}px, ${view.y}px) scale(${view.s})`;
  $('board-wrap').classList.toggle('zoomed', view.s > 1);
  $('btn-fit').hidden = view.s <= 1;
  updateMinimap(view.s > 1.01 ? visibleArea() : null);
  placePointer();
}

/** Part of the board on screen, as fractions of the board (for the mini-map). */
function visibleArea() {
  const r = $('board-card').getBoundingClientRect();
  const w = $('board-wrap').getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const left = Math.max(r.left, w.left);
  const top = Math.max(r.top, w.top);
  const right = Math.min(r.right, w.right);
  const bottom = Math.min(r.bottom, w.bottom);
  return {
    x: (left - r.left) / r.width,
    y: (top - r.top) / r.height,
    w: Math.max(0, right - left) / r.width,
    h: Math.max(0, bottom - top) / r.height,
  };
}

/** Centre of the visible board area (the board area minus the button row). */
function viewCentre() {
  const w = $('board-wrap').getBoundingClientRect();
  return { x: w.left + w.width / 2, y: w.top + w.height / 2 };
}

/**
 * Pan so a board point (fractions 0-1) is in the middle of the view.
 * @param {number} fx
 * @param {number} fy
 */
function centreOn(fx, fy) {
  const card = $('board-card');
  const q = { x: (fx - 0.5) * card.offsetWidth, y: (fy - 0.5) * card.offsetHeight };
  const o = origin();
  const t = translateFor(q, viewCentre(), { x: o.cx, y: o.cy }, view.s);
  view.x = t.x;
  view.y = t.y;
  clampView();
  apply();
}

/**
 * Pan (keeping the zoom) so a screen point is well inside the view, e.g. a hinted arrow.
 * @param {number} x client x
 * @param {number} y client y
 */
export function ensureVisible(x, y) {
  if (view.s <= 1) return;
  const w = $('board-wrap').getBoundingClientRect();
  const m = Math.min(w.width, w.height) * 0.2;
  if (x > w.left + m && x < w.right - m && y > w.top + m && y < w.bottom - m) return;
  const r = $('board-card').getBoundingClientRect();
  centreOn((x - r.left) / r.width, (y - r.top) / r.height);
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
 * Start view for a new level: dense boards open zoomed in on the centre (cells about 30px),
 * small boards open fully fitted.
 * @param {number} cellPx on-screen cell size when the whole board fits
 * @param {object} [level] level, for the mini-map outline
 * @returns {boolean} true when the level starts zoomed
 */
export function resetZoom(cellPx, level) {
  maxScale = maxScaleFor(cellPx);
  view = { s: startScale(cellPx), x: 0, y: 0 };
  pointers.clear();
  gesture = null;
  if (level) setMinimapLevel(level);
  apply();
  return view.s > 1;
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
  hideZoomGuide(); // the guide fades on the first touch
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
  if (pointers.size === 2 && canZoom()) {
    const p = pinchInfo();
    gesture = { kind: 'pinch', ...p, from: { ...view } };
    notePinch();
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

/** Back to the whole board (also used before a hint so the highlight is on screen). */
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
  onMinimapTap(centreOn);
}
