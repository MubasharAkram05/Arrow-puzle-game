/** Spark Trail: small bright sparks scattered behind the head. */
import { emit } from './particles.js';

/**
 * Called every animation frame of an escape.
 * @param {{x: number, y: number, dx: number, dy: number, t: number, color: string}} f head position (px), direction, progress
 */
export default function spark(f) {
  for (let i = 0; i < 2; i++) {
    emit({
      x: f.x - f.dx * 6,
      y: f.y - f.dy * 6,
      vx: -f.dx * (0.6 + Math.random()) + (Math.random() - 0.5) * 1.6,
      vy: -f.dy * (0.6 + Math.random()) + (Math.random() - 0.5) * 1.6,
      life: 16 + Math.random() * 10,
      size: 1.2 + Math.random() * 1.6,
      color: Math.random() < 0.5 ? '#FFD54A' : f.color,
    });
  }
}
