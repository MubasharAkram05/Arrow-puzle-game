/**
 * Segmented control (pill with a sliding thumb) with one panel per tab: used by Profile | Awards and by
 * Tasks (Weekly | Achievements). A red dot marks a tab with something to claim or see; switching slides the
 * new panel in. The last tab is remembered on this device (tabState.js).
 */
import { $ } from '../dom.js';
import { tabState } from '../tabState.js';

/**
 * @param {{name: string, label: string, tabs: {id: string, label: string}[], storeKey: string, scrollId: string}} o
 *   name: prefix for element ids; scrollId: the scroll box that goes back to the top on a switch
 */
export function segmented(o) {
  const ids = o.tabs.map((t) => t.id);
  const st = tabState(ids, o.storeKey);
  let onShow = () => {};
  const tabId = (t) => `${o.name}-tab-${t}`;
  const panelId = (t) => `${o.name}-${t}`;

  /** Markup for the control and its panels. @param {Record<string, string>} panels */
  const html = (panels) => `
    <div class="prof-tabs" id="${o.name}-tabs" role="tablist" aria-label="${o.label}">
      <span class="prof-thumb" aria-hidden="true"></span>
      ${o.tabs.map((t) => `<button class="prof-tab" role="tab" id="${tabId(t.id)}" data-seg="${t.id}" aria-controls="${panelId(t.id)}">${t.label}<i class="tab-dot" hidden></i></button>`).join('')}
    </div>
    ${o.tabs.map((t, i) => `<section class="prof-panel" id="${panelId(t.id)}" role="tabpanel" aria-labelledby="${tabId(t.id)}"${i ? ' hidden' : ''}>${panels[t.id] || ''}</section>`).join('')}`;

  /** Show a tab. @param {string} id @param {number} [dir] slide direction, 0 for none */
  function show(id, dir = 0) {
    const before = st.active();
    if (id !== before) st.select(id);
    const bar = $(`${o.name}-tabs`);
    bar.dataset.active = id;
    bar.dataset.index = String(ids.indexOf(id));
    for (const t of ids) {
      const on = t === id;
      $(tabId(t)).setAttribute('aria-selected', String(on));
      $(tabId(t)).tabIndex = on ? 0 : -1;
      const panel = $(panelId(t));
      panel.hidden = !on;
      panel.classList.remove('slide-l', 'slide-r');
      if (on && dir) {
        void panel.offsetWidth; // restart the animation
        panel.classList.add(dir > 0 ? 'slide-l' : 'slide-r');
      }
    }
    onShow(id, before);
  }

  /** Red dots. @param {Record<string, boolean>} dots */
  function setDots(dots) {
    for (const t of ids) $(tabId(t)).querySelector('.tab-dot').hidden = !dots[t];
  }

  /** Wire once. @param {(id: string, before: string) => void} shown called after every switch */
  function bind(shown) {
    onShow = shown;
    const bar = $(`${o.name}-tabs`);
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-seg]');
      if (!b || b.dataset.seg === st.active()) return;
      const from = st.active();
      const id = b.dataset.seg;
      show(id, Math.sign(ids.indexOf(id) - ids.indexOf(from)));
      $(o.scrollId).scrollTo({ top: 0 });
    });
    // arrow keys move between the tabs (tablist pattern)
    bar.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const i = ids.indexOf(st.active()) + (e.key === 'ArrowRight' ? 1 : -1);
      const id = ids[Math.max(0, Math.min(ids.length - 1, i))];
      if (id !== st.active()) $(tabId(id)).click();
      $(tabId(id)).focus();
    });
  }

  return { html, show, setDots, bind, active: () => st.active() };
}
