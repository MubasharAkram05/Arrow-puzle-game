/** SVG units per grid cell. */
export const CELL = 100;
/** Fallback hit radius around lines, in cells (used when no cell is hit exactly). */
export const HIT_FALLBACK = 0.3;
/** Largest on-screen cell size in px. */
export const MAX_CELL_PX = 64;
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
