/**
 * Profile tab: premium avatars and avatar frames (some frames also come free with achievements).
 */
import { COSMETICS } from '../../../config.js';
import { ACHIEVEMENTS } from '../../../game/achievements.js';
import { buyCosmeticItem } from '../../../game/rewards.js';
import { equipShopItem, ownsShopItem, premiumAvatarIndex } from '../../../game/shopEquip.js';
import { state } from '../../../game/state.js';
import { buyFlow, cardState, cosmeticTap, done, saleFor } from './actions.js';
import { card, section } from './cards.js';
import { avatarPreview } from './previews.js';

/** @returns {string[]} keys for the tab's "New" dot */
export const keys = () => [
  ...COSMETICS.avatar.map((a) => `avatar:${a.id}`),
  ...COSMETICS.frame.filter((f) => f.price).map((f) => `frame:${f.id}`),
];

/** Avatar index used by the profile for a premium avatar id (p1 -> 12). */
const avatarIndex = premiumAvatarIndex;

/** @returns {string} tab content */
export function render() {
  const avatars = COSMETICS.avatar.map((a) =>
    card({
      kind: 'avatar',
      id: a.id,
      name: a.name,
      preview: avatarPreview(avatarIndex(a.id)),
      newKey: `avatar:${a.id}`,
      ...cardState('avatar', a),
    }),
  );
  const frames = COSMETICS.frame.map((f) => {
    const ach = f.achievement && ACHIEVEMENTS.find((x) => x.id === f.achievement);
    const note = ach && !state.claimed.has(ach.id) ? `Free with "${ach.title}"` : undefined;
    return card({
      kind: 'frame',
      id: f.id,
      name: f.name,
      note,
      preview: avatarPreview(state.avatar, f.id),
      newKey: f.price ? `frame:${f.id}` : undefined,
      ...cardState('frame', f),
    });
  });
  return section('Premium Avatars', avatars) + section('Avatar Frames', frames);
}

/** Handle a card tap in this tab. */
export function onCard(el) {
  const { kind, id } = el.dataset;
  if (kind === 'frame') return cosmeticTap('frame', id);
  const item = COSMETICS.avatar.find((a) => a.id === id);
  if (ownsShopItem(state, 'avatar', id)) {
    equipShopItem(state, 'avatar', id);
    return done('avatar', id, `${item.name} is your avatar`);
  }
  const price = saleFor('avatar', id) || item.price;
  buyFlow({
    kind,
    id,
    title: `Unlock ${item.name}?`,
    message: 'A premium avatar for your profile.',
    icon: 'user',
    price,
    okLabel: 'Unlock',
    buy: () => buyCosmeticItem('avatar', id, price),
    after: () => equipShopItem(state, 'avatar', id),
    success: `${item.name} unlocked`,
  });
}
