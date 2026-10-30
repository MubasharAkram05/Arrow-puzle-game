/**
 * Small filled silhouette of a board shape, drawn from the same mask the generator uses.
 */
import { makeMask } from '../../engine/index.js';

const SIZE = 16;
const cache = new Map();

/**
 * @param {string} name shape id (see src/engine/shapes/library.js)
 * @param {string} [cls] extra classes
 * @returns {string} svg markup
 */
export function shapeIcon(name, cls = '') {
  if (!cache.has(name)) {
    const m = makeMask(name, SIZE, SIZE);
    let d = '';
    for (let i = 0; i < m.length; i++) if (m[i]) d += `M${i % SIZE} ${Math.floor(i / SIZE)}h1v1h-1z`;
    cache.set(name, d);
  }
  return `<svg class="icon ${cls}" viewBox="0 0 ${SIZE} ${SIZE}" aria-hidden="true"><path d="${cache.get(name)}" fill="currentColor" stroke="none"/></svg>`;
}
