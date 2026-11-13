import { state } from '../game/state.js';
import { $ } from '../ui/dom.js';

/** Pastel confetti like the reference victory screen. */
const COLORS = ['#F7A6DA', '#F3E244', '#7FE7A6', '#6FE2F2', '#C69BF7', '#FFFFFF', '#FF9EB1'];
const COUNT = 42;
const BURST_MS = 1500; // one short burst, then the canvas is cleared
const GRAVITY = 0.16;
let frameId = 0;

/** One piece thrown up and out from the burst point. */
function piece(x, y) {
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
  const speed = 5 + Math.random() * 6;
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: 6 + Math.random() * 6,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.2,
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
 * A short confetti burst (1.5 s) in the equipped style, from just above the victory card. The canvas sits behind
 * the card, so no piece ever covers its text or buttons, and it is cleared when the burst ends or the screen
 * closes. Reduced motion shows no confetti.
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
  const card = modal.querySelector('.win-card');
  const top = card ? card.getBoundingClientRect().top : h * 0.2;
  const parts = Array.from({ length: COUNT }, () => piece(w / 2 + (Math.random() - 0.5) * w * 0.3, top + 24));
  const t0 = performance.now();
  (function frame(now) {
    const t = now - t0;
    ctx.clearRect(0, 0, w, h);
    if (t >= BURST_MS || !modal.classList.contains('open')) return;
    ctx.globalAlpha = Math.min(1, (BURST_MS - t) / 450); // fade out over the last part
    for (const p of parts) {
      p.vx *= 0.985;
      p.vy += GRAVITY;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.flip += 0.1;
      draw(ctx, p, style);
    }
    ctx.globalAlpha = 1;
    frameId = requestAnimationFrame(frame);
  })(t0);
}
