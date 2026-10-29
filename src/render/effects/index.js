/**
 * Escape effects registry. The classic slide always plays; an equipped effect adds particles.
 * Effects are skipped when the player prefers reduced motion.
 */
import { CELL } from '../../config.js';
import { state } from '../../game/state.js';
import { $ } from '../../ui/dom.js';
import burst from './burst.js';
import comet from './comet.js';
import rocket from './rocket.js';
import spark from './spark.js';

const EFFECTS = { spark, comet, burst, rocket };

const reducedMotion = () => !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Per-frame callback that adds the equipped effect for an escaping arrow, or null.
 * @param {object} a live arrow (with geom)
 * @param {string} [id] effect id (defaults to the equipped one)
 * @returns {((t: number, s: number) => void) | null}
 */
export function escapeFx(a, id = state.cosmetics.equipped.effect) {
  const fx = EFFECTS[id];
  if (!fx || reducedMotion()) return null;
  const wrap = $('board-wrap').getBoundingClientRect();
  const board = $('board').getBoundingClientRect();
  const scale = board.width / (state.level.cols * CELL);
  const color = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#1877F2';
  const done = new Set();
  const g = a.geom;
  return (t, s) => {
    fx({
      x: board.left - wrap.left + (g.hx + g.dx * s) * scale,
      y: board.top - wrap.top + (g.hy + g.dy * s) * scale,
      dx: g.dx,
      dy: g.dy,
      t,
      color,
      once: (key) => !done.has(key) && done.add(key),
    });
  };
}
