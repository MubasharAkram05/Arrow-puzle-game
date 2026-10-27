/** SVG units per grid cell. */
export const CELL = 100;
/** Fallback hit radius around lines, in cells (used when no cell is hit exactly). */
export const HIT_FALLBACK = 0.3;
/** Board cells stay compact like the reference: about 140px for tiny boards, at least this many px per cell. */
export const BASE_CELL_PX = 24;
/** Width a small board aims for (px), so 3x3 gets big cells and 8x8 stays at BASE_CELL_PX. */
export const SMALL_BOARD_PX = 140;
/** Arrow line width and head size in screen px (constant across board sizes, as in the reference). */
export const STROKE_PX = 4.2;
export const HEAD_W_PX = 15;
export const HEAD_L_PX = 14;
/** Hints given to a new player. */
export const START_HINTS = 3;
/** Earn one hint every N completed levels. */
export const HINT_EVERY = 3;
/** localStorage key for the save file. */
export const STORE_KEY = 'arrowEscape.save.v1';
/** Theme options. */
export const THEMES = Object.freeze(['light', 'dark', 'auto']);
/** Arrow style options shown in settings. */
export const STYLES = Object.freeze([
  { id: 'classic', name: 'Classic' },
  { id: 'slate', name: 'Dark Slate' },
  { id: 'olive', name: 'Olive' },
  { id: 'mint', name: 'Soft Mint' },
]);
