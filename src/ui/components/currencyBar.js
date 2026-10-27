/**
 * Coin and diamond counters (small pills) plus the "fly to counter" reward animation.
 * Any element with [data-currency-bar] becomes a bar.
 */
import { state } from '../../game/state.js';

const KINDS = ['coins', 'diamonds'];
const ICON = { coins: 'coin', diamonds: 'gem' };
const counting = { coins: false, diamonds: false };

/** Format a number with thousands separators. */
const fmt = (n) => Math.round(n).toLocaleString('en-US');

/** Fill every [data-currency-bar] placeholder with the two pills (once, at boot). */
export function mountCurrencyBars() {
  document.querySelectorAll('[data-currency-bar]').forEach((bar) => {
    bar.classList.add('currency-bar');
    bar.innerHTML = KINDS.map(
      (k) =>
        `<span class="cur" data-cur="${k}" aria-label="${k}"><svg class="cur-icon" aria-hidden="true"><use href="#i-${ICON[k]}" /></svg><b>0</b></span>`,
    ).join('');
  });
  renderCurrency();
}

/**
 * Show values on every bar (defaults to the wallet in state).
 * @param {{coins?: number, diamonds?: number}} [values]
 */
export function renderCurrency(values = state) {
  for (const k of KINDS) {
    if (counting[k] && values === state) continue;
    document.querySelectorAll(`.cur[data-cur="${k}"] b`).forEach((b) => {
      b.textContent = fmt(values[k]);
    });
  }
}

/**
 * Count a counter up (or down) with a little bump at the end.
 * @param {'coins'|'diamonds'} kind
 * @param {number} from
 * @param {number} to
 * @param {number} duration ms
 */
export function countUp(kind, from, to, duration) {
  const els = [...document.querySelectorAll(`.cur[data-cur="${kind}"]`)];
  counting[kind] = true;
  const t0 = performance.now();
  (function frame(now) {
    const t = Math.min(1, (now - t0) / duration);
    const v = from + (to - from) * (1 - (1 - t) * (1 - t));
    els.forEach((el) => {
      el.querySelector('b').textContent = fmt(v);
    });
    if (t < 1) requestAnimationFrame(frame);
    else {
      counting[kind] = false;
      els.forEach((el) => {
        el.classList.remove('bump');
        void el.offsetWidth;
        el.classList.add('bump');
      });
    }
  })(t0);
}

/** Visible counter pill for a currency (inside an open modal first, then the active screen). */
function target(kind) {
  const scope = document.querySelector('.modal.open [data-currency-bar]') || document.querySelector('.screen.active');
  return scope && scope.querySelector(`.cur[data-cur="${kind}"]`);
}

/**
 * Fly currency icons from an element to its counter, then count up.
 * Uses transform/opacity only. Falls back to an instant count when animations are unavailable.
 * @param {HTMLElement} from start element (e.g. the victory card)
 * @param {'coins'|'diamonds'} kind
 * @param {number} start counter value before the reward
 * @param {number} amount reward amount
 * @param {number} [delay] ms
 */
export function flyCurrency(from, kind, start, amount, delay = 0) {
  const to = target(kind);
  if (!amount || !to || !from) return;
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const pieces = Math.min(10, Math.max(1, Math.ceil(amount / (kind === 'coins' ? 6 : 1))));
  const flight = 650;
  if (typeof document.body.animate !== 'function') {
    countUp(kind, start, start + amount, 300);
    return;
  }
  for (let i = 0; i < pieces; i++) {
    const el = document.createElement('div');
    el.className = 'fly-icon';
    el.innerHTML = `<svg class="cur-icon"><use href="#i-${ICON[kind]}" /></svg>`;
    const x0 = a.left + a.width / 2 + (Math.random() - 0.5) * a.width * 0.5;
    const y0 = a.top + a.height / 2 + (Math.random() - 0.5) * a.height * 0.4;
    const x1 = b.left + 12;
    const y1 = b.top + b.height / 2;
    el.style.left = `${x0 - 12}px`;
    el.style.top = `${y0 - 12}px`;
    document.body.appendChild(el);
    const anim = el.animate(
      [
        { transform: 'translate(0, 0) scale(0.4)', opacity: 0 },
        { transform: `translate(${(x1 - x0) * 0.15}px, -40px) scale(1.15)`, opacity: 1, offset: 0.25 },
        { transform: `translate(${x1 - x0}px, ${y1 - y0}px) scale(0.7)`, opacity: 1 },
      ],
      { duration: flight, delay: delay + i * 60, easing: 'cubic-bezier(0.5, 0, 0.3, 1)', fill: 'both' },
    );
    anim.onfinish = () => el.remove();
  }
  setTimeout(() => countUp(kind, start, start + amount, flight), delay + flight * 0.6);
}
