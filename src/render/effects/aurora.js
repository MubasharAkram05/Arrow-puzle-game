/** Aurora Ribbon (3.22.0): two soft wavy ribbons of green, violet and pink light behind the head. */
import { emit } from './particles.js';

const COLORS = ['#5DFFB0', '#8F7BFF', '#FF8FD8'];

/**
 * @param {{x: number, y: number, dx: number, dy: number, t: number, color: string}} f
 */
export default function aurora(f) {
  // the ribbons wave across the direction of travel (px, py is the side direction)
  const px = -f.dy;
  const py = f.dx;
  for (const side of [-1, 1]) {
    const wave = Math.sin(f.t * 18 + (side > 0 ? Math.PI : 0)) * 5;
    emit({
      x: f.x - f.dx * 8 + px * wave,
      y: f.y - f.dy * 8 + py * wave,
      vx: -f.dx * 0.4 + px * side * 0.15,
      vy: -f.dy * 0.4 + py * side * 0.15,
      life: 22 + Math.random() * 8,
      size: 3 + Math.random() * 1.5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: 'glow',
    });
  }
}
