import { BASE_CELL_PX, CELL, HEAD_L_PX, HEAD_W_PX, SMALL_BOARD_PX, STROKE_PX } from '../config.js';
import { DIRS } from '../engine/index.js';
import { state } from '../game/state.js';
import { $, svgEl } from '../ui/dom.js';
import { placePointer } from './pointer.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Stroke and head sizes in SVG units for a given on-screen cell size.
 * Lines and heads keep a constant pixel size, clamped so they never merge on dense boards.
 * @param {number} cellPx
 * @param {number} [k] size factor (the victory preview draws thinner lines)
 * @returns {{sw: number, hw: number, back: number, tip: number, dot: number}}
 */
export function strokeMetrics(cellPx, k = 1) {
  const u = (CELL / cellPx) * k;
  // the upper limits keep lines thin on dense boards (cells under ~16px), like the reference
  const len = clamp(HEAD_L_PX * u, 36, 60);
  return {
    sw: clamp(STROKE_PX * u, 9, 22),
    hw: clamp((HEAD_W_PX / 2) * u, 18, 34),
    back: len * 0.45,
    tip: len * 0.55,
    dot: clamp(1.6 * u, 3, 9),
  };
}

/**
 * On-screen cell size for a board inside a box: compact for small boards, shrinks to fit big ones.
 * @param {number} rows
 * @param {number} cols
 * @param {number} w available width (px)
 * @param {number} h available height (px)
 * @returns {number}
 */
export function cellSizeFor(rows, cols, w, h) {
  const scale = clamp(window.innerWidth / 390, 1, 1.6); // tablets get a slightly bigger board
  const target = Math.max(BASE_CELL_PX, SMALL_BOARD_PX / Math.max(rows, cols)) * scale;
  return Math.max(6, Math.min(target, w / cols, h / rows));
}

/**
 * Polyline (tail -> head -> far outside) and lengths used to draw and animate an arrow.
 * @param {{dir: number, path: {r: number, c: number}[]}} arrow
 * @param {ReturnType<typeof strokeMetrics>} m
 * @param {number} rows
 * @param {number} cols
 * @returns {object}
 */
export function arrowGeometry(arrow, m, rows, cols) {
  const pts = [];
  for (let i = arrow.path.length - 1; i >= 0; i--) {
    pts.push({ x: (arrow.path[i].c + 0.5) * CELL, y: (arrow.path[i].r + 0.5) * CELL });
  }
  const d = DIRS[arrow.dir];
  const head = pts[pts.length - 1];
  const far = (rows + cols + arrow.path.length + 2) * CELL;
  pts.push({ x: head.x + d.dc * far, y: head.y + d.dr * far });
  const h = arrow.path[0];
  const toEdge = d.dr === -1 ? h.r : d.dr === 1 ? rows - 1 - h.r : d.dc === -1 ? h.c : cols - 1 - h.c;
  return {
    pts,
    d: 'M' + pts.map((p) => `${p.x} ${p.y}`).join(' L'),
    dashLen: (arrow.path.length - 1) * CELL - m.back + 2,
    hx: head.x,
    hy: head.y,
    dx: d.dc,
    dy: d.dr,
    rot: d.rot,
    toEdge,
  };
}

/**
 * Arrowhead element for the equipped shape (m.head). Only the drawing changes:
 * hit testing uses the arrow path, so every shape taps the same.
 * @param {ReturnType<typeof strokeMetrics> & {head?: string}} m
 * @returns {SVGElement}
 */
