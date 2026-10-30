/**
 * Visual effects for boosters: the shield break.
 * Transform/opacity only.
 */
import { $ } from '../ui/dom.js';

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
