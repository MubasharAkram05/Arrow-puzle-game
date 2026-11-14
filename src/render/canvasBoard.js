/**
 * The game board, drawn on canvas (2D context) instead of SVG, so zooming never shows half-drawn arrows.
 *
 * - Three canvases. "full" holds every resting arrow of the whole board (plus MARGIN cells for arrows
 *   sliding out), drawn once per level and size at up to devicePixelRatio x the furthest zoom. When the
 *   board is zoomed in further than that bitmap allows, "sharp" holds the resting arrows of the visible
 *   part at full sharpness, on top. "fx" covers the visible part and holds only the arrows that move or
 *   change colour (escape slide, bump-back, press highlight, hint glow): it is the only canvas redrawn
 *   every frame, and it is small.
 * - A tap only redraws the box around the arrow that starts or stops moving on the resting canvases.
 * - During a pinch or pan the zoom is a CSS transform on the board card: the bitmaps are stretched,
 *   always complete. setBoardZoom() lays the layers out and redraws them once the gesture has ended
 *   (input/zoom.js waits ZOOM.sharpMs).
 */
import { CELL } from '../config.js';
import { $ } from '../ui/dom.js';
import { arrowGeometry } from './board.js';
import { arrowBox, drawArrow, drawDots, overlaps, withLengths } from './canvasDraw.js';

/** Extra cells drawn around the board for arrows that slide out. */
export const MARGIN = 1.5;
/**
 * Largest bitmaps (pixels), well below the canvas area limits of mobile browsers. The whole-board canvas
 * is mostly hidden under the sharp one when zoomed in, so it stays smaller (cheaper to composite).
 */
const FULL_PIXELS = 2e6;
const LAYER_PIXELS = 3e6;

const R = {
  full: null,
  sharp: null,
  fx: null,
  level: null,
  arrows: [],
  look: { m: null, colors: null, hintId: -1 }, // stroke metrics, theme colours, hinted arrow
  cellPx: 0, // css px per cell at zoom 1
  zoom: 1,
  maxZoom: 1, // furthest zoom of this level
  grid: true,
  moving: new Set(), // arrows drawn per frame instead of from the static canvas (they move)
  overlay: new Set(), // arrows drawn per frame over their static copy (only the colour changes)
  frame: 0, // pending requestAnimationFrame id
  lastRedrawMs: 0, // last full redraw of a static canvas
  pressAt: 0, // event time of a press whose highlight is not on screen yet
  lastPressMs: 0, // press -> highlight drawn
};

/** A layer: an on-screen canvas covering a board region (board units). */
function makeLayer(canvas) {
  return {
    canvas,
    ctx: canvas.getContext('2d'),
    scale: 0, // bitmap px per css px at zoom 1
    unit: 0, // css px per board unit
    k: 1, // bitmap px per board unit
    x0: 0,
    y0: 0,
    x1: 0,
    y1: 0,
    on: false,
    staticDirty: true,
    dirty: null, // part of the static canvas to redraw
  };
}

/** Theme colours from the CSS variables (the arrow style and dark mode set them). */
function readColors() {
  const cs = getComputedStyle(document.documentElement);
  const v = (name, fallback) => cs.getPropertyValue(name).trim() || fallback;
  return {
    arrow: v('--arrow', '#07193b'),
    outline: v('--arrow-outline', ''), // low contrast arrow color + board: draw an outline (src/game/looks.js)
    dot: v('--dot', '#dce1ec'),
    error: v('--error', '#ff473e'),
    primary: v('--primary', '#1877f2'),
  };
}

/** Board units -> bitmap for a layer. */
const layerTransform = (L, ctx) => ctx.setTransform(L.k, 0, 0, L.k, -L.x0 * L.k, -L.y0 * L.k);

/** The static canvases changed around one arrow (it left them or came back). */
function markDirty(a) {
  const b = a.box;
  for (const L of [R.full, R.sharp]) {
    const d = L.dirty;
    L.dirty = d
      ? { x0: Math.min(d.x0, b.x0), y0: Math.min(d.y0, b.y0), x1: Math.max(d.x1, b.x1), y1: Math.max(d.y1, b.y1) }
      : { ...b };
  }
}

/** Every static canvas must be redrawn (colours, grid or look changed). */
function allDirty() {
  if (!R.full) return;
  R.full.staticDirty = R.sharp.staticDirty = true;
  requestFrame();
}

