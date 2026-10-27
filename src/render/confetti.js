import { $ } from '../ui/dom.js';

const COLORS = ['#FF473E', '#FFD23F', '#3DDC97', '#FFFFFF', '#9B7BFF'];
let frameId = 0;

/** Confetti burst on the victory screen. Stops when every piece has fallen. */
export function startConfetti() {
  const canvas = $('confetti');
  const ctx = canvas.getContext('2d');
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  const parts = [];
  for (let i = 0; i < 90; i++) {
    parts.push({
      x: canvas.width / 2,
      y: canvas.height * 0.45,
      vx: (Math.random() - 0.5) * 16,
      vy: -Math.random() * 16 - 4,
      s: Math.random() * 7 + 4,
      c: COLORS[i % COLORS.length],
      a: Math.random() * 6,
      va: (Math.random() - 0.5) * 0.3,
    });
  }
  cancelAnimationFrame(frameId);
  (function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.45;
      p.a += p.va;
      if (p.y < canvas.height + 20) alive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      ctx.restore();
    }
    if (alive) frameId = requestAnimationFrame(frame);
  })();
}
