/** Rocket Flame: orange flame and grey smoke pushed out behind the head. */
import { emit } from './particles.js';

/**
 * @param {{x: number, y: number, dx: number, dy: number, t: number, color: string}} f
 */
export default function rocket(f) {
  const back = { x: f.x - f.dx * 10, y: f.y - f.dy * 10 };
  emit({
    ...back,
    vx: -f.dx * (1.5 + Math.random()) + (Math.random() - 0.5),
    vy: -f.dy * (1.5 + Math.random()) + (Math.random() - 0.5),
    life: 12 + Math.random() * 6,
    size: 3.5 + Math.random() * 2,
    color: Math.random() < 0.5 ? '#FF8A2A' : '#FFD54A',
    shape: 'flame',
  });
  if (Math.random() < 0.4) {
    emit({
      ...back,
      vx: -f.dx * 0.6,
      vy: -f.dy * 0.6,
      life: 26,
      size: 5,
      color: 'rgba(150,150,160,0.5)',
      shape: 'glow',
    });
  }
}
