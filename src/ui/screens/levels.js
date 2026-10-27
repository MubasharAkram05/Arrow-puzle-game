import { startLevel } from '../../game/game.js';
import { clearHint } from '../../game/hints.js';
import { state } from '../../game/state.js';
import { hidePointer } from '../../render/pointer.js';
import { $ } from '../dom.js';
import { navigate, onReturn } from '../navigation.js';
import { goHome } from './home.js';

const PAGE = 60;
let count = 0;

/**
 * Add more level buttons: locked ones show a lock, completed ones a check.
 * @param {number} more
 */
function appendLevels(more) {
  const p = state.progress;
  const frag = document.createDocumentFragment();
  for (let i = count + 1; i <= count + more; i++) {
    const b = document.createElement('button');
    b.dataset.level = i;
    if (i > p.unlocked) {
      b.className = 'level-btn locked';
      b.setAttribute('aria-label', `Level ${i}, locked`);
      b.innerHTML = '<svg class="icon"><use href="#i-lock"/></svg>';
    } else {
      b.className = 'level-btn' + (i === p.current ? ' current' : '');
      b.textContent = i;
      if (p.completed.has(i)) {
        b.insertAdjacentHTML('beforeend', '<svg class="icon tick"><use href="#i-check"/></svg>');
        b.setAttribute('aria-label', `Level ${i}, completed`);
      }
    }
    frag.appendChild(b);
  }
  count += more;
  $('level-grid').appendChild(frag);
}

/** Rebuild the level grid from the current progress. */
function renderLevels() {
  const p = state.progress;
  $('level-grid').textContent = '';
  count = 0;
  appendLevels(Math.max(PAGE, Math.ceil((p.unlocked + 24) / 4) * 4));
}

/** Open the level select screen (unlimited, grows while scrolling). */
export function openLevels() {
  clearHint();
  hidePointer();
  renderLevels();
  navigate('screen-levels');
  const target = $('level-grid').querySelector('.current');
  if (target) target.scrollIntoView({ block: 'center' });
}

/** Tap on a level: play it, or shake if locked. */
function onLevelPick(e) {
  const b = e.target.closest('.level-btn');
  if (!b) return;
  if (b.classList.contains('locked')) {
    b.classList.remove('shake');
    void b.offsetWidth;
    b.classList.add('shake');
    return;
  }
  startLevel(Number(b.dataset.level));
}

/** Wire the level screen. */
export function bindLevels() {
  $('btn-levels-back').addEventListener('click', goHome);
  $('level-grid').addEventListener('click', onLevelPick);
  $('levels-scroll').addEventListener('scroll', (e) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight > el.scrollHeight - 300) appendLevels(PAGE);
  });
  onReturn('screen-levels', renderLevels);
}
