/**
 * Weekly Quests screen (3.22.0): banner with the reset countdown, the 0-100 points bar with three chests,
 * and the week's six quests. Rules: src/game/quests.js; state: src/game/questState.js.
 */
import { QUESTS } from '../../config.js';
import { chestRows, questLeftText, questRows, resetCountdown, weekPoints } from '../../game/quests.js';
import { claimQuestPoints, openQuestChest, syncQuests } from '../../game/questState.js';
import { state } from '../../game/state.js';
import { saveProgress } from '../../storage/save.js';
import { renderNavDots } from '../components/bottomNav.js';
import { chestSVG } from '../components/chestArt.js';
import { flyCurrency } from '../components/currencyBar.js';
import { icon } from '../components/icons.js';
import { toast } from '../components/toast.js';
import { $ } from '../dom.js';
import { openTab } from '../navigation.js';
import { claimButtonHTML } from './profile/claimButton.js';

const fmt = (n) => n.toLocaleString('en-US');
const cur = (kind, n) =>
  `<span class="q-cur"><svg class="cur-icon" aria-hidden="true"><use href="#i-${kind}" /></svg>${fmt(n)}</span>`;

/** Reward as icons: coins, diamonds, hints. */
function rewardHTML(r) {
  return [
    r.coins ? cur('coin', r.coins) : '',
    r.diamonds ? cur('gem', r.diamonds) : '',
    r.hints ? `<span class="q-cur">${icon('bulb')}${r.hints}</span>` : '',
  ].join('');
}

/** Words for a reward (aria labels and toasts). */
const rewardText = (r) =>
  [r.coins && `${fmt(r.coins)} coins`, r.diamonds && `${r.diamonds} diamonds`, r.hints && `${r.hints} hint`]
    .filter(Boolean)
    .join(' + ');

/** Banner with the countdown. */
const bannerHTML = () => `
  <div class="q-banner">
    <span class="q-banner-icon">${icon('clipboard')}</span>
    <div class="q-banner-text"><b>Weekly Quests</b><small>New quests every Monday</small></div>
    <span class="q-timer" aria-label="Time until the quests reset">${icon('clock')}<span id="q-countdown"></span></span>
  </div>`;

/** Points bar with the chests on it. */
function pointsHTML(rec) {
  const pts = weekPoints(rec);
  const chests = chestRows(rec)
    .map((c, i) => {
      const label = `Chest at ${c.at} points: ${rewardText(c.reward)}${c.state === 'open' ? ', opened' : c.state === 'ready' ? ', ready to open' : ''}`;
      return `<div class="q-chest-slot" style="--at:${c.at / QUESTS.maxPoints}">
        <button type="button" class="q-chest is-${c.state}" data-chest="${c.at}" aria-label="${label}" ${c.state === 'ready' ? '' : 'aria-disabled="true"'}>
          ${chestSVG(i + 1)}<span class="burst" aria-hidden="true"></span>
          ${c.state === 'open' ? `<span class="q-chest-check">${icon('check')}</span>` : ''}
        </button>
        <span class="q-chest-at">${c.at}</span>
        <span class="q-chest-reward">${rewardHTML(c.reward)}</span>
      </div>`;
    })
    .join('');
  return `
  <div class="q-points">
    <div class="q-points-head"><b>Points</b><span><b id="q-pts">${pts}</b> / ${QUESTS.maxPoints}</span></div>
    <div class="q-track-wrap">
      <div class="q-track" role="progressbar" aria-label="Quest points" aria-valuemin="0" aria-valuemax="${QUESTS.maxPoints}" aria-valuenow="${pts}">
        <i style="--p:${pts / QUESTS.maxPoints}"></i>
      </div>
      ${chests}
    </div>
  </div>`;
}

/** One quest row: points on the left, title and bar in the middle, the Claim button on the right. */
function rowHTML(q) {
  const pct = Math.min(1, q.value / q.goal);
  const label = `${fmt(q.value)}/${fmt(q.goal)}`;
  return `<li class="q-row ach-${q.state}" data-id="${q.id}">
    <span class="q-pts-badge" aria-label="${q.points} points"><b>${q.points}</b><small>pts</small></span>
    <div class="q-main">
      <div class="q-title">${icon(q.icon)}<b>${q.title}</b></div>
      <div class="ach-bar" style="--p:${pct}" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="${q.goal}" aria-valuenow="${q.value}">
        <i></i><span>${label}</span><span class="on" aria-hidden="true">${label}</span>
      </div>
    </div>
    ${claimButtonHTML(q)}
  </li>`;
}

/** Draw the whole screen. */
export function renderQuests() {
  const rec = state.quests;
  $('quests-body').innerHTML = `${bannerHTML()}${pointsHTML(rec)}
    <h3 class="section-title">This week</h3>
    <ul class="ach-list q-list">${questRows(rec).map(rowHTML).join('')}</ul>
    <p class="q-note">Unclaimed quests and chests are lost at the reset.</p>`;
  tick();
}

/** Countdown text; a new week while the screen is open redraws it. */
function tick() {
  const el = document.getElementById('q-countdown');
  if (!el) return;
  if (syncQuests()) {
    saveProgress();
    renderQuests();
    renderNavDots();
    return;
  }
  el.textContent = resetCountdown(state.quests, Date.now());
}

/** Open the tab. */
export function openQuests() {
  if (syncQuests()) saveProgress();
  renderQuests();
  openTab('screen-quests');
}

/** Wire the screen once. */
export function bindQuests() {
  $('quests-body').addEventListener('click', (e) => {
    const chest = e.target.closest('[data-chest]');
    if (chest) return onChest(chest);
    const locked = e.target.closest('[data-locked]');
    if (locked) {
      const row = questRows(state.quests).find((q) => q.id === locked.dataset.locked);
      locked.classList.remove('shake');
      void locked.offsetWidth;
      locked.classList.add('shake');
      if (row) toast(questLeftText(row));
      return;
    }
    const btn = e.target.closest('[data-claim]');
    if (!btn) return;
    const res = claimQuestPoints(btn.dataset.claim);
    if (!res.ok) return renderQuests();
    saveProgress();
    btn.disabled = true;
    toast(`+${res.points} points`);
    renderQuests();
    renderNavDots();
  });
  setInterval(() => {
    if ($('screen-quests').classList.contains('active')) tick();
  }, 30000);
}

/** Tap on a chest: open it when ready, otherwise say how many points are missing. */
function onChest(btn) {
  const at = Number(btn.dataset.chest);
  const c = chestRows(state.quests).find((x) => x.at === at);
  if (!c) return;
  if (c.state === 'open') return toast('Already opened this week');
  if (c.state === 'locked') {
    btn.classList.remove('shake');
    void btn.offsetWidth;
    btn.classList.add('shake');
    return toast(`Earn ${at - weekPoints(state.quests)} more points to open it`);
  }
  const res = openQuestChest(at);
  if (!res.ok) return renderQuests();
  saveProgress();
  btn.classList.add('opening');
  btn.querySelector('.burst').innerHTML = '<i></i>'.repeat(10);
  if (res.reward.coins) flyCurrency(btn, 'coins', res.before.coins, res.reward.coins);
  if (res.reward.diamonds) flyCurrency(btn, 'diamonds', res.before.diamonds, res.reward.diamonds, 150);
  toast(`Chest opened: ${rewardText(res.reward)}`);
  renderNavDots();
  setTimeout(renderQuests, 900);
}
