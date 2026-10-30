/**
 * Shop shell: sticky tabs (All, Offers, Boosters, Styles, Effects, Profile), tap or swipe to switch,
 * opens on All the first time, then remembers the last tab, and shows "New" dots on tabs with unseen items.
 */
import { formatCountdown, giftStatus } from '../../../game/offers.js';
import { state } from '../../../game/state.js';
import { saveProgress } from '../../../storage/save.js';
import { renderNavDots } from '../../components/bottomNav.js';
import { icon } from '../../components/icons.js';
import { $ } from '../../dom.js';
import { currentScreen, onReturn, openTab } from '../../navigation.js';
import { onShopChange } from './actions.js';
import * as all from './allTab.js';
import * as boosters from './boostersTab.js';
import { hasNew, markShownSeen } from './cards.js';
import * as effects from './effectsTab.js';
import * as offers from './offersTab.js';
import * as profile from './profileTab.js';
import * as styles from './stylesTab.js';

export const TABS = [
  { id: 'all', label: 'All', icon: 'levels', mod: all },
  { id: 'offers', label: 'Offers', icon: 'gift', mod: offers },
  { id: 'boosters', label: 'Boosters', icon: 'bolt', mod: boosters },
  { id: 'styles', label: 'Styles', icon: 'palette', mod: styles },
  { id: 'effects', label: 'Effects', icon: 'sparkle', mod: effects },
  { id: 'profile', label: 'Profile', icon: 'user', mod: profile },
];
const STORE_KEY = 'arrowEscape:shopTab';

/** Last opened tab (per-viewer convenience; storage may be unavailable). */
function loadTab() {
  try {
    const t = localStorage.getItem(STORE_KEY);
    return TABS.some((x) => x.id === t) ? t : 'all';
  } catch {
    return 'all';
  }
}

let active = loadTab();
let ticker = 0;

/** Remember the tab without failing when storage is blocked. */
function storeTab(id) {
  try {
    localStorage.setItem(STORE_KEY, id);
  } catch {
    // private mode or blocked storage: just don't remember
  }
}

/** Tab buttons with their "New" dots. */
function renderTabs() {
  $('shop-tabs').innerHTML = TABS.map(
    (t) =>
      `<button class="shop-tab${t.id === active ? ' on' : ''}" role="tab" data-tab="${t.id}" aria-selected="${t.id === active}">${icon(t.icon)}<span>${t.label}</span><i class="tab-dot" ${hasNew(t.mod.keys()) ? '' : 'hidden'}></i></button>`,
  ).join('');
}

/**
 * Draw the active tab. Items shown now lose their "New" badge next time.
 * @param {number} [dir] -1 / 1 slide direction for the transition, 0 for none
 */
function renderShop(dir = 0) {
  const tab = TABS.find((t) => t.id === active);
  const panel = $('shop-panel');
  panel.innerHTML = tab.mod.render();
  panel.setAttribute('aria-label', tab.label);
  if (dir) {
    panel.classList.remove('slide-l', 'slide-r');
    void panel.offsetWidth; // restart the animation
    panel.classList.add(dir > 0 ? 'slide-l' : 'slide-r');
  }
  if (markShownSeen()) saveProgress();
  renderTabs();
  // keep the active tab fully in view in the scrolling tab row
  const on = $('shop-tabs').querySelector('.on');
  if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
}

/** Switch tab with a slide in the right direction. */
function selectTab(id) {
  if (id === active) return;
  const dir = Math.sign(TABS.findIndex((t) => t.id === id) - TABS.findIndex((t) => t.id === active));
  active = id;
  storeTab(id);
  renderShop(dir);
  $('shop-body').scrollTo({ top: 0 });
}

/** Keep the gift countdown live while the Offers tab is visible. */
function tick() {
  if (currentScreen() !== 'screen-shop') return stopTicker();
  const el = $('shop-panel').querySelector('[data-countdown]');
  if (!el) return;
  const s = giftStatus(Date.now(), state.offers.giftLast);
  if (s.ready) {
    renderShop();
    renderNavDots();
  } else el.textContent = formatCountdown(s.remainingMs);
}

function startTicker() {
  if (!ticker) ticker = setInterval(tick, 1000);
}

function stopTicker() {
  clearInterval(ticker);
  ticker = 0;
}

/**
 * Open the shop tab.
 * @param {string} [tab] tab id to show
 */
export function openShop(tab) {
  if (typeof tab === 'string' && TABS.some((t) => t.id === tab)) {
    active = tab;
    storeTab(tab);
  }
  renderShop();
  openTab('screen-shop');
  startTicker();
}

/** Horizontal swipe on the panel switches tabs. */
function bindSwipe(el) {
  let x0 = 0;
  let y0 = 0;
  el.addEventListener(
    'touchstart',
    (e) => {
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
    },
    { passive: true },
  );
  el.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const i = TABS.findIndex((t) => t.id === active) + (dx < 0 ? 1 : -1);
    if (TABS[i]) selectTab(TABS[i].id);
  });
}

/** Wire the shop once. */
export function bindShop() {
  $('shop-body').innerHTML =
    '<nav class="shop-tabs" id="shop-tabs" role="tablist" aria-label="Shop sections"></nav><div class="shop-panel" id="shop-panel" role="tabpanel"></div>';
  $('shop-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) selectTab(b.dataset.tab);
  });
  $('shop-panel').addEventListener('click', (e) => {
    const el = e.target.closest('.shop-card');
    if (el) TABS.find((t) => t.id === active).mod.onCard(el, e);
  });
  bindSwipe($('shop-panel'));
  onShopChange(() => renderShop());
  onReturn('screen-shop', () => {
    renderShop();
    startTicker();
  });
}
