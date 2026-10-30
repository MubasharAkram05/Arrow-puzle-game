/**
 * Award badge artwork (original SVG): a hexagon in the group's colour with its icon, a tier ring
 * (bronze, silver, gold, diamond) and the step numeral. Locked badges are a grey silhouette with a
 * progress ring around them.
 */

/** Icon inside each group's badge. */
const ICONS = {
  'first-escape': 'play',
  perfectionist: 'crown',
  'chapter-master': 'trophy',
  'arrow-hunter': 'target',
  'no-mistakes': 'shield',
  'shape-solver': 'shape-heart',
  'big-spender': 'shop',
  'level-climber': 'mountain',
  'brain-power': 'bulb',
  comeback: 'heart',
  'daily-player': 'fire',
  'hard-worker': 'dumbbell',
};

/** Body colour of each group's badge. */
const HUES = {
  'first-escape': '#3b82f6',
  perfectionist: '#a855f7',
  'chapter-master': '#0ea5e9',
  'arrow-hunter': '#ef4444',
  'no-mistakes': '#14b8a6',
  'shape-solver': '#ec4899',
  'big-spender': '#f59e0b',
  'level-climber': '#22a559',
  'brain-power': '#6366f1',
  comeback: '#f43f5e',
  'daily-player': '#f97316',
  'hard-worker': '#64748b',
};

/** Hexagon points (pointy top) around (50, 50). */
const hex = (r) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
const OUTER = hex(41);
const INNER = hex(33);
const RING = 2 * Math.PI * 47;

/**
 * Badge SVG.
 * @param {import('../../game/badges.js').Badge} b
 * @param {string} [cls] extra classes
 * @returns {string}
 */
export function badgeSVG(b, cls = '') {
  const progress = b.goal ? Math.min(1, b.value / b.goal) : 1;
  const ring =
    b.state === 'locked'
      ? `<circle class="bdg-track" cx="50" cy="50" r="47"/><circle class="bdg-progress" cx="50" cy="50" r="47" stroke-dasharray="${(RING * progress).toFixed(1)} ${RING.toFixed(1)}"/>`
      : '';
  // step numeral on a small tag at the bottom of the badge
  const label =
    b.label && b.state !== 'locked'
      ? `<g class="bdg-tag"><rect x="36" y="78" width="28" height="17" rx="8.5"/><text x="50" y="91">${b.label}</text></g>`
      : '';
  return `<svg class="bdg bdg-${b.state} tier-${b.tier} ${cls}" viewBox="0 0 100 100" style="--hue:${HUES[b.group] || '#3b82f6'}" aria-hidden="true">
    ${ring}
    <polygon class="bdg-rim" points="${OUTER}"/>
    <polygon class="bdg-body" points="${INNER}"/>
    <path class="bdg-shine" d="M30 26 L50 15 L70 26 L64 30 L50 22 L36 30 Z"/>
    <svg class="bdg-ico" x="32" y="31" width="36" height="36" viewBox="0 0 24 24"><use href="#i-${ICONS[b.group] || 'trophy'}"/></svg>
    ${label}
  </svg>`;
}
