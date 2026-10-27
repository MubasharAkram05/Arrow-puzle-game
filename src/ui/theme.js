import { state } from '../game/state.js';

const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

/** Apply the chosen theme (auto follows the system) and arrow style. */
export function applyTheme() {
  const dark = state.theme === 'dark' || (state.theme === 'auto' && !!darkQuery && darkQuery.matches);
  const root = document.documentElement;
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  root.setAttribute('data-style', state.style);
  root.setAttribute('data-accent', state.accent);
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
