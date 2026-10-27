/**
 * Profile: avatar, editable name, player level/XP, stats and achievements.
 */
import { achievementStatus } from '../../game/achievements.js';
import { achievementContext, claim } from '../../game/rewards.js';
import { state } from '../../game/state.js';
import { formatPlayTime, playerLevel, validateName } from '../../game/stats.js';
import { saveProgress } from '../../storage/save.js';
import { AVATAR_COUNT, avatarSVG } from '../components/avatars.js';
import { updateBottomNav } from '../components/bottomNav.js';
import { flyCurrency } from '../components/currencyBar.js';
import { icon } from '../components/icons.js';
import { $ } from '../dom.js';
import { openSettings } from '../modals/settings.js';
import { onReturn, openTab } from '../navigation.js';

/** Static skeleton, built once. */
function buildSkeleton() {
  const picker = Array.from(
    { length: AVATAR_COUNT },
    (_, i) => `<button class="avatar-opt" data-avatar="${i}" aria-label="Avatar ${i + 1}">${avatarSVG(i)}</button>`,
  ).join('');
  $('profile-body').innerHTML = `
    <div class="profile-card">
      <button class="avatar-btn" id="avatar-btn" aria-label="Change avatar" aria-expanded="false"></button>
      <div class="profile-info">
        <label class="name-row">${icon('edit')}<input id="name-input" maxlength="16" autocomplete="off" spellcheck="false" aria-describedby="name-error" /></label>
        <p class="name-error" id="name-error" role="alert"></p>
        <div class="lvl-row"><span class="lvl-badge" id="lvl-badge"></span><div class="xp-bar"><i id="xp-fill"></i></div></div>
        <small class="muted" id="xp-text"></small>
      </div>
    </div>
    <div class="avatar-picker" id="avatar-picker" hidden>${picker}</div>
    <h3 class="section-title">Stats</h3>
    <div class="stat-grid" id="stat-grid"></div>
    <h3 class="section-title">Achievements</h3>
    <ul class="ach-list" id="ach-list"></ul>`;
}

/** Avatar, name and XP bar. */
function renderHeader() {
  $('avatar-btn').innerHTML = avatarSVG(state.avatar);
  document
    .querySelectorAll('.avatar-opt')
    .forEach((b) => b.classList.toggle('on', Number(b.dataset.avatar) === state.avatar));
  if (document.activeElement !== $('name-input')) $('name-input').value = state.name;
  const lv = playerLevel(state.xp);
  $('lvl-badge').textContent = `Lv ${lv.level}`;
  $('xp-fill').style.transform = `scaleX(${lv.into / lv.need})`;
  $('xp-text').textContent = `${lv.into} / ${lv.need} XP to level ${lv.level + 1}`;
}

/** The eight stat cards. */
function renderStats() {
  const p = state.progress;
  const s = state.stats;
  const cards = [
    ['levels', p.completed.size, 'Levels completed'],
    ['coin', state.coins, 'Coins', true],
    ['gem', state.diamonds, 'Diamonds', true],
    ['target', s.arrowsCleared, 'Arrows cleared'],
    ['crown-o', p.perfect.size, 'Perfect levels'],
    ['fire', s.streak, 'Win streak'],
    ['trophy', s.bestStreak, 'Best streak'],
    ['clock', formatPlayTime(s.playSeconds), 'Play time'],
  ];
  $('stat-grid').innerHTML = cards
    .map(([ic, value, label, colored]) => {
      const pic = colored ? `<svg class="cur-icon"><use href="#i-${ic}" /></svg>` : icon(ic);
      return `<div class="stat-card">${pic}<b>${typeof value === 'number' ? value.toLocaleString('en-US') : value}</b><small>${label}</small></div>`;
    })
    .join('');
}

/** Achievement rows with progress bars and claim buttons. */
function renderAchievements() {
  $('ach-list').innerHTML = achievementStatus(achievementContext(), state.claimed)
    .map(({ def, value, done, claimed, claimable }) => {
      const action = claimable
        ? `<button class="btn primary claim-btn" data-claim="${def.id}">Claim</button>`
        : claimed
          ? `<span class="claimed">${icon('check')}Claimed</span>`
          : '';
      return `<li class="ach${done ? ' done' : ''}">
        <span class="ach-badge">${icon(def.icon)}</span>
        <div class="ach-body">
          <div class="ach-top"><b>${def.title}</b><span class="ach-reward"><svg class="cur-icon"><use href="#i-gem" /></svg>${def.reward}</span></div>
          <small class="muted">${def.desc}</small>
          <div class="ach-progress"><div class="xp-bar"><i style="transform:scaleX(${value / def.goal})"></i></div><small>${value.toLocaleString('en-US')}/${def.goal.toLocaleString('en-US')}</small></div>
        </div>
        ${action}
      </li>`;
    })
    .join('');
}

/** Refresh everything on the page. */
function renderProfile() {
  renderHeader();
  renderStats();
  renderAchievements();
}

/** Open the profile tab. */
export function openProfile() {
  renderProfile();
  openTab('screen-profile');
}

/** Claim: confetti burst around the button, diamonds fly to the counter. */
function onClaim(btn) {
  const before = state.diamonds;
  const res = claim(btn.dataset.claim);
  if (!res.ok) return;
  saveProgress();
  const burst = document.createElement('span');
  burst.className = 'burst';
  burst.innerHTML = '<i></i>'.repeat(10);
  btn.parentElement.appendChild(burst);
  flyCurrency(btn, 'diamonds', before, res.diamonds);
  setTimeout(() => {
    renderAchievements();
    renderStats();
    updateBottomNav('screen-profile');
  }, 700);
}

/** Name field: validate while typing, save when valid. */
function onNameInput() {
  const input = $('name-input');
  const err = validateName(input.value);
  $('name-error').textContent = err;
  input.setAttribute('aria-invalid', String(!!err));
  if (!err) {
    state.name = input.value.trim();
    saveProgress();
  }
}

/** Wire the profile page once. */
export function bindProfile() {
  buildSkeleton();
  $('btn-profile-settings').addEventListener('click', openSettings);
  $('avatar-btn').addEventListener('click', () => {
    const picker = $('avatar-picker');
    picker.hidden = !picker.hidden;
    $('avatar-btn').setAttribute('aria-expanded', String(!picker.hidden));
  });
  $('avatar-picker').addEventListener('click', (e) => {
    const b = e.target.closest('.avatar-opt');
    if (!b) return;
    state.avatar = Number(b.dataset.avatar);
    saveProgress();
    $('avatar-picker').hidden = true;
    renderHeader();
  });
  $('name-input').addEventListener('input', onNameInput);
  $('name-input').addEventListener('blur', () => {
    $('name-input').value = state.name;
    $('name-error').textContent = '';
  });
  $('name-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') e.currentTarget.blur();
  });
  $('ach-list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-claim]');
    if (b) onClaim(b);
  });
  onReturn('screen-profile', renderProfile);
}
