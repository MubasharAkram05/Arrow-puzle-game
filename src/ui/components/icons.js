/**
 * Inline SVG icon sprite (24x24). Outlined icons take colour from CSS (stroke: currentColor);
 * coin and gem are filled with fixed colours. Mounted once at boot.
 */

/** Outlined icon bodies by symbol id. */
const OUTLINED = {
  'i-back': '<path d="m15 18-6-6 6-6"/>',
  'i-restart': '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  'i-gear':
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  'i-bulb':
    '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  'i-pinch': '<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="m21 3-7 7"/><path d="m3 21 7-7"/>',
  'i-grid': '<path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3 8 21"/><path d="M16 3l-2 18"/>',
  'i-nav': '<path d="M3 11 22 2l-9 19-2-8z"/>',
  'i-crown': '<path d="M3 18 2 7l5.5 4.5L12 4l4.5 7.5L22 7l-1 11z"/><path d="M4 21h16"/>',
  'i-close': '<path d="M18 6 6 18M6 6l12 12"/>',
  'i-lock': '<rect width="16" height="11" x="4" y="11" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  'i-check': '<path d="M20 6 9 17l-5-5"/>',
  'i-mountain': '<path d="m3 20 6.5-11 4 6.5 2.5-4L21 20z"/><path d="m8 11.5 1.5 1.5 1.5-1.5"/>',
  'i-heart':
    '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  'i-dumbbell':
    '<path d="M6.5 6.5v11"/><path d="M17.5 6.5v11"/><path d="M3 9v6"/><path d="M21 9v6"/><path d="M6.5 12h11"/>',
  'i-paw':
    '<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.05Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/>',
  'i-letter': '<path d="M4 20 12 4l8 16"/><path d="M7.5 13h9"/>',
  'i-play': '<path d="M7 4.5v15l12-7.5z"/>',
  'i-heart-crack':
    '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="m12 13-1-1 2-2-3-3 2-2"/>',
  'i-levels':
    '<rect width="7" height="7" x="3" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="14" rx="1.5"/><rect width="7" height="7" x="3" y="14" rx="1.5"/>',
  'i-volume':
    '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
  'i-vibrate':
    '<rect width="8" height="14" x="8" y="5" rx="1.5"/><path d="m2 8 2 2-2 2 2 2"/><path d="m22 8-2 2 2 2-2 2"/>',
  'i-sun':
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  'i-moon': '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  'i-auto': '<circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M12 7h4M12 11h6M12 15h5"/>',
  'i-trash':
    '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  'i-home': '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/>',
  'i-shop': '<path d="M5 8h14l-1.2 11.2A2 2 0 0 1 15.8 21H8.2a2 2 0 0 1-2-1.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  'i-user': '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  'i-plus': '<path d="M12 5v14M5 12h14"/>',
  'i-edit': '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  'i-trophy':
    '<path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  'i-palette':
    '<path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.6 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5c0-4-4-7.4-9-7.4z"/><circle cx="7.5" cy="11.5" r="1"/><circle cx="10" cy="7.5" r="1"/><circle cx="15" cy="7.5" r="1"/>',
  'i-clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  'i-calendar':
    '<rect width="18" height="17" x="3" y="5" rx="2.5"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/>',
  'i-fire': '<path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8a7 7 0 0 0 7 7z"/>',
  'i-target': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  'i-crown-o': '<path d="M3 18 2 7l5.5 4.5L12 4l4.5 7.5L22 7l-1 11z"/>',
  'i-shape-heart': '<path d="M12 20s-8-4.8-8-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 8 2.8C20 15.2 12 20 12 20z"/>',
  'i-shape-circle': '<circle cx="12" cy="12" r="8"/>',
  'i-shape-diamond': '<path d="m12 3 8 9-8 9-8-9z"/>',
  'i-shape-hourglass': '<path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9"/>',
  'i-shape-star': '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  'i-shield': '<path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z"/>',
  'i-bolt': '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  'i-heart-plus':
    '<path d="M12 20s-8-4.8-8-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 8 2.8c0 1-.3 2-.8 3"/><path d="M18 15v6M15 18h6"/>',
  'i-gift':
    '<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13"/><path d="M12 8C10 4 6 4 6 6.5S10 8 12 8zM12 8c2-4 6-4 6-1.5S14 8 12 8z"/>',
  'i-swap': '<path d="M4 8h14l-4-4M20 16H6l4 4"/>',
  'i-tag': '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  'i-sparkle': '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
  'i-music': '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  'i-image':
    '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 16-5-5-9 9"/>',
  'i-frame': '<rect x="3" y="3" width="18" height="18" rx="9"/><circle cx="12" cy="12" r="5"/>',
};

/** Coloured icons (keep their own fill and stroke). */
const COLORED = {
  'i-coin':
    '<circle cx="12" cy="12" r="10" fill="#F7B500" stroke="#D99100" stroke-width="1.5"/><circle cx="12" cy="12" r="6.3" fill="none" stroke="#FFE07A" stroke-width="1.6"/><path d="M12 8.6v6.8" stroke="#D99100" stroke-width="2" stroke-linecap="round"/>',
  'i-gem':
    '<path d="M6.5 3.5h11L22 9l-10 12L2 9z" fill="#35C8F4" stroke="#1593C9" stroke-width="1.5" stroke-linejoin="round"/><path d="M2 9h20M9 3.5 7.5 9 12 21l4.5-12-1.5-5.5" fill="none" stroke="#B8EEFF" stroke-width="1.2" stroke-linejoin="round"/>',
};

/** Heart gradient used by the hearts row. */
const DEFS =
  '<defs> <linearGradient id="heart-grad" x1="0" y1="0" x2="0" y2="1"> <stop offset="0" stop-color="#FF6A63" /> <stop offset="1" stop-color="#E5262C" /> </linearGradient> </defs>';

/** Insert the sprite at the top of <body>. */
export function mountIcons() {
  const symbols = [
    ...Object.entries(OUTLINED).map(([id, body]) => `<symbol id="${id}" viewBox="0 0 24 24">${body}</symbol>`),
    ...Object.entries(COLORED).map(([id, body]) => `<symbol id="${id}" viewBox="0 0 24 24">${body}</symbol>`),
  ].join('');
  const holder = document.createElement('div');
  holder.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">${DEFS}${symbols}</svg>`;
  document.body.prepend(holder.firstChild);
}

/**
 * Markup for an icon reference.
 * @param {string} id symbol id without the "i-" prefix
 * @param {string} [cls] extra classes
 * @returns {string}
 */
export function icon(id, cls = '') {
  return `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${id}" /></svg>`;
}
