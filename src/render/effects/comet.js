/** Comet Glow: a soft glowing tail that fades behind the head. */
import { emit } from './particles.js';

/**
 * @param {{x: number, y: number, dx: number, dy: number, t: number, color: string}} f
 */
export default function comet(f) {
  emit({ x: f.x, y: f.y, vx: 0, vy: 0, life: 18, size: 9, color: f.color, shape: 'glow' });
  emit({ x: f.x, y: f.y, vx: -f.dx * 0.3, vy: -f.dy * 0.3, life: 12, size: 2, color: '#FFFFFF' });
}
