/**
 * Mini-map shown while zoomed: the board's outline (or shape) with a rectangle for the visible part.
 * Tapping it jumps there.
 */
import { $ } from '../ui/dom.js';

const BOX = 64; // px, longest side

/**
 * Draw the board outline for a new level.
 * @param {{rows: number, cols: number, mask: number[]|null}} level
 */
export function setMinimapLevel(level) {
  const { rows, cols, mask } = level;
  const k = BOX / Math.max(rows, cols);
  const w = Math.round(cols * k);
  const h = Math.round(rows * k);
  let shape = `<rect width="${cols}" height="${rows}" rx="${Math.max(rows, cols) * 0.04}"/>`;
  if (mask) {
    let d = '';
    for (let i = 0; i < mask.length; i++) if (mask[i]) d += `M${i % cols} ${Math.floor(i / cols)}h1v1h-1z`;
    shape = `<path d="${d}"/>`;
  }
  const el = $('minimap');
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  el.innerHTML = `<svg viewBox="0 0 ${cols} ${rows}" preserveAspectRatio="none" aria-hidden="true">${shape}</svg><i class="mm-view"></i>`;
}

/**
 * Show the visible part (fractions of the board, 0-1) or hide the mini-map (null).
 * @param {{x: number, y: number, w: number, h: number}|null} vis
 */
export function updateMinimap(vis) {
  const el = $('minimap');
  el.hidden = !vis;
  if (!vis) return;
  const v = el.querySelector('.mm-view');
  if (!v) return;
  v.style.left = `${vis.x * 100}%`;
  v.style.top = `${vis.y * 100}%`;
  v.style.width = `${vis.w * 100}%`;
  v.style.height = `${vis.h * 100}%`;
}

/**
 * Call fn(fx, fy) with the tapped point as board fractions.
 * @param {(fx: number, fy: number) => void} fn
 */
export function onMinimapTap(fn) {
  const el = $('minimap');
  el.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    const r = el.getBoundingClientRect();
    fn((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  });
  el.addEventListener('pointerup', (e) => e.stopPropagation());
}
