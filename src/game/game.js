import { buildOccupancy, clearArrow, generateLevel, rayBlocker } from '../engine/index.js';
import { HINT_EVERY } from '../config.js';
import { animateBlocked, animateEscape } from '../render/animations.js';
import { resetZoom } from '../input/zoom.js';
import { hideZoomGuide, maybeShowZoomGuide } from '../ui/zoomGuide.js';
import { boardCellPx, drawArrows, layoutBoard, strokeMetrics } from '../render/board.js';
import { renderGrid, renderHearts, renderHintButton, renderProgress } from '../render/hud.js';
import { hidePointer } from '../render/pointer.js';
import { initAudio, playSound } from '../audio/sound.js';
import { vibrate } from '../audio/haptics.js';
import { saveProgress } from '../storage/save.js';
import { $ } from '../ui/dom.js';
import { navigate } from '../ui/navigation.js';
import { closeModals } from '../ui/modals/modal.js';
import { showGameOver } from '../ui/modals/gameover.js';
import { showVictory } from '../ui/modals/victory.js';
import { clearHint, updateTutorial } from './hints.js';
import { applyWin, wallet } from './rewards.js';
import { isTestPlay, testPlaySummary } from './unlock.js';
import { absorbWrongTap, newLevelBoosts } from './boosters.js';
import { breakShield } from '../render/boostFx.js';
import { renderBoosterBar } from '../ui/screens/boosterBar.js';
import { recordLoss } from './stats.js';
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
  state.refillsUsed = 0;
  state.won = false;
  state.levelBoost = newLevelBoosts();
  hidePointer();
  $('screen-game').classList.toggle('tutorial', state.levelNum === 1);
  state.metrics = { ...strokeMetrics(boardCellPx()), head: state.cosmetics.equipped.head };
  drawArrows($('board'), state.arrows, level, true, state.metrics);
  setDifficultyBadge(level.difficulty);
  renderHearts(-1);
  renderProgress();
  renderHintButton();
  renderBoosterBar();
  renderGrid();
  layoutBoard();
  if (resetZoom(boardCellPx(), level)) maybeShowZoomGuide();
  else hideZoomGuide();
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
  // a test-mode play of a locked level must not move the saved "current" level
  if (!isTestPlay(n, state.progress)) {
    state.progress.current = n;
    saveProgress();
  }
  $('game-title').textContent = `Level ${n}`;
  navigate('screen-game');
  loadLevel(generateLevel(n));
  if (n === 1) updateTutorial();
}

/** Restart the current level. */
export function restart() {
  closeModals();
  startLevel(state.levelNum);
}

/** Arrow escapes: free its cells and slide it out. */
function escape(a, lvl) {
  if (state.hintId === a.id) clearHint();
  if (state.pointerId === a.id) hidePointer();
  a.escaped = true;
  state.stats.arrowsCleared++;
  clearArrow(state.occ, lvl.cols, a);
  state.remaining--;
  renderProgress();
  playSound('pop');
  if (state.remaining === 0) state.locked = true;
  else updateTutorial();
  animateEscape(a).then(() => {
    a.el.remove();
    // several escape animations can end after the last arrow left: only the first one finishes the level
    if (state.level === lvl && state.remaining === 0 && !state.won) {
      state.won = true;
      onLevelWon();
    }
  });
}

/** Arrow is blocked: lose a heart (unless a shield absorbs it) and play the bump. */
function block(a, lvl, blocker) {
  a.busy = true;
  playSound('bump');
  vibrate(60);
  const shield = absorbWrongTap(state.levelBoost);
  state.levelBoost = shield.lvl;
  if (shield.absorbed) {
    breakShield();
    renderHearts(-1);
    renderBoosterBar();
  } else {
    state.hearts = Math.max(0, state.hearts - 1);
    renderHearts(state.hearts);
  }
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
  if (!state.levelBoost.moved) {
    state.levelBoost = { ...state.levelBoost, moved: true };
    renderBoosterBar();
  }
  const blocker = rayBlocker(state.occ, lvl.rows, lvl.cols, a.path[0], a.dir);
  if (blocker) block(a, lvl, blocker);
  else escape(a, lvl);
}

/** Level cleared: pay rewards, record progress and show the victory screen. */
export function onLevelWon() {
  playSound('win');
  const p = state.progress;
  const n = state.levelNum;
  // test mode: a level that isn't really unlocked records nothing and pays nothing
  if (isTestPlay(n, p)) {
    const summary = { ...testPlaySummary(wallet()), next: n + 1 };
    setTimeout(() => showVictory(summary), 200);
    return;
  }
  const firstClear = !p.completed.has(n);
  const summary = applyWin(n, state.level.difficulty, state.hearts, state.maxHearts, state.level.arrows.length);
  if (firstClear && p.completed.size % HINT_EVERY === 0) state.hints++;
  p.unlocked = Math.max(p.unlocked, n + 1);
  p.current = n + 1;
  saveProgress();
  setTimeout(() => showVictory({ ...summary, next: p.current }), 200);
}

/** All hearts gone: the win streaks end (not on a test play, which records nothing). */
function onOutOfHearts() {
  clearHint();
  hidePointer();
  if (!isTestPlay(state.levelNum, state.progress)) {
    state.stats = recordLoss(state.stats);
    saveProgress();
  }
  showGameOver();
}

/** Back to the board after hearts were bought (refill or continue). */
export function resumePlay() {
  saveProgress();
  renderHearts(-1);
  closeModals();
  updateTutorial();
}
