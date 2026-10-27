import { startLevel } from '../../game/game.js';
import { state } from '../../game/state.js';
import { drawArrows, strokeMetrics } from '../../render/board.js';
import { startConfetti } from '../../render/confetti.js';
import { flyCurrency, renderCurrency } from '../components/currencyBar.js';
import { $ } from '../dom.js';
import { goHome } from '../screens/home.js';
import { closeModals, onModalBack, openModal } from './modal.js';

const CUR = (kind, n) =>
  `<span class="amt"><svg class="cur-icon" aria-hidden="true"><use href="#i-${kind}" /></svg>+${n}</span>`;

/** Fill the reward breakdown (base, hearts, difficulty, perfect, chapter...) and the totals. */
function renderRewards(reward, xp) {
  $('reward-lines').innerHTML = reward.lines
    .map((l) => {
      const coins = l.coins ? `<span class="amt">${l.coins > 0 ? '+' : ''}${l.coins}</span>` : '';
      const gems = l.diamonds ? CUR('gem', l.diamonds) : '';
      return `<li><span>${l.label}</span><span>${coins}${gems}</span></li>`;
    })
    .join('');
  $('reward-total').innerHTML =
    CUR('coin', reward.coins) +
    (reward.diamonds ? CUR('gem', reward.diamonds) : '') +
    `<span class="xp">+${xp} XP</span>`;
}

/** Draw the solved level in the white card. */
function renderPreview() {
  const preview = state.level.arrows.map((a) => ({ id: a.id, dir: a.dir, path: a.path }));
  const { rows, cols } = state.level;
  // small boards sit compact in the middle of the card, big ones fill most of it
  const box = $('mini-card').clientWidth * 0.8;
  const n = Math.max(rows, cols);
  const cell = Math.min(box / n, Math.max(14, 90 / n));
  const svg = $('mini-board');
  drawArrows(svg, preview, state.level, false, strokeMetrics(cell, 0.62));
  svg.setAttribute('width', Math.floor(cell * cols));
  svg.setAttribute('height', Math.floor(cell * rows));
}

/**
 * Show the victory screen; coins and diamonds fly from the card to the counters.
 * @param {{reward: object, xp: number, before: {coins: number, diamonds: number}}} summary from applyWin
 */
export function showVictory(summary) {
  $('next-sub').textContent = `Level ${state.progress.current}`;
  renderRewards(summary.reward, summary.xp);
  renderCurrency(summary.before, $('modal-victory'));
  openModal('modal-victory');
  renderPreview();
  startConfetti();
  const card = $('mini-card');
  flyCurrency(card, 'coins', summary.before.coins, summary.reward.coins, 450);
  flyCurrency(card, 'diamonds', summary.before.diamonds, summary.reward.diamonds, 750);
}

/** Wire the victory buttons. Back acts like "Main". */
export function bindVictory() {
  $('btn-next').addEventListener('click', () => {
    closeModals();
    startLevel(state.progress.current);
  });
  $('btn-main').addEventListener('click', goHome);
  onModalBack('modal-victory', goHome);
}
