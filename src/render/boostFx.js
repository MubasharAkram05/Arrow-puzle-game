/**
 * Visual effects for boosters: shield badge break and the timed "reveal" glow.
 * Transform/opacity only.
 */
import { state } from '../game/state.js';
import { $ } from '../ui/dom.js';

/** Glow clones on an arrow, like the hint glow. */
function addGlow(a, cls) {
  const m = state.metrics;
  const glow = a.shaft.cloneNode();
  glow.setAttribute('class', `glow ${cls}`);
  glow.setAttribute('stroke-width', m.sw * 2.8);
  const head = a.headEl.cloneNode();
  head.setAttribute('class', `glow-head ${cls}`);
  head.setAttribute('stroke-width', m.sw * 1.4);
  a.el.insertBefore(head, a.shaft);
  a.el.insertBefore(glow, head);
  a.el.classList.add('revealed');
}

/**
 * Highlight arrows for a while, then remove the glow.
 * @param {number[]} ids arrow ids
 * @param {number} ms duration
 */
export function revealArrows(ids, ms) {
  const lvl = state.level;
  const arrows = ids.map((id) => state.arrows[id]).filter((a) => a && a.el);
  arrows.forEach((a) => addGlow(a, 'reveal-glow'));
  setTimeout(() => {
    if (state.level !== lvl) return;
    arrows.forEach((a) => {
      a.el.classList.remove('revealed');
      a.el.querySelectorAll('.reveal-glow').forEach((n) => n.remove());
    });
  }, ms);
}

/** Play the shield-break animation over the hearts. */
export function breakShield() {
  const hearts = $('hearts').getBoundingClientRect();
  const fx = document.createElement('div');
  fx.className = 'shield-break';
  fx.innerHTML = '<svg class="icon"><use href="#i-shield" /></svg><svg class="icon"><use href="#i-shield" /></svg>';
  fx.style.left = `${hearts.left + hearts.width / 2 - 20}px`;
  fx.style.top = `${hearts.top + hearts.height / 2 - 20}px`;
  document.body.appendChild(fx);
  setTimeout(() => fx.remove(), 600);
}
