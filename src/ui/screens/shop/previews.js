/**
 * Live previews for shop cards. Animated previews use transform/opacity only and stop with reduced motion.
 */
import { headElement } from '../../../render/board.js';
import { avatarSVG } from '../../components/avatars.js';
import { PREVIEW_SVG } from '../../components/stylePreview.js';

/** Mini board drawn with the board's own arrow/dot colours. */
const MINI_BOARD =
  '<svg viewBox="0 0 120 72" aria-hidden="true">' +
  '<circle cx="20" cy="16" r="2" fill="var(--dot)"/><circle cx="100" cy="58" r="2" fill="var(--dot)"/><circle cx="60" cy="16" r="2" fill="var(--dot)"/>' +
  '<path d="M20 58V36h44V20h24" fill="none" stroke="var(--arrow)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<path d="M88 12l10 8-10 8z" fill="var(--arrow)" stroke="var(--arrow)" stroke-width="2.5" stroke-linejoin="round"/>' +
  '<path d="M44 58h40" fill="none" stroke="var(--arrow)" stroke-width="5" stroke-linecap="round"/>' +
  '</svg>';

/** @returns {string} arrow style preview */
export const stylePreview = (id) => `<span class="style-swatch" data-preview="${id}">${PREVIEW_SVG}</span>`;

/** @returns {string} accent colour swatch */
export const themePreview = (color) => `<span class="theme-swatch" style="--sw:${color}"><i></i><i></i><i></i></span>`;

/** @returns {string} board background preview */
export const boardPreview = (id) => `<span class="board-swatch" data-board-preview="${id}">${MINI_BOARD}</span>`;

/**
 * Arrow with the given head shape (uses the game's own head drawing).
 * @param {string} shape
 * @returns {string}
 */
export function headPreview(shape) {
  const head = headElement({ hw: 11, back: 6, tip: 9, sw: 6, head: shape });
  head.setAttribute('transform', 'translate(84 36) rotate(90)');
  head.setAttribute('fill', 'currentColor');
  head.setAttribute('stroke', 'currentColor');
  head.setAttribute('stroke-linejoin', 'round');
  return `<svg class="head-prev" viewBox="0 0 120 72" aria-hidden="true"><path d="M22 36h56" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>${head.outerHTML}</svg>`;
}

/**
 * Looping escape-effect preview: an arrow slides out with the effect's trail (CSS only).
 * @param {string} id effect id
 * @returns {string}
 */
export function effectPreview(id) {
  return `<span class="fx-prev fx-${id}" aria-hidden="true"><span class="fx-trail"><i></i><i></i><i></i><i></i></span><span class="fx-arrow"></span></span>`;
}

/** Confetti pieces drawn in each style. */
const CONFETTI = {
  classic:
    '<rect x="20" y="14" width="12" height="7" fill="#F7A6DA" transform="rotate(20 26 17)"/><rect x="70" y="40" width="12" height="7" fill="#7FE7A6" transform="rotate(-25 76 43)"/><rect x="50" y="20" width="10" height="6" fill="#6FE2F2"/><path d="M90 18a6 6 0 0 1 10 4" stroke="#C69BF7" stroke-width="2.5" fill="none"/>',
  hearts:
    '<path d="M30 30c-8-6-12-14-4-16 3 0 4 3 4 3s1-3 4-3c8 2 4 10-4 16z" fill="#FF4F7B"/><path d="M80 50c-6-4-9-10-3-12 2 0 3 2 3 2s1-2 3-2c6 2 3 8-3 12z" fill="#FF8FAB"/>',
  coins:
    '<circle cx="34" cy="26" r="9" fill="#F7B500"/><circle cx="34" cy="26" r="5" fill="none" stroke="#FFE07A" stroke-width="2"/><circle cx="82" cy="46" r="7" fill="#F7B500"/><circle cx="82" cy="46" r="4" fill="none" stroke="#FFE07A" stroke-width="1.5"/>',
  stars:
    '<path d="m34 14 3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#FFD54A"/><path d="m82 38 2 5 5 .5-4 3.5 1 5-4-2.5-4 2.5 1-5-4-3.5 5-.5z" fill="#FFFFFF" stroke="#E0C200"/>',
};

/** @returns {string} confetti style preview */
export const confettiPreview = (id) =>
  `<svg class="confetti-prev" viewBox="0 0 120 72" aria-hidden="true">${CONFETTI[id] || CONFETTI.classic}</svg>`;

/** @returns {string} avatar preview (optionally with a frame) */
export const avatarPreview = (i, frame = 'none') =>
  `<span class="frame-preview" data-frame="${frame}">${avatarSVG(i)}</span>`;
