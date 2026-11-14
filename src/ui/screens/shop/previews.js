/**
 * Live previews for shop cards. Animated previews use transform/opacity only and stop with reduced motion.
 */
import { headShape } from '../../../render/board.js';
import { avatarSVG } from '../../components/avatars.js';
import { lookVars } from '../../../game/looks.js';
import { state } from '../../../game/state.js';

const DOTS = [12, 36, 60, 84, 108]
  .flatMap((x) => [12, 36, 60].map((y) => `<circle cx="${x}" cy="${y}" r="1.8"/>`))
  .join('');

/**
 * One sample arrow: an outline pass (only visible when the combination needs it) under the arrow itself.
 * @param {string} d shaft path
 * @param {number} x head x
 * @param {number} y head y
 * @param {number} rot head rotation (0 up, 90 right, 180 down)
 * @param {string} head head shape id
 * @param {{hw: number, back: number, tip: number, sw: number}} m size
 */
function sampleArrow(d, x, y, rot, head, m) {
  const [tag, attrs] = headShape({ ...m, head });
  const sw = Number(attrs['stroke-width']) || 1;
  const svg = (extra) =>
    `<${tag} ${Object.entries({ ...attrs, 'stroke-width': sw + extra })
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ')} transform="translate(${x} ${y}) rotate(${rot})" stroke-linejoin="round"/>`;
  return (
    `<g class="p-out"><path d="${d}" stroke-width="${m.sw + 4}"/>${svg(4)}</g>` +
    `<g class="p-arrow"><path d="${d}" stroke-width="${m.sw}"/>${svg(0)}</g>`
  );
}

/**
 * A mini game board: the board's background, the dot grid and sample arrows in the arrow color, with the equipped
 * head. Colors come from looks.js as CSS variables for both themes (see .look-prev in shopPreviews.css).
 * @param {string} styleId arrow color
 * @param {string} boardId
 * @param {string} body sample arrows
 */
const lookPreview = (styleId, boardId, body) =>
  `<span class="look-prev" style="${lookVars(styleId, boardId)}"><svg viewBox="0 0 120 72" aria-hidden="true"><g class="p-dots">${DOTS}</g>${body}</svg></span>`;

/** Three sample arrows (an L, a tall one, a short one) with a head shape. */
function sampleArrows(head) {
  const m = { hw: 7, back: 4, tip: 6, sw: 5 };
  return (
    sampleArrow('M12 60V36h40', 54, 36, 90, head, m) +
    sampleArrow('M84 62V24', 84, 20, 0, head, m) +
    sampleArrow('M20 12h22', 46, 12, 90, head, m)
  );
}

const equipped = () => state.cosmetics.equipped;

/** @returns {string} a given arrow color on a given board (the Starter Pack card) */
export const lookPreviewOf = (styleId, boardId) => lookPreview(styleId, boardId, sampleArrows(equipped().head));

/** @returns {string} arrow color preview: arrows in that color on the player's board */
export const stylePreview = (id) => lookPreview(id, equipped().board, sampleArrows(equipped().head));

/** @returns {string} accent colour swatch */
export const themePreview = (color) => `<span class="theme-swatch" style="--sw:${color}"><i></i><i></i><i></i></span>`;

/** @returns {string} board preview: that board with the player's arrow color and head */
export const boardPreview = (id) => lookPreview(state.style, id, sampleArrows(equipped().head));

/**
 * Arrowhead preview: one arrow with that head, large, on the player's board in the player's arrow color.
 * @param {string} shape
 * @returns {string}
 */
export function headPreview(shape) {
  return lookPreview(
    state.style,
    equipped().board,
    sampleArrow('M16 36h66', 92, 36, 90, shape, { hw: 13, back: 7, tip: 11, sw: 7 }),
  );
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
