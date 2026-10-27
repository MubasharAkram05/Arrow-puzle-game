import { CELL, MAX_CELL_PX } from '../config.js';
import { DIRS } from '../engine/index.js';
import { state } from '../game/state.js';
import { $, svgEl } from '../ui/dom.js';
import { placePointer } from './pointer.js';

/**
 * Stroke and head sizes in SVG units. Thinner on big boards so lines never merge.
 * @param {number} cols
 * @param {number} rows
 * @returns {{sw: number, hw: number, back: number, tip: number}}
 */
export function strokeMetrics(cols, rows) {
  const n = Math.max(cols, rows);
  const sw = n <= 6 ? 17 : n <= 9 ? 16 : n <= 12 ? 15 : 14;
  const k = sw / 16;
  return { sw, hw: 24 * k, back: 14 * k, tip: 22 * k };
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

/** Dot grid as one path (only cells inside the mask). */
function dotsPath(level) {
  let d = '';
  for (let r = 0; r < level.rows; r++) {
    for (let c = 0; c < level.cols; c++) {
      if (level.mask && !level.mask[r * level.cols + c]) continue;
      d += `M${(c + 0.5) * CELL - 4.5} ${(r + 0.5) * CELL}a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0 -9 0`;
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
 * @returns {ReturnType<typeof strokeMetrics>}
 */
export function drawArrows(svg, arrows, level, withDots) {
  const { rows, cols } = level;
  const m = strokeMetrics(cols, rows);
  svg.textContent = '';
  svg.setAttribute('viewBox', `0 0 ${cols * CELL} ${rows * CELL}`);
  if (withDots) svg.appendChild(svgEl('path', { class: 'dots', d: dotsPath(level) }));
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
    const head = svgEl('polygon', {
      class: 'head',
      'stroke-width': 3.5,
      points: `${-m.hw},${m.back} ${m.hw},${m.back} 0,${-m.tip}`,
    });
    el.append(shaft, head);
    layer.appendChild(el);
    Object.assign(a, { el, shaft, headEl: head, geom: g });
    setArrowOffset(a, 0);
  }
  svg.appendChild(layer);
  return m;
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

/** Fit the board svg into the free space and keep the hand overlay in place. */
export function layoutBoard() {
  if (!state.level || !$('screen-game').classList.contains('active')) return;
  const wrap = $('board-wrap');
  const cs = getComputedStyle(wrap);
  const pad = 2 * parseFloat(getComputedStyle($('board-card')).paddingLeft);
  const w = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - pad;
  const h = wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - pad;
  const { rows, cols } = state.level;
  const cell = Math.max(8, Math.min(w / cols, h / rows, MAX_CELL_PX));
  const svg = $('board');
  svg.setAttribute('width', Math.floor(cell * cols));
  svg.setAttribute('height', Math.floor(cell * rows));
  placePointer();
}
