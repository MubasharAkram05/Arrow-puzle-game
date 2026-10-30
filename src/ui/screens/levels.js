/**
 * Level select: chapters of 20 levels as collapsible cards.
 * Only open chapters render their tiles, and chapter headers are added in batches while scrolling,
 * so thousands of levels stay light.
 */
import { REWARDS } from '../../config.js';
import { isShapeLevel, loadShapeLibrary, shapeLibraryReady, shapeOf } from '../../engine/index.js';
import { isPlayable } from '../../game/unlock.js';
import { shapeIcon } from '../components/shapeIcon.js';
import { chapterLevels, chapterOf, chapterWindow } from '../../game/economy.js';
import { startLevel } from '../../game/game.js';
import { clearHint } from '../../game/hints.js';
import { state } from '../../game/state.js';
import { hidePointer } from '../../render/pointer.js';
import { icon } from '../components/icons.js';
import { toast } from '../components/toast.js';
import { $ } from '../dom.js';
import { navigate, onReturn, openTab } from '../navigation.js';

const NAMES = ['Beginner', 'Explorer', 'Pathfinder', 'Tactician', 'Strategist', 'Expert', 'Master', 'Grandmaster'];
const BATCH = 3; // chapter headers added per scroll step
let firstShown = 1; // chapters currently in the list: firstShown..lastShown
let lastShown = 0;
const open = new Set();

/** Chapter title, e.g. "Chapter 1: Beginner". */
function chapterTitle(c) {
  return NAMES[c - 1] ? `Chapter ${c}: ${NAMES[c - 1]}` : `Chapter ${c}`;
}

/** Small shape silhouette for a shape level; a placeholder until the shape library chunk has loaded. */
function shapeMark(n) {
  if (!isShapeLevel(n)) return '';
  if (shapeLibraryReady()) return shapeIcon(shapeOf(n), 'shape');
  loadShapeLibrary()
    .then(fillPendingShapes)
    .catch(() => {});
  return `<i class="shape shape-pending" data-shape-level="${n}"></i>`;
}

/** Swap the placeholders for real icons once the library is in. */
function fillPendingShapes() {
  for (const el of $('level-grid').querySelectorAll('.shape-pending'))
    el.outerHTML = shapeIcon(shapeOf(Number(el.dataset.shapeLevel)), 'shape');
}

/** Markup for one level tile. */
function tileHTML(n) {
  const p = state.progress;
  if (!isPlayable(n, p)) {
    return `<button class="level-btn locked" data-level="${n}" aria-label="Level ${n}, locked">${icon('lock')}</button>`;
  }
  const done = p.completed.has(n);
  const perfect = p.perfect.has(n);
  const cls = ['level-btn', done ? 'done' : '', n === p.current ? 'current' : ''].join(' ');
  const shape = shapeMark(n);
  const badges = (done ? icon('check', 'tick') : '') + (perfect ? icon('crown', 'solid crown-mark') : '');
  const label = `Level ${n}${done ? ', completed' : ''}${perfect ? ', perfect' : ''}`;
  return `<button class="${cls}" data-level="${n}" aria-label="${label}">${shape}<span>${n}</span>${badges}</button>`;
}

/** Markup for a chapter card (tiles only when open). */
function chapterHTML(c) {
  const levels = chapterLevels(c);
  const done = levels.filter((l) => state.progress.completed.has(l)).length;
  const isOpen = open.has(c);
  const reward = state.progress.chaptersRewarded.has(c)
    ? `<span class="ch-reward got">${icon('check')}Reward</span>`
    : `<span class="ch-reward"><svg class="cur-icon"><use href="#i-coin" /></svg>${REWARDS.chapterCoins}<svg class="cur-icon"><use href="#i-gem" /></svg>${REWARDS.chapterDiamonds}</span>`;
  return `<section class="chapter${isOpen ? ' open' : ''}${isPlayable(levels[0], state.progress) ? '' : ' locked'}" data-ch="${c}">
    <button class="chapter-head" aria-expanded="${isOpen}">
      <span class="ch-title"><b>${chapterTitle(c)}</b><small>${done}/${levels.length} completed</small></span>
      ${reward}${icon('back', 'chev')}
    </button>
    <div class="ch-bar"><i style="transform:scaleX(${done / levels.length})"></i></div>
    <div class="chapter-grid">${isOpen ? levels.map(tileHTML).join('') : ''}</div>
  </section>`;
}

/** Add more chapter headers at the end of the list (levels never end). */
function appendChapters(count) {
  const html = [];
  for (let c = lastShown + 1; c <= lastShown + count; c++) html.push(chapterHTML(c));
  lastShown += count;
  $('level-grid').insertAdjacentHTML('beforeend', html.join(''));
}

/** Add earlier chapters at the top, keeping what is on screen in place. */
function prependChapters(count) {
  if (firstShown <= 1) return;
  const from = Math.max(1, firstShown - count);
  const html = [];
  for (let c = from; c < firstShown; c++) html.push(chapterHTML(c));
  firstShown = from;
  const scroller = $('levels-scroll');
  const before = scroller.scrollHeight;
  $('level-grid').insertAdjacentHTML('afterbegin', html.join(''));
  scroller.scrollTop += scroller.scrollHeight - before;
}

/** Rebuild the list: only a few chapters around the current level, its chapter open. */
function renderLevels() {
  const current = chapterOf(state.progress.current);
  open.clear();
  open.add(current);
  $('level-grid').textContent = '';
  [firstShown, lastShown] = chapterWindow(current);
  lastShown = firstShown - 1;
  appendChapters(chapterWindow(current)[1] - firstShown + 1);
}

/** Scroll the current level into the middle of the view. */
function scrollToCurrent() {
  const tile = $('level-grid').querySelector('.level-btn.current');
  if (tile) tile.scrollIntoView({ block: 'center' });
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
  requestAnimationFrame(() => requestAnimationFrame(scrollToCurrent));
}

/** Open or close a chapter card. */
function toggleChapter(section) {
  const c = Number(section.dataset.ch);
  if (open.has(c)) open.delete(c);
  else open.add(c);
  section.outerHTML = chapterHTML(c);
}

/** Tap on a tile or a chapter header. */
function onPick(e) {
  const head = e.target.closest('.chapter-head');
  if (head) return toggleChapter(head.parentElement);
  const b = e.target.closest('.level-btn');
  if (!b) return;
  if (b.classList.contains('locked')) {
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
  $('level-grid').addEventListener('click', onPick);
  $('levels-scroll').addEventListener('scroll', (e) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight > el.scrollHeight - 400) appendChapters(BATCH);
    else if (el.scrollTop < 300) prependChapters(BATCH);
  });
  onReturn('screen-levels', () => {
    renderLevels();
    requestAnimationFrame(() => requestAnimationFrame(scrollToCurrent));
  });
}
