/**
 * Arrow color + board look (3.27.0). Pure: no DOM. Tested in tests/arrowLooks.test.js.
 * An arrow style only sets the arrow color; the board sets the background (BOARD_LOOKS). When the two have a
 * contrast below MIN_CONTRAST (WCAG ratio), the arrows get an outline in the color that stands out most from the
 * board, so arrows are never invisible.
 */
import { BOARD_LOOKS, SHOP_STYLES } from '../config.js';

/** Below this contrast between arrow and board, arrows get an outline. */
export const MIN_CONTRAST = 3;
const OUTLINE_LIGHT = '#ffffff';
const OUTLINE_DARK = '#0b1020';

/** '#rrggbb' -> [r, g, b] 0-255. */
function rgb(hex) {
  const h = String(hex).replace('#', '');
  const n = parseInt(h.length === 3 ? [...h].map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * WCAG relative luminance (0 black - 1 white).
 * @param {string} hex
 * @returns {number}
 */
export function luminance(hex) {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG contrast ratio between two colors (1 to 21).
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** A board's look for a theme (falls back to Plain). */
export function boardLook(boardId, theme) {
  const b = BOARD_LOOKS[boardId] || BOARD_LOOKS.plain;
  return b[theme === 'dark' ? 'dark' : 'light'];
}

/**
 * The arrow color an arrow style draws on a board base color. Classic Navy picks navy or its light shade,
 * whichever is easier to see on the board.
 * @param {string} styleId
 * @param {string} base board base color
 * @returns {string}
 */
export function arrowColorOn(styleId, base) {
  const s = SHOP_STYLES.find((x) => x.id === styleId) || SHOP_STYLES[0];
  if (!s.light) return s.color;
  return contrast(s.color, base) >= contrast(s.light, base) ? s.color : s.light;
}

/**
 * Everything needed to draw arrows of a style on a board in a theme.
 * @param {string} styleId arrow color id
 * @param {string} boardId
 * @param {'light'|'dark'} theme
 * @returns {{fill: string, dot: string, base: string, arrow: string, ratio: number, outline: string|null}}
 *   outline: the outline color when the contrast is below MIN_CONTRAST, else null
 */
export function lookFor(styleId, boardId, theme) {
  const b = boardLook(boardId, theme);
  const arrow = arrowColorOn(styleId, b.base);
  const ratio = contrast(arrow, b.base);
  const outline =
    ratio >= MIN_CONTRAST
      ? null
      : contrast(OUTLINE_LIGHT, b.base) >= contrast(OUTLINE_DARK, b.base)
        ? OUTLINE_LIGHT
        : OUTLINE_DARK;
  return { ...b, arrow, ratio, outline };
}

/**
 * The look in both themes as CSS custom properties (previews pick the right one with [data-theme]).
 * @param {string} styleId
 * @param {string} boardId
 * @returns {string} style attribute value
 */
export function lookVars(styleId, boardId) {
  return ['light', 'dark']
    .map((t) => {
      const k = t[0];
      const l = lookFor(styleId, boardId, t);
      return `--${k}-fill:${l.fill};--${k}-dot:${l.dot};--${k}-arrow:${l.arrow};--${k}-out:${l.outline || 'transparent'}`;
    })
    .join(';');
}
