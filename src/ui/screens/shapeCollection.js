/**
 * Shape Collection (Profile): every library shape by category. Shapes from finished shape levels show in
 * colour; the rest are grey silhouettes with a lock. Totals come from the small shape index, so they show
 * at once; the silhouettes wait for the shape library chunk (skeleton tiles meanwhile).
 */
import {
  SHAPE_CATEGORIES,
  collectionProgress,
  getShape,
  loadShapeLibrary,
  shapeLibraryReady,
  shapesIn,
} from '../../engine/index.js';
import { state } from '../../game/state.js';
import { icon } from '../components/icons.js';
import { shapeArt } from '../components/shapeIcon.js';
import { $ } from '../dom.js';

let tab = SHAPE_CATEGORIES[0].id;
const fmt = (n) => n.toLocaleString('en-US');

/** Static markup, built once inside the profile page. */
export function collectionSkeleton() {
  return `<h3 class="section-title">Shape Collection</h3>
    <div class="sc-card">
      <div class="sc-total"><span>${icon('shape-star')}<b id="sc-have">0</b> / <span id="sc-all">0</span> shapes</span>
        <div class="xp-bar"><i id="sc-fill"></i></div></div>
      <div class="sc-tabs" id="sc-tabs" role="tablist" aria-label="Shape categories"></div>
      <div class="sc-grid" id="sc-grid" role="tabpanel" aria-live="polite"></div>
    </div>`;
}

/** Category chips with their progress, e.g. "Animals 12/80". */
function renderTabs(progress) {
  $('sc-tabs').innerHTML = progress.categories
    .map(
      (c) =>
        `<button class="sc-tab${c.id === tab ? ' on' : ''}${c.have === c.total ? ' full' : ''}" role="tab" aria-selected="${c.id === tab}" data-cat="${c.id}">${c.name}<small>${c.have}/${c.total}</small></button>`,
    )
    .join('');
}

/** Tiles of the open category: skeletons until the library is in. */
function renderGrid() {
  const ids = shapesIn(tab);
  const grid = $('sc-grid');
  grid.dataset.cat = tab;
  if (!shapeLibraryReady()) {
    grid.innerHTML = '<span class="sc-tile skeleton"></span>'.repeat(Math.min(ids.length, 12));
    loadShapeLibrary()
      .then(renderGrid)
      .catch(() => (grid.innerHTML = '<p class="muted sc-empty">Shapes could not load. Try again later.</p>'));
    return;
  }
  const have = state.progress.shapes;
  grid.innerHTML = ids
    .map((id) => {
      const s = getShape(id);
      const got = have.has(id);
      return `<figure class="sc-tile${got ? ' got' : ''}" title="${s.name}${got ? '' : ' (locked)'}">
        ${shapeArt(id, 'sc-art')}${got ? '' : icon('lock', 'sc-lock')}
        <figcaption>${got ? s.name : '?'}</figcaption></figure>`;
    })
    .join('');
}

/** Refresh the totals, chips and grid. */
export function renderCollection() {
  const progress = collectionProgress(state.progress.shapes);
  $('sc-have').textContent = fmt(progress.have);
  $('sc-all').textContent = fmt(progress.total);
  $('sc-fill').style.transform = `scaleX(${progress.have / progress.total})`;
  renderTabs(progress);
  renderGrid();
}

/** Wire the category chips once. */
export function bindCollection() {
  $('sc-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b || b.dataset.cat === tab) return;
    tab = b.dataset.cat;
    renderTabs(collectionProgress(state.progress.shapes));
    renderGrid();
  });
}
