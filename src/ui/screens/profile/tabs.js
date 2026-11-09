/**
 * Profile | Awards segmented control (see components/segmented.js).
 */
import { segmented } from '../../components/segmented.js';

export const PROFILE_TABS = Object.freeze(['profile', 'awards']);

const seg = segmented({
  name: 'prof',
  label: 'Profile sections',
  tabs: [
    { id: 'profile', label: 'Profile' },
    { id: 'awards', label: 'Awards' },
  ],
  storeKey: 'arrowEscape:profileTab',
  scrollId: 'profile-body',
});

/** Markup for the control and the two panels. */
export const tabsSkeleton = (profileHTML, awardsHTML) => seg.html({ profile: profileHTML, awards: awardsHTML });

/** The tab being shown. */
export const activeTab = () => seg.active();

/**
 * Show a tab.
 * @param {'profile'|'awards'} id
 * @param {number} [dir]
 */
export const showTab = (id, dir = 0) => seg.show(id, dir);

/** Red dots on the tabs. @param {{profile: boolean, awards: boolean}} dots */
export const setTabDots = (dots) => seg.setDots(dots);

/** Wire the control once. @param {(id: string, before: string) => void} shown */
export const bindTabs = (shown) => seg.bind(shown);
