/** Burst: a ring of particles pops where the arrow leaves the board. */
import { emit } from './particles.js';

/**
 * @param {{x: number, y: number, dx: number, dy: number, t: number, color: string, once: (key: string) => boolean}} f
 */
export default function burst(f) {
  if (f.t < 0.45 || !f.once('burst')) return;
  const colors = [f.color, '#FFD54A', '#FF7A8A', '#7FE7A6'];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const v = 2 + Math.random() * 2.5;
    emit({
      x: f.x,
      y: f.y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      gravity: 0.08,
      life: 24 + Math.random() * 10,
      size: 2 + Math.random() * 1.5,
      color: colors[i % colors.length],
    });
  }
}
