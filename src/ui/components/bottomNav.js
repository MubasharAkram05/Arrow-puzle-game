/**
 * Bottom navigation bar (Home, Levels, Shop, Profile). Hidden during gameplay.
 */
import { achievementContext } from '../../game/rewards.js';
import { claimableCount } from '../../game/achievements.js';
import { state } from '../../game/state.js';
import { icon } from './icons.js';

const TABS = [
  { screen: 'screen-home', label: 'Home', icon: 'home' },
  { screen: 'screen-levels', label: 'Levels', icon: 'levels' },
  { screen: 'screen-shop', label: 'Shop', icon: 'shop' },
  { screen: 'screen-profile', label: 'Profile', icon: 'user' },
];
const handlers = {};

/**
 * Create the bar. Each tab calls the opener registered for its screen.
 * @param {Record<string, () => void>} openers screen id -> function that opens it
 */
export function mountBottomNav(openers) {
  Object.assign(handlers, openers);
  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';
  nav.id = 'bottom-nav';
  nav.setAttribute('aria-label', 'Main');
  nav.innerHTML = TABS.map(
    (t) =>
      `<button class="nav-tab" data-screen="${t.screen}" aria-label="${t.label}">${icon(t.icon)}<span>${t.label}</span><i class="nav-dot" hidden></i></button>`,
  ).join('');
  nav.addEventListener('click', (e) => {
    const b = e.target.closest('.nav-tab');
    if (b && !b.classList.contains('active') && handlers[b.dataset.screen]) handlers[b.dataset.screen]();
  });
  document.body.appendChild(nav);
}

/**
 * Highlight the tab for the visible screen; hide the bar on screens without a tab (the game).
 * @param {string} screenId
 */
export function updateBottomNav(screenId) {
  const nav = document.getElementById('bottom-nav');
  if (!nav) return;
  const isTab = TABS.some((t) => t.screen === screenId);
  nav.classList.toggle('hidden', !isTab);
  document.body.classList.toggle('has-nav', isTab);
  nav.querySelectorAll('.nav-tab').forEach((b) => {
    const active = b.dataset.screen === screenId;
    b.classList.toggle('active', active);
    if (active) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  const dot = nav.querySelector('[data-screen="screen-profile"] .nav-dot');
  dot.hidden = claimableCount(achievementContext(), state.claimed) === 0;
}