export function headElement(m) {
  const { hw, back, tip, sw } = m;
  switch (m.head) {
    case 'chevron':
      return svgEl('polygon', {
        class: 'head',
        'stroke-width': sw * 0.25,
        points: `${-hw},${back} 0,${-tip} ${hw},${back} 0,${back * 0.1}`,
      });
    case 'round':
      // a smaller triangle with a thick round-joined outline reads as a rounded head
      return svgEl('polygon', {
        class: 'head',
        'stroke-width': sw * 0.9,
        points: `${-hw * 0.75},${back * 0.8} ${hw * 0.75},${back * 0.8} 0,${-tip * 0.8}`,
      });
    case 'feather':
      return svgEl('path', {
        class: 'head',
        'stroke-width': sw * 0.2,
        d: `M0 ${-tip * 1.15}Q${hw} ${back * 0.1} 0 ${back * 1.2}Q${-hw} ${back * 0.1} 0 ${-tip * 1.15}Z`,
      });
    default:
      return svgEl('polygon', {
        class: 'head',
        'stroke-width': sw * 0.25,
        points: `${-hw},${back} ${hw},${back} 0,${-tip}`,
      });
  }
}

/** Dot grid as one path (only cells inside the mask). */
function dotsPath(level, r0) {
  let d = '';
  for (let r = 0; r < level.rows; r++) {
    for (let c = 0; c < level.cols; c++) {
      if (level.mask && !level.mask[r * level.cols + c]) continue;
      d += `M${(c + 0.5) * CELL - r0} ${(r + 0.5) * CELL}a${r0} ${r0} 0 1 0 ${2 * r0} 0a${r0} ${r0} 0 1 0 ${-2 * r0} 0`;
    }
  }
  return d;
}

/**
 * Draw a level into one svg: optional dot grid plus one <g> per arrow.
 * Attaches el/shaft/headEl/geom to each arrow object.
 * @param {SVGSVGElement} svg
 * @param {object[]} arrows
 * @param {object} level
 * @param {boolean} withDots
 * @param {ReturnType<typeof strokeMetrics>} m sizes from strokeMetrics(cellPx)
 */
export function drawArrows(svg, arrows, level, withDots, m) {
  const { rows, cols } = level;
  svg.textContent = '';
  svg.setAttribute('viewBox', `0 0 ${cols * CELL} ${rows * CELL}`);
  if (withDots) svg.appendChild(svgEl('path', { class: 'dots', d: dotsPath(level, m.dot) }));
  const layer = svgEl('g');
  for (const a of arrows) {
    const g = arrowGeometry(a, m, rows, cols);
    const el = svgEl('g', { class: 'arrow' });
    const shaft = svgEl('path', {
      class: 'shaft',
      d: g.d,
      'stroke-width': m.sw,
      'stroke-dasharray': `${g.dashLen} 1000000`,
      'stroke-dashoffset': 0,
    });
    const head = headElement(m);
    el.append(shaft, head);
    layer.appendChild(el);
    Object.assign(a, { el, shaft, headEl: head, geom: g });
    setArrowOffset(a, 0);
  }
  svg.appendChild(layer);
}

/**
 * Move an arrow s units along its own path (snake movement).
 * @param {object} a live arrow
 * @param {number} s
 */
export function setArrowOffset(a, s) {
  const g = a.geom;
  a.shaft.setAttribute('stroke-dashoffset', -s);
  a.headEl.setAttribute('transform', `translate(${g.hx + g.dx * s} ${g.hy + g.dy * s}) rotate(${g.rot})`);
}

/**
 * On-screen cell size for the current level in the game screen.
 * @returns {number}
 */
export function boardCellPx() {
  const wrap = $('board-wrap');
  const cs = getComputedStyle(wrap);
  const pad = 2 * parseFloat(getComputedStyle($('board-card')).paddingLeft);
  const w = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - pad;
  const h = wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - pad;
  return cellSizeFor(state.level.rows, state.level.cols, w, h);
}

/** Fit the board svg into the free space and keep the hand overlay in place. */
export function layoutBoard() {
  if (!state.level || !$('screen-game').classList.contains('active')) return;
  const { rows, cols } = state.level;
  const cell = boardCellPx();
  const svg = $('board');
  svg.setAttribute('width', Math.floor(cell * cols));
  svg.setAttribute('height', Math.floor(cell * rows));
  placePointer();
}
