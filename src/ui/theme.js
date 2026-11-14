import { state } from '../game/state.js';
import { lookFor } from '../game/looks.js';

const darkQuery =
  typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

/**
 * Apply the chosen theme (auto follows the system), the arrow color and the board. The arrow color and the board
 * look come from src/game/looks.js as CSS variables on <html> (--arrow, --board-fill, --board-bg, --dot and
 * --arrow-outline, which the canvas board reads); data-outline is set when the combination needs an outline.
 */
export function applyTheme() {
  const dark = state.theme === 'dark' || (state.theme === 'auto' && !!darkQuery && darkQuery.matches);
  const root = document.documentElement;
  const look = lookFor(state.style, state.cosmetics.equipped.board, dark ? 'dark' : 'light');
  root.style.setProperty('--arrow', look.arrow);
  root.style.setProperty('--board-fill', look.fill);
  root.style.setProperty('--board-bg', look.base);
  root.style.setProperty('--dot', look.dot);
  root.style.setProperty('--arrow-outline', look.outline || '');
  root.toggleAttribute('data-outline', !!look.outline);
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  root.setAttribute('data-style', state.style);
  root.setAttribute('data-accent', state.accent);
  root.setAttribute('data-board', state.cosmetics.equipped.board);
  root.setAttribute('data-frame', state.cosmetics.equipped.frame);
  document.querySelector('meta[name="theme-color"]').setAttribute('content', dark ? '#0D1321' : '#FFFFFF');
}

/** Re-apply the theme when the system setting changes while on Auto. */
export function watchSystemTheme() {
  if (!darkQuery) return;
  const onChange = () => {
    if (state.theme === 'auto') applyTheme();
  };
  if (darkQuery.addEventListener) darkQuery.addEventListener('change', onChange);
  else if (darkQuery.addListener) darkQuery.addListener(onChange);
}
