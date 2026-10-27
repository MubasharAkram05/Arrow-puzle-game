import { MAX_REFILLS_PER_LEVEL, PRICES } from '../../config.js';
import { restart, resumePlay } from '../../game/game.js';
import { buyHints, refillHeart } from '../../game/rewards.js';
import { updateTutorial, useHint } from '../../game/hints.js';
import { state } from '../../game/state.js';
import { layoutBoard } from '../../render/board.js';
import { renderGrid } from '../../render/hud.js';
import { saveProgress } from '../../storage/save.js';
import { renderCurrency } from '../components/currencyBar.js';
import { $ } from '../dom.js';
import { ask } from '../modals/ask.js';
import { openSettings } from '../modals/settings.js';
import { onReturn } from '../navigation.js';
import { openLevels } from './levels.js';

/** Hint button: use a free hint, or offer to buy one when none are left. */
function onHint() {
  if (state.locked || state.hintId !== -1) return;
  if (state.hints > 0) {
    useHint();
    return;
  }
  ask({
    title: 'Buy a hint?',
    message: 'Highlights an arrow that can escape right now.',
    icon: 'bulb',
    price: PRICES.hint,
    okLabel: 'Buy hint',
    onOk: () => {
      if (!buyHints(PRICES.hint).ok) return;
      renderCurrency();
      useHint();
      saveProgress();
    },
  });
}

/** Tap on the hearts during a level: buy one back (max per level). */
function onHearts() {
  if (state.locked || state.hearts >= state.maxHearts || state.remaining === 0) return;
  const left = MAX_REFILLS_PER_LEVEL - state.refillsUsed;
  ask({
    title: 'Refill a heart?',
    message: `Buy back one heart. Up to ${MAX_REFILLS_PER_LEVEL} refills per level.`,
    blocked: left > 0 ? '' : 'No refills left this level.',
    icon: 'plus',
    price: PRICES.heartRefill,
    okLabel: 'Refill',
    onOk: () => {
      if (!refillHeart().ok) return;
      renderCurrency();
      resumePlay();
    },
  });
}

/** Wire the game screen buttons (top bar and floating buttons). */
export function bindGameScreen() {
  $('btn-levels').addEventListener('click', () => openLevels());
  $('btn-restart').addEventListener('click', restart);
  $('btn-settings').addEventListener('click', openSettings);
  $('btn-hint').addEventListener('click', onHint);
  $('hearts').addEventListener('click', onHearts);
  $('btn-grid').addEventListener('click', () => {
    state.grid = !state.grid;
    renderGrid();
    saveProgress();
  });
  window.addEventListener('resize', layoutBoard);
  onReturn('screen-game', updateTutorial);
}

/** Count play time: one second per tick while a level is on screen, the app is visible and input is open. */
export function startPlayClock() {
  let ticks = 0;
  setInterval(() => {
    if (document.hidden || state.locked || !$('screen-game').classList.contains('active')) return;
    state.stats.playSeconds++;
    if (++ticks % 15 === 0) saveProgress();
  }, 1000);
}
