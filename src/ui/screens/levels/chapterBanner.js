/**
 * Chapter banner at the top of each chapter on the level path: gradient card with the chapter number,
 * its name, progress and reward. It sticks to the top while its chapter scrolls by.
 */
import { REWARDS } from '../../../config.js';
import { icon } from '../../components/icons.js';

const NAMES = [
  'Beginner',
  'Explorer',
  'Pathfinder',
  'Tactician',
  'Strategist',
  'Expert',
  'Master',
  'Grandmaster',
  'Trailblazer',
  'Navigator',
  'Mastermind',
  'Legend',
];

/**
 * Chapter name: the first ones are fixed, later chapters cycle through the list with a numeral.
 * @param {number} c
 * @returns {string}
 */
export function chapterName(c) {
  const base = NAMES[(c - 1) % NAMES.length];
  const round = Math.floor((c - 1) / NAMES.length);
  return round ? `${base} ${round + 1}` : base;
}

/**
 * @param {number} c chapter number
 * @param {number} done finished levels in the chapter
 * @param {number} total levels in the chapter
 * @param {boolean} rewarded chapter reward already paid
 * @param {boolean} locked first level not playable yet
 * @returns {string}
 */
export function bannerHTML(c, done, total, rewarded, locked) {
  const reward = rewarded
    ? `<span class="cb-reward got">${icon('check')}Collected</span>`
    : `<span class="cb-reward"><svg class="cur-icon"><use href="#i-coin" /></svg>${REWARDS.chapterCoins}<svg class="cur-icon"><use href="#i-gem" /></svg>${REWARDS.chapterDiamonds}</span>`;
  return `<header class="cb${locked ? ' locked' : ''}">
    <div class="cb-text">
      <small>CHAPTER ${c.toLocaleString('en-US')}</small>
      <b>${chapterName(c)}</b>
    </div>
    <div class="cb-side">
      ${reward}
      <span class="cb-count">${done}/${total}</span>
    </div>
    <div class="cb-bar" aria-hidden="true"><i style="transform:scaleX(${done / total})"></i></div>
  </header>`;
}
