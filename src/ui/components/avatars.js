/**
 * 12 built-in avatars drawn from a few parts (ears, eyes, mouth, colour). No photos, no login.
 */

/** [background, ears, eyes, mouth] for each avatar. */
const SET = [
  ['#FFB547', 'cat', 'dots', 'cat'],
  ['#5AC8FA', 'none', 'happy', 'smile'],
  ['#FF7A8A', 'bear', 'dots', 'smile'],
  ['#7BD389', 'antenna', 'big', 'open'],
  ['#A78BFA', 'bunny', 'happy', 'cat'],
  ['#FF9F5A', 'horns', 'wink', 'smile'],
  ['#4DD0E1', 'none', 'glasses', 'flat'],
  ['#F78FB3', 'cat', 'happy', 'open'],
  ['#9CCC65', 'bear', 'big', 'cat'],
  ['#64B5F6', 'antenna', 'wink', 'smile'],
  ['#FFD54F', 'bunny', 'dots', 'open'],
  ['#BA68C8', 'horns', 'glasses', 'smile'],
  // premium (bought with diamonds): index 12-17 = ids p1-p6 in config COSMETICS.avatar
  ['#FFC83D', 'none', 'happy', 'smile', 'crown'],
  ['#2F3A56', 'cat', 'dots', 'smile', 'shades'],
  ['#FF8FB1', 'none', 'stars', 'open', ''],
  ['#5B6CFF', 'none', 'big', 'smile', 'helmet'],
  ['#7E57C2', 'none', 'dots', 'flat', 'wizard'],
  ['#263238', 'none', 'dots', 'flat', 'ninja'],
];
/** Free avatars (always available). */
export const AVATAR_COUNT = 12;
/** Free + premium avatars. */
export const AVATAR_TOTAL = SET.length;

/**
 * Premium cosmetic id for an avatar index ("p1".."p6"), or null for a free one.
 * @param {number} i
 * @returns {string|null}
 */
export function premiumId(i) {
  return i >= AVATAR_COUNT && i < AVATAR_TOTAL ? `p${i - AVATAR_COUNT + 1}` : null;
}

const INK = '#1E2533';
const FACE = '#FFF8EE';

const EARS = {
  none: '',
  cat: `<path d="M17 24 20 8l11 10zM47 24 44 8 33 18z" fill="${FACE}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`,
  bear: `<circle cx="18" cy="17" r="7" fill="${FACE}" stroke="${INK}" stroke-width="2.5"/><circle cx="46" cy="17" r="7" fill="${FACE}" stroke="${INK}" stroke-width="2.5"/>`,
  bunny: `<ellipse cx="23" cy="10" rx="5" ry="11" fill="${FACE}" stroke="${INK}" stroke-width="2.5"/><ellipse cx="41" cy="10" rx="5" ry="11" fill="${FACE}" stroke="${INK}" stroke-width="2.5"/>`,
  antenna: `<path d="M32 15V5" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/><circle cx="32" cy="5" r="3.5" fill="#FF473E" stroke="${INK}" stroke-width="2"/>`,
  horns: `<path d="M20 20c-4-6-3-11 1-14 0 5 3 8 6 10zM44 20c4-6 3-11-1-14 0 5-3 8-6 10z" fill="#FFE082" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>`,
};
const EYES = {
  stars: `<path d="m25 29 1.6 3.4 3.7.4-2.8 2.5.8 3.7-3.3-1.9-3.3 1.9.8-3.7-2.8-2.5 3.7-.4zm14 0 1.6 3.4 3.7.4-2.8 2.5.8 3.7-3.3-1.9-3.3 1.9.8-3.7-2.8-2.5 3.7-.4z" fill="#FFB300" stroke="${INK}" stroke-width="1.2"/>`,
  dots: `<circle cx="25" cy="34" r="3" fill="${INK}"/><circle cx="39" cy="34" r="3" fill="${INK}"/>`,
  big: `<circle cx="25" cy="33" r="5" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="39" cy="33" r="5" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="26" cy="34" r="2.2" fill="${INK}"/><circle cx="40" cy="34" r="2.2" fill="${INK}"/>`,
  happy: `<path d="M21 35q4-5 8 0M35 35q4-5 8 0" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`,
  wink: `<circle cx="25" cy="34" r="3" fill="${INK}"/><path d="M35 34h8" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`,
  glasses: `<circle cx="25" cy="34" r="5.5" fill="none" stroke="${INK}" stroke-width="2.2"/><circle cx="39" cy="34" r="5.5" fill="none" stroke="${INK}" stroke-width="2.2"/><path d="M30.5 34h3" stroke="${INK}" stroke-width="2.2"/><circle cx="25" cy="34" r="1.8" fill="${INK}"/><circle cx="39" cy="34" r="1.8" fill="${INK}"/>`,
};
const EXTRAS = {
  '': '',
  crown: `<path d="M18 16 20 6l6 6 6-8 6 8 6-6 2 10z" fill="#FFD54A" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
  shades: `<path d="M18 30h28v4q-1 6-7 6t-7-6q0-2-0 0q0 6-7 6t-7-6z" fill="${INK}"/>`,
  helmet: `<circle cx="32" cy="36" r="24" fill="rgba(200,230,255,.35)" stroke="#E3ECF8" stroke-width="3"/>`,
  wizard: `<path d="M16 22 32 0l16 22z" fill="#5E35B1" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><circle cx="34" cy="12" r="2" fill="#FFD54A"/>`,
  ninja: `<path d="M13 30h38v10H13z" fill="#37474F"/><path d="M51 33l9-4v10z" fill="#37474F"/>`,
};
const MOUTHS = {
  smile: `<path d="M26 43q6 6 12 0" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`,
  open: `<path d="M27 42q5 0 10 0q0 7-5 7t-5-7z" fill="#FF7A8A" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>`,
  cat: `<path d="M26 42q3 4 6 0q3 4 6 0" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`,
  flat: `<path d="M27 44h10" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`,
};

/**
 * SVG markup for an avatar.
 * @param {number} i avatar index (wraps around)
 * @returns {string}
 */
export function avatarSVG(i) {
  const [bg, ears, eyes, mouth, extra = ''] = SET[((i % SET.length) + SET.length) % SET.length];
  return `<svg class="avatar" viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="32" fill="${bg}"/>
    ${EARS[ears]}
    <ellipse cx="32" cy="37" rx="19" ry="17" fill="${FACE}" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="20" cy="41" r="3" fill="#FF9EB1" opacity=".7"/><circle cx="44" cy="41" r="3" fill="#FF9EB1" opacity=".7"/>
    ${EYES[eyes]}${MOUTHS[mouth]}${EXTRAS[extra]}
  </svg>`;
}
