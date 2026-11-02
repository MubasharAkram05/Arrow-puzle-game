/**
 * Monthly trophy artwork (original SVG, 3.16.0): twelve different trophies, one per month, on a shared plinth.
 * The trophy fills with colour from the bottom as the month's claimed days grow; a complete month is full
 * colour with a moving shine. Future months are pale grey.
 */

/** Plinth and stem shared by every trophy (viewBox 0 0 60 80). */
const PLINTH = '<rect x="13" y="68" width="34" height="8" rx="2.5"/><rect x="19" y="61" width="22" height="8" rx="2"/>';
const STEM = '<rect x="27" y="47" width="6" height="15" rx="2"/>';
/** Side handles for the cup-style trophies. */
const HANDLES =
  '<path d="M13 16 C4 16 4 32 14 34" fill="none" stroke-width="4" stroke-linecap="round"/><path d="M47 16 C56 16 56 32 46 34" fill="none" stroke-width="4" stroke-linecap="round"/>';

/** Twelve trophy tops (January to December). */
const TOPS = [
  // January: classic cup with handles
  `${HANDLES}<path d="M13 10 H47 V24 C47 37 39 46 30 46 C21 46 13 37 13 24 Z"/>`,
  // February: heart
  '<path d="M30 46 C18 37 9 30 9 20 C9 13 14 9 20 9 C25 9 28 12 30 15 C32 12 35 9 40 9 C46 9 51 13 51 20 C51 30 42 37 30 46 Z"/>',
  // March: tall vase with handles
  `${HANDLES}<path d="M20 6 H40 L38 12 C44 20 44 36 34 46 H26 C16 36 16 20 22 12 Z"/>`,
  // April: wide bowl
  '<path d="M6 18 H54 C54 33 43 44 30 44 C17 44 6 33 6 18 Z"/><rect x="10" y="13" width="40" height="5" rx="2.5"/>',
  // May: five-point star
  '<path d="M30 6 L35.5 19 L49.5 20 L39 29.5 L42.3 43.5 L30 36 L17.7 43.5 L21 29.5 L10.5 20 L24.5 19 Z"/>',
  // June: sun disc with rays
  '<circle cx="30" cy="26" r="13"/><path d="M30 4 V10 M30 42 V46 M8 26 H14 M46 26 H52 M14.5 10.5 L18.5 14.5 M41.5 37.5 L45.5 41.5 M45.5 10.5 L41.5 14.5 M18.5 37.5 L14.5 41.5" fill="none" stroke-width="4" stroke-linecap="round"/>',
  // July: goblet
  '<path d="M12 8 H48 L42 30 C39 40 35 46 30 46 C25 46 21 40 18 30 Z"/>',
  // August: plaque shield
  '<path d="M30 6 L50 12 V27 C50 37 41 43 30 47 C19 43 10 37 10 27 V12 Z"/>',
  // September: leaf
  '<path d="M30 46 C14 40 9 26 14 8 C30 9 46 18 46 34 C46 40 40 45 30 46 Z"/><path d="M30 46 C26 34 22 24 16 12" fill="none" stroke-width="2.5" stroke-linecap="round" class="tr-line"/>',
  // October: crown
  '<path d="M9 20 L19 28 L30 12 L41 28 L51 20 L47 44 H13 Z"/><circle cx="9" cy="18" r="3.5"/><circle cx="30" cy="10" r="3.5"/><circle cx="51" cy="18" r="3.5"/>',
  // November: gem
  '<path d="M18 9 H42 L52 21 L30 46 L8 21 Z"/><path d="M8 21 H52 M22 9 L18 21 L30 46 L42 21 L38 9" fill="none" stroke-width="1.8" class="tr-line"/>',
  // December: bell
  '<path d="M30 6 C40 6 45 14 45 25 C45 33 48 38 52 42 H8 C12 38 15 33 15 25 C15 14 20 6 30 6 Z"/><circle cx="30" cy="45" r="3.5"/>',
];

/** Fill colour of each month's trophy. */
export const TROPHY_HUES = Object.freeze([
  '#3b82f6',
  '#f43f5e',
  '#22a559',
  '#ec4899',
  '#f59e0b',
  '#f97316',
  '#ef4444',
  '#0ea5e9',
  '#84cc16',
  '#a855f7',
  '#14b8a6',
  '#6366f1',
]);

/**
 * Trophy SVG.
 * @param {import('../../game/trophies.js').Trophy} t
 * @param {number} year (for a unique clip id)
 * @param {string} [cls]
 * @returns {string}
 */
export function trophySVG(t, year, cls = '') {
  const shape = `${PLINTH}${STEM}${TOPS[t.month]}`;
  // the fill rises from the plinth's bottom (y 76) to the top of the tallest part (y 4)
  const h = 72 * (t.state === 'future' ? 0 : t.share);
  const id = `trf-${year}-${t.month}`;
  const shine =
    t.state === 'complete'
      ? `<rect class="tr-shine" x="-20" y="0" width="14" height="80" transform="skewX(-18)" clip-path="url(#${id}s)"/>`
      : '';
  return `<svg class="tr tr-${t.state} ${cls}" viewBox="0 0 60 80" style="--hue:${TROPHY_HUES[t.month]}" aria-hidden="true">
    <defs>
      <clipPath id="${id}"><rect x="0" y="${(76 - h).toFixed(1)}" width="60" height="${h.toFixed(1)}"/></clipPath>
      <clipPath id="${id}s">${shape.replace(/fill="none"[^/]*\/>/g, '/>')}</clipPath>
    </defs>
    <g class="tr-base">${shape}</g>
    <g class="tr-fill" clip-path="url(#${id})">${shape}</g>
    ${shine}
  </svg>`;
}
