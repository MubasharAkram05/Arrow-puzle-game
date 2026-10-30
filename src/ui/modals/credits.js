/**
 * Credits (Settings > Credits): every open source the board shapes come from, with author, license and how
 * many shapes it gave. Read from the shape library, which records the source and license of each shape.
 */
import { allShapes, loadShapeLibrary, shapeSources } from '../../engine/index.js';
import { $ } from '../dom.js';
import { openModal } from './modal.js';

const LICENSES = {
  MIT: 'MIT License',
  'Apache-2.0': 'Apache License 2.0',
  'CC-BY-4.0': 'CC BY 4.0',
  'CC-BY-3.0': 'CC BY 3.0',
  'OFL-1.1': 'SIL Open Font License 1.1',
  project: 'Made for Arrow Escape',
};

/** Escape text from the library before it goes into markup. */
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function render() {
  const count = {};
  for (const s of allShapes()) {
    const k = s.source.split(':')[0];
    count[k] = (count[k] || 0) + 1;
  }
  $('credits-list').innerHTML = Object.entries(shapeSources())
    .filter(([k]) => count[k])
    .sort(([a], [b]) => count[b] - count[a])
    .map(
      ([k, s]) => `<li>
        <b>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>` : esc(s.name)}</b>
        <small>${esc(s.author)} · ${esc(LICENSES[s.license] || s.license)} · ${count[k]} ${count[k] === 1 ? 'shape' : 'shapes'}</small>
      </li>`,
    )
    .join('');
}

/** Open the credits (filled once the shape library is in). */
export function openCredits() {
  openModal('modal-credits');
  $('credits-list').innerHTML = '<li class="muted">Loading credits…</li>';
  loadShapeLibrary()
    .then(render)
    .catch(() => ($('credits-list').innerHTML = '<li class="muted">Credits could not load. See CREDITS.md.</li>'));
}
