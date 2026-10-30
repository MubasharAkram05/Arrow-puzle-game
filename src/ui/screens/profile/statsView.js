/**
 * Profile stats: three big highlight tiles (daily streak, levels completed, perfect levels) and a compact
 * two-column list (arrows cleared, win streak, best streak, play time). Numbers count up when the page opens.
 * Coins, diamonds, best daily streak, boosters used and hints used are still saved, just not shown here.
 */
import { currentStreak } from '../../../game/daily.js';
import { formatPlayTime } from '../../../game/stats.js';
import { icon } from '../../components/icons.js';
import { $ } from '../../dom.js';

/**
 * What the stats section shows. Pure, for tests.
 * @param {{progress: object, stats: object, daily: object}} s game state
 * @param {number} now
 * @returns {{hero: {id: string, icon: string, value: number, label: string}[], list: {id: string, icon: string, value: number|string, label: string}[]}}
 */
export function statsModel(s, now) {
  return {
    hero: [
      { id: 'daily', icon: 'fire', value: currentStreak(s.daily, now), label: 'Day streak' },
      { id: 'levels', icon: 'levels', value: s.progress.completed.size, label: 'Levels done' },
      { id: 'perfect', icon: 'crown', value: s.progress.perfect.size, label: 'Perfect' },
    ],
    list: [
      { id: 'arrows', icon: 'target', value: s.stats.arrowsCleared, label: 'Arrows cleared' },
      { id: 'streak', icon: 'bolt', value: s.stats.streak, label: 'Win streak' },
      { id: 'best', icon: 'trophy', value: s.stats.bestStreak, label: 'Best streak' },
      { id: 'time', icon: 'clock', value: formatPlayTime(s.stats.playSeconds), label: 'Play time' },
    ],
  };
}

const fmt = (n) => n.toLocaleString('en-US');

/** Number markup that counts up from 0 (strings, like play time, show as they are). */
const num = (v) => (typeof v === 'number' ? `<b data-count="${v}">${fmt(v)}</b>` : `<b>${v}</b>`);

/** Static markup inside the profile page. */
export const statsSkeleton = () =>
  '<h3 class="section-title">Stats</h3><div class="stats-hero" id="stats-hero"></div><ul class="stats-list" id="stats-list"></ul>';

/** Count every [data-count] number up from 0 (skipped when the player prefers reduced motion). */
function countUp(root) {
  const els = [...root.querySelectorAll('[data-count]')];
  if (!els.length || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const t0 = performance.now();
  const ms = 700;
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    const e = 1 - (1 - k) ** 3;
    for (const el of els) el.textContent = fmt(Math.round(Number(el.dataset.count) * e));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/**
 * Fill the stats.
 * @param {object} s game state
 * @param {boolean} [animate] count the numbers up (when the page opens)
 */
export function renderStatsView(s, animate = false) {
  const m = statsModel(s, Date.now());
  $('stats-hero').innerHTML = m.hero
    .map(
      (t) =>
        `<div class="hero-tile hero-${t.id}"><span class="hero-ico">${icon(t.icon)}</span>${num(t.value)}<small>${t.label}</small></div>`,
    )
    .join('');
  $('stats-list').innerHTML = m.list
    .map((t) => `<li>${icon(t.icon)}<span>${t.label}</span>${num(t.value)}</li>`)
    .join('');
  if (animate) {
    countUp($('stats-hero'));
    countUp($('stats-list'));
  }
}
