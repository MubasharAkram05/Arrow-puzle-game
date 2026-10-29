/**
 * Tiny particle system on one canvas over the board, shared by the escape effects.
 * Runs only while particles are alive; capped so low-end phones stay smooth.
 */
import { $ } from '../../ui/dom.js';

const MAX = 160;
const parts = [];
let running = false;
let ctx = null;

/** Size the canvas to the board area (device pixels, capped at 2x). */
function canvas() {
  const c = $('fx-canvas');
  const wrap = $('board-wrap');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
  }
  ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h };
}

/**
 * Add a particle. Fields: x, y, vx, vy (px/frame), life (frames), size, color, shape ('dot'|'glow'|'flame'), gravity.
 * @param {object} p
 */
export function emit(p) {
  if (parts.length >= MAX) parts.shift();
  parts.push({ gravity: 0, shape: 'dot', ...p, age: 0 });
  if (!running) {
    running = true;
    requestAnimationFrame(frame);
  }
}

/** Draw one particle. */
function draw(p, k) {
  ctx.globalAlpha = Math.max(0, 1 - k);
  if (p.shape === 'glow') {
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
    g.addColorStop(0, p.color);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
    return;
  }
  const r = p.shape === 'flame' ? p.size * (1 - k * 0.7) : p.size * (1 - k * 0.4);
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, Math.max(0.5, r), 0, Math.PI * 2);
  ctx.fill();
}

/** Animation loop: move, fade, draw; stops when nothing is left. */
function frame() {
  const { w, h } = canvas();
  ctx.clearRect(0, 0, w, h);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.age++;
    if (p.age >= p.life) {
      parts.splice(i, 1);
      continue;
    }
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    draw(p, p.age / p.life);
  }
  ctx.globalAlpha = 1;
  if (parts.length) requestAnimationFrame(frame);
  else running = false;
}
