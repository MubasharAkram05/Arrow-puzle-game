/**
 * Profile | Awards segmented control: a pill with a sliding thumb, a red dot on a tab with something new, and
 * a slide between the two panels. The last tab is remembered on this device (localStorage, a convenience).
 */
import { $ } from '../../dom.js';

const STORE_KEY = 'arrowEscape:profileTab';
export const PROFILE_TABS = Object.freeze(['profile', 'awards']);

let active = 'profile';
let onShow = () => {};

/** Last tab used on this device ('profile' when nothing is stored or storage is blocked). */
function storedTab() {
  try {
    const t = localStorage.getItem(STORE_KEY);
    return PROFILE_TABS.includes(t) ? t : 'profile';
  } catch {
    return 'profile';
  }
}

function storeTab(id) {
  try {
    localStorage.setItem(STORE_KEY, id);
  } catch {
    // blocked storage: the tab just isn't remembered
  }
}

/** Markup for the control and the two panels (their content is filled by the profile). */
export const tabsSkeleton = (profileHTML, awardsHTML) => `
  <div class="prof-tabs" id="prof-tabs" role="tablist" aria-label="Profile sections">
    <span class="prof-thumb" aria-hidden="true"></span>
    <button class="prof-tab" role="tab" id="ptab-profile" data-ptab="profile" aria-controls="prof-profile">Profile<i class="tab-dot" hidden></i></button>
    <button class="prof-tab" role="tab" id="ptab-awards" data-ptab="awards" aria-controls="prof-awards">Awards<i class="tab-dot" hidden></i></button>
  </div>
  <section class="prof-panel" id="prof-profile" role="tabpanel" aria-labelledby="ptab-profile">${profileHTML}</section>
  <section class="prof-panel" id="prof-awards" role="tabpanel" aria-labelledby="ptab-awards" hidden>${awardsHTML}</section>`;

/** The tab being shown. */
export const activeTab = () => active;

/**
 * Show a tab.
 * @param {'profile'|'awards'} id
 * @param {number} [dir] slide direction: 1 from the right, -1 from the left, 0 none
 */
export function showTab(id, dir = 0) {
  const before = active;
  active = id;
  $('prof-tabs').dataset.active = id;
  for (const t of PROFILE_TABS) {
    const on = t === id;
    $(`ptab-${t}`).setAttribute('aria-selected', String(on));
    $(`ptab-${t}`).tabIndex = on ? 0 : -1;
    const panel = $(`prof-${t}`);
    panel.hidden = !on;
    panel.classList.remove('slide-l', 'slide-r');
    if (on && dir) {
      void panel.offsetWidth; // restart the animation
      panel.classList.add(dir > 0 ? 'slide-l' : 'slide-r');
    }
  }
  onShow(id, before);
}

/**
 * Red dots on the tabs.
 * @param {{profile: boolean, awards: boolean}} dots
 */
export function setTabDots(dots) {
  for (const t of PROFILE_TABS) $(`ptab-${t}`).querySelector('.tab-dot').hidden = !dots[t];
}

/**
 * Wire the control once and show the remembered tab.
 * @param {(id: string, before: string) => void} shown called after every switch
 */
export function bindTabs(shown) {
  onShow = shown;
  $('prof-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-ptab]');
    if (!b || b.dataset.ptab === active) return;
    const id = b.dataset.ptab;
    storeTab(id);
    showTab(id, PROFILE_TABS.indexOf(id) - PROFILE_TABS.indexOf(active));
    $('profile-body').scrollTo({ top: 0 });
  });
  // arrow keys move between the two tabs (tablist pattern)
  $('prof-tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const id = e.key === 'ArrowRight' ? 'awards' : 'profile';
    if (id !== active) $(`ptab-${id}`).click();
    $(`ptab-${id}`).focus();
  });
  active = storedTab();
}
