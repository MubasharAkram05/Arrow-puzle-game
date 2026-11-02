/**
 * Daily Reward artwork (original SVG, 3.16.0): a coin pile, a cut gem, a hint bulb and the big Day 7 gift box.
 * Flat shapes with a soft highlight, readable in light and dark mode.
 */

/** A pile of three gold coins. */
export const COIN_PILE = `<svg class="da da-coins" viewBox="0 0 48 40" aria-hidden="true">
  <ellipse cx="24" cy="36" rx="18" ry="3" class="da-shadow"/>
  <g class="da-coin"><ellipse cx="16" cy="30" rx="11" ry="4.5"/><rect x="5" y="25" width="22" height="5"/><ellipse cx="16" cy="25" rx="11" ry="4.5" class="da-top"/></g>
  <g class="da-coin"><ellipse cx="32" cy="30" rx="11" ry="4.5"/><rect x="21" y="25" width="22" height="5"/><ellipse cx="32" cy="25" rx="11" ry="4.5" class="da-top"/></g>
  <g class="da-coin"><ellipse cx="24" cy="20" rx="11" ry="4.5"/><rect x="13" y="12" width="22" height="8"/><ellipse cx="24" cy="12" rx="11" ry="4.5" class="da-top"/><path d="M20 12 h8" class="da-mark"/></g>
</svg>`;

/** A cut gem. */
export const GEM = `<svg class="da da-gem" viewBox="0 0 48 40" aria-hidden="true">
  <ellipse cx="24" cy="37" rx="13" ry="2.5" class="da-shadow"/>
  <path d="M14 6 H34 L43 16 L24 35 L5 16 Z" class="da-gem-body"/>
  <path d="M5 16 H43 M14 6 L19 16 L24 35 L29 16 L34 6" class="da-gem-cut"/>
  <path d="M15 9 L12 14" class="da-gem-shine"/>
</svg>`;

/** A hint bulb. */
export const BULB = `<svg class="da da-bulb" viewBox="0 0 48 40" aria-hidden="true">
  <ellipse cx="24" cy="38" rx="9" ry="2" class="da-shadow"/>
  <path d="M24 4 C32 4 37 10 37 16 C37 21 34 24 31 27 V30 H17 V27 C14 24 11 21 11 16 C11 10 16 4 24 4 Z" class="da-bulb-glass"/>
  <rect x="17" y="30" width="14" height="6" rx="2" class="da-bulb-base"/>
  <path d="M19 10 C17 12 16 14 16 16" class="da-bulb-shine"/>
</svg>`;

/** The big Day 7 gift box with a ribbon and bow. */
export const GIFT = `<svg class="da da-gift" viewBox="0 0 80 84" aria-hidden="true">
  <ellipse cx="40" cy="80" rx="30" ry="4" class="da-shadow"/>
  <rect x="10" y="36" width="60" height="42" rx="5" class="da-gift-box"/>
  <rect x="6" y="26" width="68" height="14" rx="4" class="da-gift-lid"/>
  <rect x="35" y="26" width="10" height="52" class="da-gift-ribbon"/>
  <path d="M40 26 C30 10 16 12 20 22 C22 27 32 27 40 26 Z" class="da-gift-bow"/>
  <path d="M40 26 C50 10 64 12 60 22 C58 27 48 27 40 26 Z" class="da-gift-bow"/>
  <circle cx="40" cy="25" r="5" class="da-gift-knot"/>
  <rect x="14" y="40" width="18" height="4" rx="2" class="da-gift-shine"/>
</svg>`;

/** Big icon for a reward kind. */
export const rewardArt = (kind) => (kind === 'diamonds' ? GEM : kind === 'hints' ? BULB : COIN_PILE);
