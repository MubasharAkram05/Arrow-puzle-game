/**
 * Arrowheads on the canvas, matching headElement in board.js (triangle, chevron, round, feather, diamond, bolt).
 * The context is already moved to the head and turned so the tip points up (-y).
 */

/**
 * Fill and outline the equipped head shape.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{hw: number, back: number, tip: number, sw: number, head?: string}} m
 * @param {number} [k] outline width factor (the hint glow uses a thicker outline)
 * @param {number} [extra] extra outline width (the low-contrast outline pass)
 */
export function traceHead(ctx, m, k = 1, extra = 0) {
  const { hw, back, tip, sw } = m;
  ctx.beginPath();
  let line = sw * 0.25;
  switch (m.head) {
    case 'chevron':
      ctx.moveTo(-hw, back);
      ctx.lineTo(0, -tip);
      ctx.lineTo(hw, back);
      ctx.lineTo(0, back * 0.1);
      break;
    case 'round':
      // a smaller triangle with a thick round-joined outline reads as a rounded head
      line = sw * 0.9;
      ctx.moveTo(-hw * 0.75, back * 0.8);
      ctx.lineTo(hw * 0.75, back * 0.8);
      ctx.lineTo(0, -tip * 0.8);
      break;
    case 'feather':
      line = sw * 0.2;
      ctx.moveTo(0, -tip * 1.15);
      ctx.quadraticCurveTo(hw, back * 0.1, 0, back * 1.2);
      ctx.quadraticCurveTo(-hw, back * 0.1, 0, -tip * 1.15);
      break;
    case 'diamond':
      // a long rhombus: a gem-cut tip
      line = sw * 0.2;
      ctx.moveTo(0, -tip * 1.2);
      ctx.lineTo(hw * 0.85, back * 0.15);
      ctx.lineTo(0, back * 1.2);
      ctx.lineTo(-hw * 0.85, back * 0.15);
      break;
    case 'bolt':
      // a spear tip with a zigzag notched base
      line = sw * 0.2;
      ctx.moveTo(0, -tip * 1.25);
      ctx.lineTo(hw, back);
      ctx.lineTo(hw * 0.35, back * 0.45);
      ctx.lineTo(0, back * 1.3);
      ctx.lineTo(-hw * 0.35, back * 0.45);
      ctx.lineTo(-hw, back);
      break;
    default:
      ctx.moveTo(-hw, back);
      ctx.lineTo(hw, back);
      ctx.lineTo(0, -tip);
  }
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = line * k + extra;
  ctx.fill();
  ctx.stroke();
}
