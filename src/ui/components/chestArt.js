/**
 * Reward chest art for the Weekly Quests bar (3.22.0, original). One SVG per tier; the lid is its own group
 * so CSS can open it. States come from classes on the button (locked, ready, open).
 */
const TIERS = {
  1: { body: '#C9853F', dark: '#94582A', band: '#E9B45E', gem: '#FFD86B' },
  2: { body: '#5E8FD8', dark: '#3A63A8', band: '#C9D8F2', gem: '#9EE7FF' },
  3: { body: '#8C5BE0', dark: '#5E37A8', band: '#F2C14E', gem: '#FF8FD8' },
};

/**
 * @param {1|2|3} tier
 * @returns {string} SVG markup
 */
export function chestSVG(tier) {
  const c = TIERS[tier] || TIERS[1];
  return `<svg class="chest-art" viewBox="0 0 64 56" aria-hidden="true">
    <ellipse cx="32" cy="52" rx="22" ry="3.5" fill="rgba(0,0,0,0.15)"/>
    <g class="chest-glow"><circle cx="32" cy="24" r="22" fill="${c.gem}" opacity="0.35"/></g>
    <rect x="9" y="26" width="46" height="24" rx="5" fill="${c.body}"/>
    <rect x="9" y="26" width="46" height="6" fill="${c.dark}" opacity="0.5"/>
    <rect x="27" y="26" width="10" height="24" fill="${c.band}"/>
    <g class="chest-lid">
      <path d="M9 27V20a10 10 0 0 1 10-10h26a10 10 0 0 1 10 10v7z" fill="${c.body}"/>
      <path d="M9 22h46" stroke="${c.dark}" stroke-width="2" opacity="0.5"/>
      <rect x="27" y="10" width="10" height="17" fill="${c.band}"/>
      <rect x="28" y="22" width="8" height="9" rx="2" fill="${c.dark}"/>
      <circle cx="32" cy="26.5" r="2" fill="${c.gem}"/>
    </g>
  </svg>`;
}
