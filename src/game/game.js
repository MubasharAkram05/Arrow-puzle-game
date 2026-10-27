import { buildOccupancy, clearArrow, dateKey, generateDaily, generateLevel, rayBlocker } from '../engine/index.js';
import { HINT_EVERY } from '../config.js';
import { animateBlocked, animateEscape } from '../render/animations.js';
import { boardCellPx, drawArrows, layoutBoard, strokeMetrics } from '../render/board.js';
import { renderGrid, renderHearts, renderHintButton, renderProgress } from '../render/hud.js';
import { hidePointer } from '../render/pointer.js';
import { initAudio, playSound } from '../audio/sound.js';
import { vibrate } from '../audio/haptics.js';
import { saveProgress } from '../storage/save.js';
import { $, shortDate } from '../ui/dom.js';
import { navigate } from '../ui/navigation.js';
import { closeModals } from '../ui/modals/modal.js';
import { showGameOver } from '../ui/modals/gameover.js';
import { showVictory } from '../ui/modals/victory.js';
import { clearHint, updateTutorial } from './hints.js';
import { state } from './state.js';

/**
 * Load, draw and reset a generated level.
 * @param {object} level
 */
export function loadLevel(level) {
  state.level = level;
  state.arrows = level.arrows.map((a) => ({ id: a.id, dir: a.dir, path: a.path, escaped: false, busy: false }));
  state.occ = buildOccupancy(level);
  state.remaining = level.arrows.length;
  state.maxHearts = level.hearts;
  state.hearts = level.hearts;
  state.locked = false;
  state.hintId = -1;
  hidePointer();
  $('screen-game').classList.toggle('tutorial', !state.daily && state.levelNum === 1);
  $('screen-game').classList.toggle('daily', !!state.daily);
  state.metrics = strokeMetrics(boardCellPx());
  drawArrows($('board'), state.arrows, level, true, state.metrics);
  setDifficultyBadge(level.difficulty);
  renderHearts(-1);
  renderProgress();
  renderHintButton();
  renderGrid();
  layoutBoard();
}

/** Difficulty pill; Super Hard gets the crown and purple label. */
function setDifficultyBadge(difficulty) {
  const badge = $('diff-badge');
  badge.dataset.level = difficulty.replace(' ', '-').toLowerCase();
  $('stats').classList.toggle('super', difficulty === 'Super Hard');
  $('diff-label').textContent = difficulty;
}

/**
 * Start a numbered level and show the game screen.
 * @param {number} n
 */
export function startLevel(n) {
  state.levelNum = n;
  state.daily = null;
  state.progress.current = n;
  saveProgress();
  $('game-title').textContent = `Level ${n}`;
  navigate('screen-game');
  loadLevel(generateLevel(n));
  if (n === 1) updateTutorial();
}

/** Start today's daily challenge. */
export function startDaily() {
  const now = new Date();
  state.daily = dateKey(now);
  $('game-title').textContent = `Daily ${shortDate(now)}`;
  navigate('screen-game');
  loadLevel(generateDaily(state.daily));
}

/** Restart whatever is being played. */
export function restart() {
  closeModals();
  if (state.daily) startDaily();
  else startLevel(state.levelNum);
}

/** Arrow escapes: free its cells and slide it out. */
function escape(a, lvl) {
  if (state.hintId === a.id) clearHint();
  if (state.pointerId === a.id) hidePointer();
  a.escaped = true;
  clearArrow(state.occ, lvl.cols, a);
  state.remaining--;
  renderProgress();
  playSound('pop');
  if (state.remaining === 0) state.locked = true;
  else updateTutorial();
  animateEscape(a).then(() => {
    a.el.remove();
    if (state.level === lvl && state.remaining === 0) onLevelWon();
  });
}

/** Arrow is blocked: lose a heart and play the bump. */
function block(a, lvl, blocker) {
  a.busy = true;
  playSound('bump');
  vibrate(60);
  state.hearts = Math.max(0, state.hearts - 1);
  renderHearts(state.hearts);
  if (state.hearts === 0) state.locked = true;
  animateBlocked(a, blocker).then(() => {
    a.busy = false;
    if (state.level === lvl && state.hearts === 0) setTimeout(onOutOfHearts, 120);
  });
}

/**
 * Tap on an arrow: escape if the way out is clear, otherwise bump and lose a heart.
 * @param {object} a live arrow
 */
export function tapArrow(a) {
  initAudio();
  const lvl = state.level; // also a token: callbacks ignore a level that was replaced
  const blocker = rayBlocker(state.occ, lvl.rows, lvl.cols, a.path[0], a.dir);
  if (blocker) block(a, lvl, blocker);
  else escape(a, lvl);
}

/** Level cleared: record progress and show the victory screen. */
export function onLevelWon() {
  playSound('win');
  const p = state.progress;
  if (state.daily) {
    p.daily[state.daily] = true;
  } else {
    const n = state.levelNum;
    if (!p.completed.has(n)) {
      p.completed.add(n);
      if (p.completed.size % HINT_EVERY === 0) state.hints++;
    }
    p.unlocked = Math.max(p.unlocked, n + 1);
    p.current = n + 1;
  }
  saveProgress();
  setTimeout(showVictory, 200);
}

/** All hearts gone. */
function onOutOfHearts() {
  clearHint();
  hidePointer();
  showGameOver();
}

/** Spend a hint to get one heart back and keep playing. */
export function continueWithHint() {
  if (state.hints <= 0) return;
  state.hints--;
  state.hearts = 1;
  saveProgress();
  renderHearts(-1);
  renderHintButton();
  closeModals();
  updateTutorial();
}
