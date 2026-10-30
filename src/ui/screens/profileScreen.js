/**
 * Profile: avatar, editable name, player level/XP, newest award badges, stats, (hidden) shape collection and
 * the award badges.
 */
import { state } from '../../game/state.js';
import { playerLevel, validateName } from '../../game/stats.js';
import { saveProgress } from '../../storage/save.js';
import { AVATAR_TOTAL, avatarSVG, premiumId } from '../components/avatars.js';
import { COSMETICS, SHOW_SHAPE_COLLECTION } from '../../config.js';
import { buyCosmeticItem } from '../../game/rewards.js';
import { renderCurrency } from '../components/currencyBar.js';
import { ask } from '../modals/ask.js';
import { updateBottomNav } from '../components/bottomNav.js';
import { icon } from '../components/icons.js';
import { $ } from '../dom.js';
import { openSettings } from '../modals/settings.js';
import { awardsSkeleton, bindAwards, recentSkeleton, renderAwards } from './profile/awardsView.js';
import { renderStatsView, statsSkeleton } from './profile/statsView.js';
import { bindCollection, collectionSkeleton, renderCollection } from './shapeCollection.js';
import { onReturn, openTab } from '../navigation.js';

/** Static skeleton, built once. */
function buildSkeleton() {
  const picker = Array.from(
    { length: AVATAR_TOTAL },
    (_, i) =>
      `<button class="avatar-opt" data-avatar="${i}" aria-label="Avatar ${i + 1}">${avatarSVG(i)}<span class="avatar-lock"><svg class="cur-icon"><use href="#i-gem" /></svg>2</span></button>`,
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
    ${recentSkeleton()}
    ${statsSkeleton()}
    ${SHOW_SHAPE_COLLECTION ? collectionSkeleton() : ''}
    ${awardsSkeleton()}`;
}

/** Avatar, name and XP bar. */
function renderHeader() {
  $('avatar-btn').innerHTML = avatarSVG(state.avatar);
  document.querySelectorAll('.avatar-opt').forEach((b) => {
    const i = Number(b.dataset.avatar);
    const pid = premiumId(i);
    b.classList.toggle('on', i === state.avatar);
    b.classList.toggle('locked', !!pid && !state.cosmetics.owned.avatar.includes(pid));
  });
  if (document.activeElement !== $('name-input')) $('name-input').value = state.name;
  const lv = playerLevel(state.xp);
  $('lvl-badge').textContent = `Lv ${lv.level}`;
  $('xp-fill').style.transform = `scaleX(${lv.into / lv.need})`;
  $('xp-text').textContent = `${lv.into} / ${lv.need} XP to level ${lv.level + 1}`;
}

/**
 * Refresh everything on the page.
 * @param {boolean} [animate] count the stat numbers up (when the page opens)
 */
function renderProfile(animate = false) {
  renderHeader();
  renderStatsView(state, animate);
  if (SHOW_SHAPE_COLLECTION) renderCollection();
  renderAwards();
}

/** Open the profile tab. */
export function openProfile() {
  renderProfile(true);
  openTab('screen-profile');
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

/** Offer a premium avatar for diamonds, then wear it. */
function buyAvatar(i) {
  const item = COSMETICS.avatar.find((a) => a.id === premiumId(i));
  ask({
    title: `Unlock ${item.name}?`,
    message: 'A premium avatar for your profile.',
    icon: 'user',
    price: item.price,
    okLabel: 'Unlock',
    onOk: () => {
      if (!buyCosmeticItem('avatar', item.id).ok) return;
      state.avatar = i;
      saveProgress();
      renderCurrency();
      renderHeader();
    },
  });
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
    const i = Number(b.dataset.avatar);
    if (b.classList.contains('locked')) return buyAvatar(i);
    state.avatar = i;
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
  bindAwards(() => {
    renderStatsView(state);
    updateBottomNav('screen-profile');
  });
  if (SHOW_SHAPE_COLLECTION) bindCollection();
  onReturn('screen-profile', () => renderProfile());
}
