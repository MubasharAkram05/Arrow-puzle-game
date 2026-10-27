/** Small message bubble at the bottom of the screen. */
let timer = 0;

/**
 * Show a short message for a moment.
 * @param {string} text
 * @param {number} [ms]
 */
export function toast(text, ms = 1800) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove('show'), ms);
}