/** Redraw a resting canvas: the dirty box only, or everything (dots plus every resting arrow). */
function drawStatic(L) {
  const t0 = performance.now();
  const ctx = L.ctx;
  const full = L.staticDirty;
  const box = full ? L : L.dirty;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (full) ctx.clearRect(0, 0, L.canvas.width, L.canvas.height);
  layerTransform(L, ctx);
  if (!full) {
    ctx.beginPath();
    ctx.rect(box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0);
    ctx.clip();
    ctx.clearRect(box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0);
  }
  if (R.grid) drawDots(ctx, R.level, R.look.m.dot, R.look.colors.dot, box);
  for (const a of R.arrows) if (!a.escaped && !R.moving.has(a) && overlaps(a.box, box)) drawArrow(ctx, a, R.look);
  ctx.restore();
  if (full) R.lastRedrawMs = performance.now() - t0;
  L.staticDirty = false;
  L.dirty = null;
}

/** The fx canvas: the hint glow and the arrows that move or change colour, nothing else. */
function drawFx(now) {
  const L = R.fx;
  const ctx = L.ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, L.canvas.width, L.canvas.height);
  layerTransform(L, ctx);
  const hint = R.arrows[R.look.hintId];
  if (hint && !hint.escaped) {
    const t = (now % 1800) / 900; // soft pulse, 0.9 s each way like the old CSS glow
    drawArrow(ctx, hint, R.look, 0.12 + 0.26 * (t < 1 ? t : 2 - t));
  }
  for (const a of R.overlay) if (!R.moving.has(a) && !a.escaped) drawArrow(ctx, a, R.look);
  for (const a of R.moving) drawArrow(ctx, a, R.look);
}

/** One frame. Keeps going while anything moves or a hint glows. */
function frame(now) {
  R.frame = 0;
  if (!R.full || !R.level || !R.full.scale) return;
  if (R.full.staticDirty || R.full.dirty) drawStatic(R.full);
  if (R.sharp.on && (R.sharp.staticDirty || R.sharp.dirty)) drawStatic(R.sharp);
  drawFx(now);
  if (R.pressAt) {
    R.lastPressMs = performance.now() - R.pressAt;
    R.pressAt = 0;
  }
  const hint = R.arrows[R.look.hintId];
  if (R.moving.size || (hint && !hint.escaped)) requestFrame();
}

/** Ask for a frame (at most one pending). */
export function requestFrame() {
  if (!R.frame) R.frame = requestAnimationFrame(frame);
}

/** Give a layer a board region and a bitmap scale; a new bitmap means a full redraw. */
function placeLayer(L, x0, y0, x1, y1, scale) {
  const unit = R.cellPx / CELL; // css px per board unit
  const w = (x1 - x0) * unit;
  const h = (y1 - y0) * unit;
  const bw = Math.max(1, Math.round(w * scale));
  const bh = Math.max(1, Math.round(h * scale));
  const same = L.x0 === x0 && L.y0 === y0 && L.x1 === x1 && L.y1 === y1 && L.unit === unit;
  if (same && L.canvas.width === bw && L.canvas.height === bh) return;
  Object.assign(L, { x0, y0, x1, y1, unit, scale, k: unit * scale });
  L.canvas.width = bw;
  L.canvas.height = bh;
  Object.assign(L.canvas.style, { width: `${w}px`, height: `${h}px`, left: `${x0 * unit}px`, top: `${y0 * unit}px` });
  L.staticDirty = true;
}

/** Bitmap scale a layer covering this many css px may have. */
const scaleFor = (want, cssArea, max = LAYER_PIXELS) => Math.min(want, Math.sqrt(max / cssArea));

/** Lay out both layers for the current size, zoom and visible area, then draw. */
function layout() {
  if (!R.level || !R.cellPx) return;
  const { rows, cols } = R.level;
  const pad = MARGIN * CELL;
  const unit = R.cellPx / CELL;
  const want = (window.devicePixelRatio || 1) * R.zoom;
  const F = R.full;
  const fx1 = cols * CELL + pad;
  const fy1 = rows * CELL + pad;
  // the whole board is drawn once per level and size, as sharp as the furthest zoom allows (within
  // LAYER_PIXELS), so zooming never reallocates it
  const fs = scaleFor((window.devicePixelRatio || 1) * R.maxZoom, (fx1 + pad) * (fy1 + pad) * unit * unit, FULL_PIXELS);
  placeLayer(F, -pad, -pad, fx1, fy1, fs);
  // the visible part of the board (plus a little): the sharp resting layer when needed, and fx
  const S = R.sharp;
  const board = $('board').getBoundingClientRect();
  const view = $('board-wrap').getBoundingClientRect();
  let vis = [-pad, -pad, fx1, fy1];
  if (board.width > 0) {
    const u = (cols * CELL) / board.width; // board units per screen px
    const mx = (view.width * u) / 10;
    const my = (view.height * u) / 10;
    vis = [
      Math.max(-pad, Math.floor((view.left - board.left) * u - mx)),
      Math.max(-pad, Math.floor((view.top - board.top) * u - my)),
      Math.min(fx1, Math.ceil((view.right - board.left) * u + mx)),
      Math.min(fy1, Math.ceil((view.bottom - board.top) * u + my)),
    ];
  }
  const visScale = scaleFor(want, (vis[2] - vis[0]) * (vis[3] - vis[1]) * unit * unit);
  S.on = F.scale < want * 0.95 && board.width > 0;
  S.canvas.style.display = S.on ? '' : 'none';
  if (S.on) placeLayer(S, ...vis, visScale);
  placeLayer(R.fx, ...vis, visScale);
  requestFrame();
}

