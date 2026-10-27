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
    curl: Math.random() < 0.35, // some pieces are curly ribbons
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
}

/** Draw one piece; flip squashes it to fake a 3D tumble. */
function draw(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.scale(1, Math.cos(p.flip));
  if (p.curl) {
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

/** Confetti rain on the victory screen. Stops when the screen closes or every piece has fallen. */
export function startConfetti() {
  const canvas = $('confetti');
  const modal = $('modal-victory');
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = innerWidth;
  const h = innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const parts = Array.from({ length: COUNT }, (_, i) => piece(w, h, i < COUNT / 2));
  const t0 = performance.now();
  cancelAnimationFrame(frameId);
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
      draw(ctx, p);
    }
    if (alive && modal.classList.contains('open')) frameId = requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, w, h);
  })(t0);
}
