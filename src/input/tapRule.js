/**
 * Is a release a tap (3.28.1)? The finger moved less than TAP.movePx and was down less than TAP.maxMs.
 * Both times are the events' own timeStamps (when the touch really started and ended), never the time the
 * handler ran: on a busy phone (an arrow sliding out, an ad loading) the handlers can run hundreds of
 * milliseconds late, and measuring that delay instead of the finger's made quick taps count as long presses,
 * so they were silently ignored.
 * @param {{t: number, x: number, y: number}} down pointerdown: timeStamp and position
 * @param {{t: number, x: number, y: number}} up pointerup: timeStamp and position
 * @param {{movePx: number, maxMs: number}} rule TAP in src/config.js
 * @returns {boolean}
 */
export function isTapRelease(down, up, rule) {
  return up.t - down.t < rule.maxMs && Math.hypot(up.x - down.x, up.y - down.y) < rule.movePx;
}