/**
 * Show a level. Each live arrow gets its geometry (a.geom) for drawing, hit tests and effects.
 * @param {object} level
 * @param {object[]} arrows live arrows (state.arrows)
 * @param {ReturnType<import('./board.js').strokeMetrics> & {head?: string}} m
 */
export function mountBoard(level, arrows, m) {
  if (!R.full) {
    R.full = makeLayer($('board-canvas'));
    R.sharp = makeLayer($('board-sharp'));
    R.fx = makeLayer($('board-fx'));
    // dark mode, arrow style or board colours changed: redraw with the new colours
    new MutationObserver(() => refreshBoardLook()).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-style', 'data-board', 'data-outline'],
    });
  }
  R.level = level;
  R.arrows = arrows;
  R.look = { m, colors: readColors(), hintId: -1 };
  R.moving.clear();
  R.overlay.clear();
  for (const L of [R.full, R.sharp, R.fx]) Object.assign(L, { x1: 0, dirty: null, staticDirty: true, scale: 0 });
  for (const a of arrows) {
    a.geom = withLengths(arrowGeometry(a, m, level.rows, level.cols));
    a.box = arrowBox(a);
  }
  layout();
}

/**
 * Board size on screen at zoom 1.
 * @param {number} cellPx css px per cell
 */
export function setBoardCell(cellPx) {
  R.cellPx = cellPx;
  layout();
}

/**
 * Redraw sharp for a zoom scale and the area now in view (after a pinch, pan or wheel zoom ended).
 * @param {number} s
 * @param {number} [max] furthest zoom of this level (given when a level starts)
 */
export function setBoardZoom(s, max) {
  R.zoom = s;
  if (max) R.maxZoom = max;
  layout();
}

/** Theme or arrow style changed: read the colours again and redraw. */
export function refreshBoardLook() {
  if (!R.level) return;
  R.look = { ...R.look, colors: readColors() };
  allDirty();
}

/** @param {boolean} on show the dot grid */
export function setBoardGrid(on) {
  R.grid = on;
  allDirty();
}

/**
 * Start drawing an arrow every frame.
 * @param {object} a
 * @param {boolean} [colourOnly] it only changes colour (press, hint): drawn over its static copy, so no
 *   static canvas changes and the feedback shows on the very next frame
 */
export function startMoving(a, colourOnly = false) {
  if (colourOnly) R.overlay.add(a);
  else if (!R.moving.has(a)) {
    R.moving.add(a);
    markDirty(a);
  }
  requestFrame();
}

/**
 * Back to the static canvas (or gone, when it escaped).
 * @param {object} a
 */
export function stopMoving(a) {
  R.overlay.delete(a);
  if (R.moving.delete(a)) markDirty(a);
  requestFrame();
}

/** @param {number} id arrow to glow (-1 for none) */
export function setHintArrow(id) {
  const old = R.arrows[R.look.hintId];
  R.look = { ...R.look, hintId: id };
  if (old && old.id !== id && !old.pressed) R.overlay.delete(old);
  if (id !== -1) startMoving(R.arrows[id], true);
  requestFrame();
}

/**
 * Screen point of an arrow's head (hint hand, panning to a hint).
 * @param {object} a
 * @returns {{x: number, y: number}}
 */
export function headClientPoint(a) {
  const rect = $('board').getBoundingClientRect();
  const scale = rect.width / (R.level.cols * CELL);
  return { x: rect.left + a.geom.hx * scale, y: rect.top + a.geom.hy * scale };
}

/**
 * A press highlight was asked for at this event time (measured until it is drawn).
 * @param {number} t event timeStamp
 */
export function notePress(t) {
  R.pressAt = t;
}

/** @returns {{redrawMs: number, pressMs: number}} last full static redraw and last press-to-highlight time */
export const boardTimings = () => ({ redrawMs: R.lastRedrawMs, pressMs: R.lastPressMs });

// dev builds: browser checks read the timings without importing a second copy of this module
if (import.meta.env?.DEV && typeof window !== 'undefined') window.__boardTimings = boardTimings;
