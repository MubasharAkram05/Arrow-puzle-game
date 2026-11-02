/**
 * Award badge artwork (original SVG, 3.16.0): a soft "clay" medal per achievement group. Each group has its
 * own shape (circle, shield, hexagon, rosette or gem) and colour, built from flat layers (no gradients or ids,
 * so a badge can appear twice on a page): a soft shadow, the body, an inner face raised over a darker inset
 * (the clay emboss), a highlight and the
 * group icon with a soft drop. Earned badges carry their tier number (10, 25, 100...) on a ribbon tag;
 * locked badges are pale grey embossed silhouettes.
 */

/** Icon and colour of each group. */
export const GROUP_LOOK = Object.freeze({
  'first-escape': { icon: 'play', hue: '#3b82f6', shape: 'circle' },
  perfectionist: { icon: 'crown', hue: '#a855f7', shape: 'rosette' },
  'chapter-master': { icon: 'trophy', hue: '#0ea5e9', shape: 'shield' },
  'arrow-hunter': { icon: 'target', hue: '#ef4444', shape: 'hexagon' },
  'no-mistakes': { icon: 'shield', hue: '#14b8a6', shape: 'gem' },
  'shape-solver': { icon: 'shape-heart', hue: '#ec4899', shape: 'circle' },
  'big-spender': { icon: 'shop', hue: '#f59e0b', shape: 'rosette' },
  'level-climber': { icon: 'mountain', hue: '#22a559', shape: 'shield' },
  'brain-power': { icon: 'bulb', hue: '#6366f1', shape: 'hexagon' },
  comeback: { icon: 'heart', hue: '#f43f5e', shape: 'gem' },
  'daily-player': { icon: 'fire', hue: '#f97316', shape: 'circle' },
  'hard-worker': { icon: 'dumbbell', hue: '#64748b', shape: 'rosette' },
});

const look = (group) => GROUP_LOOK[group] || { icon: 'trophy', hue: '#3b82f6', shape: 'circle' };

/** Points around (50, 47): n corners, alternating radii r1/r2 (r2 = r1 for a plain polygon). */
function ring(n, r1, r2, turn = -Math.PI / 2) {
  return Array.from({ length: n }, (_, i) => {
    const a = turn + (Math.PI * 2 * i) / n;
    const r = i % 2 ? r2 : r1;
    return `${(50 + r * Math.cos(a)).toFixed(1)},${(47 + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

/** Body outline of each shape (drawn with a thick round stroke of the same colour, so corners are soft). */
const SHAPES = {
  circle: '<circle cx="50" cy="47" r="36"/>',
  shield: '<path d="M50 11 L80 21 V46 C80 66 66 79 50 86 C34 79 20 66 20 46 V21 Z"/>',
  hexagon: `<polygon points="${ring(6, 37, 37)}"/>`,
  rosette: `<polygon points="${ring(24, 39, 34)}"/>`,
  gem: '<rect x="23" y="20" width="54" height="54" rx="14" transform="rotate(45 50 47)"/>',
};

/** The same shape scaled around the badge centre, moved by (dx, dy). */
const scaled = (shape, k, dx = 0, dy = 0) =>
  `<g transform="translate(${50 + dx} ${47 + dy}) scale(${k}) translate(-50 -47)">${SHAPES[shape]}</g>`;

/** Tier tag colours. */
const TAG = { bronze: '#b8743a', silver: '#8a97a8', gold: '#e0a106', diamond: '#2fa6d6' };

/**
 * Badge SVG.
 * @param {{group: string, state: 'locked'|'earned', tier?: string, tierGoal?: number}} b
 * @param {string} [cls] extra classes (size)
 * @returns {string}
 */
export function clayBadgeSVG(b, cls = '') {
  const { icon, hue, shape } = look(b.group);
  const locked = b.state !== 'earned';
  const goal = b.tierGoal ? b.tierGoal.toLocaleString('en-US') : '';
  const tag =
    !locked && goal
      ? `<g class="clay-tag"><path d="M30 80 h40 l-4 7 4 7 h-40 l4 -7 z" fill="${TAG[b.tier] || TAG.gold}"/><text x="50" y="91">${goal}</text></g>`
      : '';
  return `<svg class="clay clay-${locked ? 'locked' : 'earned'} clay-${shape} ${cls}" viewBox="0 0 100 100" style="--hue:${hue}" aria-hidden="true">
    <ellipse class="clay-shadow" cx="50" cy="92" rx="30" ry="5"/>
    <g class="clay-body">${SHAPES[shape]}</g>
    <g class="clay-inset">${scaled(shape, 0.8, 1.5, 2.5)}</g>
    <g class="clay-face">${scaled(shape, 0.8, -0.5, -1)}</g>
    <ellipse class="clay-shine" cx="38" cy="30" rx="15" ry="8" transform="rotate(-25 38 30)"/>
    <svg class="clay-ico-drop" x="31" y="30" width="38" height="38" viewBox="0 0 24 24"><use href="#i-${icon}"/></svg>
    <svg class="clay-ico" x="31" y="28" width="38" height="38" viewBox="0 0 24 24"><use href="#i-${icon}"/></svg>
    ${tag}
  </svg>`;
}
