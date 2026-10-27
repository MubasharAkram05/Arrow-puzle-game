import { state } from '../game/state.js';
import { $ } from '../ui/dom.js';

/** Pastel confetti like the reference victory screen. */
const COLORS = ['#F7A6DA', '#F3E244', '#7FE7A6', '#6FE2F2', '#C69BF7', '#FFFFFF', '#FF9EB1'];
const COUNT = 110;
const RAIN_MS = 5000; // new pieces keep falling for this long
let frameId = 0;

/** One confetti piece starting above the screen (or anywhere when scattered). */
function piece(w, h, scattered) {
  return {
    x: Math.random() * w,
    y: scattered ? Math.random() * h : -20 - Math.random() * h * 0.5,
    vy: 1.2 + Math.random() * 1.8,
    sway: Math.random() * Math.PI * 2,
    swaySpeed: 0.02 + Math.random() * 0.03,
    size: 7 + Math.random() * 7,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.12,
    flip: Math.random() * Math.PI * 2,
    curl: Math.random() < 0.35, // some classic pieces are curly ribbons
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
}

/** Heart path centred on 0,0. */
function heart(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.35);
  ctx.bezierCurveTo(-s, -s * 0.2, -s * 0.45, -s * 0.9, 0, -s * 0.35);
  ctx.bezierCurveTo(s * 0.45, -s * 0.9, s, -s * 0.2, 0, s * 0.35);
  ctx.fill();
}

/** Five-point star centred on 0,0. */
function star(ctx, s) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? s * 0.25 : s * 0.6;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
}

/** Draw one piece in the equipped confetti style; flip squashes it to fake a 3D tumble. */
function draw(ctx, p, style) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.scale(1, Math.cos(p.flip));
  if (style === 'hearts') {
    ctx.fillStyle = p.curl ? '#FF4F7B' : '#FF8FAB';
    heart(ctx, p.size * 0.9);
  } else if (style === 'coins') {
    ctx.fillStyle = '#F7B500';
    ctx.beginPath();
    ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFE07A';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, p.size * 0.3, 0, Math.PI * 2);
    ctx.stroke();
  } else if (style === 'stars') {
    ctx.fillStyle = p.curl ? '#FFFFFF' : '#FFD54A';
    star(ctx, p.size);
  } else if (p.curl) {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 0, p.size * 0.6, 0.2, Math.PI * 1.1);
    ctx.stroke();
  } else {
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size * 0.35, p.size, p.size * 0.7);
  }
  ctx.restore();
}

/**
 * Confetti rain on the victory screen in the equipped style. Stops when the screen closes
 * or every piece has fallen. Reduced motion shows no confetti.
 */
export function startConfetti() {
  const canvas = $('confetti');
  const modal = $('modal-victory');
  const ctx = canvas.getContext('2d');
  cancelAnimationFrame(frameId);
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  const style = state.cosmetics.equipped.confetti;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = innerWidth;
  const h = innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const parts = Array.from({ length: COUNT }, (_, i) => piece(w, h, i < COUNT / 2));
  const t0 = performance.now();
  (function frame(now) {
    ctx.clearRect(0, 0, w, h);
    const raining = now - t0 < RAIN_MS;
    let alive = false;
    for (const p of parts) {
      p.y += p.vy;
      p.sway += p.swaySpeed;
      p.x += Math.sin(p.sway) * 0.8;
      p.rot += p.vr;
      p.flip += 0.08;
      if (p.y > h + 20 && raining) Object.assign(p, piece(w, h, false));
      if (p.y < h + 20) alive = true;
      draw(ctx, p, style);
    }
    if (alive && modal.classList.contains('open')) frameId = requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, w, h);
  })(t0);
}
