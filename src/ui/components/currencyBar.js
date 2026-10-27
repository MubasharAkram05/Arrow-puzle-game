/**
 * Coin and diamond counters (small pills) plus the "fly to counter" reward animation.
 * Any element with [data-currency-bar] becomes a bar. Counters always end on the wallet in state:
 * an animation only touches the one counter it flies to, and syncCurrency() (run on every screen
 * change) cancels pending animations and shows the real values.
 */
import { state } from '../../game/state.js';

const KINDS = ['coins', 'diamonds'];
const ICON = { coins: 'coin', diamonds: 'gem' };
const timers = new Set();
const flights = new Set();

/** Format a number with thousands separators. */
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const reducedMotion = () => !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
 * Show values on the bars inside a scope (defaults: the wallet in state, every bar).
 * Counters that are animating keep animating; they end on their target value.
 * @param {{coins?: number, diamonds?: number}} [values]
 * @param {ParentNode} [scope]
 */
export function renderCurrency(values = state, scope = document) {
  for (const k of KINDS) {
    scope.querySelectorAll(`.cur[data-cur="${k}"]:not([data-counting])`).forEach((el) => {
      el.querySelector('b').textContent = fmt(values[k]);
    });
  }
}

/** Cancel every pending reward animation and show the real wallet everywhere. */
export function syncCurrency() {
  timers.forEach(clearTimeout);
  timers.clear();
  flights.forEach((a) => a.cancel());
  flights.clear();
  document.querySelectorAll('.fly-icon').forEach((el) => el.remove());
  document.querySelectorAll('.cur[data-counting]').forEach((el) => el.removeAttribute('data-counting'));
  renderCurrency();
}

/**
 * Count one counter pill from a value to another, with a little bump at the end.
 * @param {HTMLElement} el the .cur pill
 * @param {number} from
 * @param {number} to
 * @param {number} duration ms
 */
export function countUp(el, from, to, duration) {
  el.setAttribute('data-counting', '');
  const b = el.querySelector('b');
  const t0 = performance.now();
  (function frame(now) {
    if (!el.hasAttribute('data-counting')) return; // cancelled by syncCurrency
    const t = Math.min(1, (now - t0) / duration);
    b.textContent = fmt(from + (to - from) * (1 - (1 - t) * (1 - t)));
    if (t < 1) requestAnimationFrame(frame);
    else {
      el.removeAttribute('data-counting');
      b.textContent = fmt(to);
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    }
  })(t0);
}

/** Visible counter pill for a currency (inside an open modal first, then the active screen). */
function target(kind) {
  const scope = document.querySelector('.modal.open [data-currency-bar]') || document.querySelector('.screen.active');
  return scope && scope.querySelector(`.cur[data-cur="${kind}"]`);
}

/** setTimeout that syncCurrency() can cancel. */
function later(fn, ms) {
  const id = setTimeout(() => {
    timers.delete(id);
    fn();
  }, ms);
  timers.add(id);
}

/**
 * Fly currency icons from an element to its counter, then count that counter up.
 * Uses transform/opacity only. With reduced motion (or no Web Animations) it just counts.
 * @param {HTMLElement} from start element (e.g. the victory card)
 * @param {'coins'|'diamonds'} kind
 * @param {number} start counter value before the reward
 * @param {number} amount reward amount
 * @param {number} [delay] ms
 */
export function flyCurrency(from, kind, start, amount, delay = 0) {
  const to = target(kind);
  if (!to) return;
  if (!amount) {
    to.querySelector('b').textContent = fmt(start);
    return;
  }
  to.setAttribute('data-counting', '');
  to.querySelector('b').textContent = fmt(start);
  if (!from || reducedMotion() || typeof document.body.animate !== 'function') {
    later(() => countUp(to, start, start + amount, 300), delay);
    return;
  }
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const pieces = Math.min(10, Math.max(1, Math.ceil(amount / (kind === 'coins' ? 6 : 1))));
  const flight = 650;
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
    flights.add(anim);
    anim.onfinish = () => {
      flights.delete(anim);
      el.remove();
    };
  }
  later(() => countUp(to, start, start + amount, flight), delay + flight * 0.6);
}
