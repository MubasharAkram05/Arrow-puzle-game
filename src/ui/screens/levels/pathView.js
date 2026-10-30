/**
 * Levels page as a winding path: a sticky banner per chapter, round level nodes in an S-curve and a chest
 * after each chapter. Only a few chapters are in the DOM at once (more are added while scrolling and far
 * ones removed), so the page stays light with any number of levels.
 */
import { loadShapeLibrary, shapeLibraryReady, shapeOf } from '../../../engine/index.js';
import { chapterLevels, chapterOf, chapterWindow } from '../../../game/economy.js';
import { startLevel } from '../../../game/game.js';
import { clearHint } from '../../../game/hints.js';
import { state } from '../../../game/state.js';
import { isPlayable } from '../../../game/unlock.js';
import { hidePointer } from '../../../render/pointer.js';
import { shapeIcon } from '../../components/shapeIcon.js';
import { toast } from '../../components/toast.js';
import { $ } from '../../dom.js';
import { navigate, onReturn, openTab } from '../../navigation.js';
import { bannerHTML } from './chapterBanner.js';
import { chestHTML, chestState, levelNodeState, nodeHTML } from './pathNode.js';

const BATCH = 2; // chapters added per scroll step
const MAX_CHAPTERS = 8; // chapters kept in the DOM
let firstShown = 1; // chapters in the list: firstShown..lastShown
let lastShown = 0;
const seenOpened = new Set(); // chests already shown open (the opening plays once per chapter)
let seenReady = false;
let observer = null;

/** Markup of one chapter: banner, nodes, chest. */
function chapterHTML(c) {
  const p = state.progress;
  const levels = chapterLevels(c);
  const done = levels.filter((l) => p.completed.has(l)).length;
  const rows = levels.map((n, i) => nodeHTML(levelNodeState(n, p), i)).join('');
  const chest = chestState(levels, c, p);
  const opening = chest.status === 'opened' && seenReady && !seenOpened.has(c);
  if (chest.status === 'opened') seenOpened.add(c);
  const locked = !isPlayable(levels[0], p);
  return `<section class="chapter-path${locked ? ' locked' : ''}" data-ch="${c}">
    ${bannerHTML(c, done, levels.length, chest.status === 'opened', locked)}
    <ol class="path">${rows}${chestHTML(chest, levels.length, opening)}</ol>
  </section>`;
}

const grid = () => $('level-grid');
const scroller = () => $('levels-scroll');

/** Drop chapters from one end so at most MAX_CHAPTERS stay in the DOM. */
function trim(fromTop) {
  const sections = grid().children;
  let extra = sections.length - MAX_CHAPTERS;
  if (extra <= 0) return;
  if (fromTop) {
    let removed = 0;
    while (extra-- > 0) {
      removed += sections[0].getBoundingClientRect().height;
      sections[0].remove();
      firstShown++;
    }
    scroller().scrollTop -= removed;
  } else {
    while (extra-- > 0) {
      sections[sections.length - 1].remove();
      lastShown--;
    }
  }
}

/** Add chapters at the end (levels never end). */
function appendChapters(count) {
  const html = [];
  for (let c = lastShown + 1; c <= lastShown + count; c++) html.push(chapterHTML(c));
  lastShown += count;
  grid().insertAdjacentHTML('beforeend', html.join(''));
  trim(true);
  watchCurrent();
  fillPendingShapes();
}

/** Add earlier chapters at the top, keeping what is on screen in place. */
function prependChapters(count) {
  if (firstShown <= 1) return;
  const from = Math.max(1, firstShown - count);
  const html = [];
  for (let c = from; c < firstShown; c++) html.push(chapterHTML(c));
  firstShown = from;
  const before = scroller().scrollHeight;
  grid().insertAdjacentHTML('afterbegin', html.join(''));
  scroller().scrollTop += scroller().scrollHeight - before;
  trim(false);
  watchCurrent();
  fillPendingShapes();
}

/** Rebuild the path around the current level. */
function renderLevels() {
  const [from, to] = chapterWindow(chapterOf(state.progress.current), 1);
  grid().textContent = '';
  firstShown = from;
  lastShown = from - 1;
  appendChapters(to - from + 1);
  seenReady = true;
}

/** Shape placeholders become silhouettes once the shape library chunk is in. */
function fillPendingShapes() {
  if (shapeLibraryReady()) {
    for (const el of grid().querySelectorAll('.shape-pending'))
      el.outerHTML = shapeIcon(shapeOf(Number(el.dataset.shapeLevel)), 'pn-shape');
    return;
  }
  loadShapeLibrary()
    .then(fillPendingShapes)
    .catch(() => {});
}

const currentNode = () => grid().querySelector('.pn-current');

/** Scroll the current level into the middle of the view (rebuilding the path if it is far away). */
function scrollToCurrent(smooth = false) {
  if (!currentNode()) renderLevels();
  currentNode()?.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' });
  // observe again now that the screen is shown: an observer made while it was hidden can stay stale
  watchCurrent();
}

/** Show the "jump to current level" button only while the current node is off screen. */
function watchCurrent() {
  const btn = $('btn-jump-current');
  observer?.disconnect();
  const node = currentNode();
  if (!node || !('IntersectionObserver' in window)) {
    btn.hidden = !!node;
    return;
  }
  observer = new IntersectionObserver(([e]) => (btn.hidden = e.isIntersecting), { root: scroller() });
  observer.observe(node);
}

/**
 * Open the level select screen.
 * @param {boolean} [asTab] opened from the bottom bar (history becomes [home, levels])
 */
export function openLevels(asTab = false) {
  clearHint();
  hidePointer();
  renderLevels();
  if (asTab) openTab('screen-levels');
  else navigate('screen-levels');
  // two frames: the screen is displayed and laid out before scrolling
  requestAnimationFrame(() => requestAnimationFrame(() => scrollToCurrent()));
}

/** Tap on a node: play it, or shake a locked one. */
function onPick(e) {
  const b = e.target.closest('.pn');
  if (!b) return;
  if (b.classList.contains('pn-locked')) {
    b.classList.remove('shake');
    void b.offsetWidth;
    b.classList.add('shake');
    toast(`Complete level ${state.progress.unlocked} first`);
    return;
  }
  startLevel(Number(b.dataset.level));
}

/** Wire the level screen. */
export function bindLevels() {
  grid().addEventListener('click', onPick);
  let ticking = false;
  scroller().addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const el = scroller();
        if (el.scrollTop + el.clientHeight > el.scrollHeight - 900) appendChapters(BATCH);
        else if (el.scrollTop < 600) prependChapters(BATCH);
      });
    },
    { passive: true },
  );
  $('btn-jump-current').addEventListener('click', () => scrollToCurrent(true));
  onReturn('screen-levels', () => {
    renderLevels();
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToCurrent()));
  });
}
