/**
 * Direction mix metrics (3.19.0): does freeing one arrow free the next one in line (a queue)?
 *
 * - sameDirBlock: share of arrows (with an arrow in front) whose blocker right in front points the same way.
 *   Lower is better: when that blocker leaves, the arrow behind it is often free next, like a queue.
 * - crossBlock: share of those pairs where the blocker points across (perpendicular) or against (the
 *   opposite way). Higher is better. Two heads facing each other on one line can't happen on a solvable
 *   board (each would wait for the other), so "against" means the blocker's body crosses the line.
 * - sameDirBlockAll / crossBlockAll: the same over every arrow in the way out, not just the first.
 * - queueMoves: a player removes one arrow per move (the one free the longest, as in metrics.js
 *   freePerMove). A move is a queue move when an arrow it frees points the same way as the removed arrow
 *   and had that arrow right in front of it. Lower is better.
 * - localDirMix: the board is cut into WINDOW x WINDOW windows; in each window with at least MIN_HEADS
 *   heads, the share of the most common head direction. localDirMix is the mean over those windows,
 *   localDirMixWorst the highest one. 25% is perfectly mixed; random directions give about 40%.
 *   (12 x 12 windows: long arrows leave only 1-2 heads in a 6 x 6 window, too few to measure a mix.)
 */
export const WINDOW = 12;
export const MIN_HEADS = 6;

/**
 * @param {{rows: number, cols: number, arrows: {dir: number, path: {r: number, c: number}[]}[]}} level
 * @param {number[][]} deps per arrow: every arrow in front of its head
 * @param {(number|null)[]} nearest per arrow: the first arrow in front of its head, or null
 * @returns {{sameDirBlock: number, crossBlock: number, sameDirBlockAll: number, crossBlockAll: number,
 *   queueMoves: number, localDirMix: number, localDirMixWorst: number}}
 */
export function dirMetrics(level, deps, nearest) {
  const { arrows } = level;
  const all = { pairs: 0, same: 0 };
  const near = { pairs: 0, same: 0 };
  const add = (t, a, b) => {
    t.pairs++;
    if (arrows[a].dir === arrows[b].dir) t.same++;
  };
  deps.forEach((d, id) => {
    for (const b of d) add(all, id, b);
    if (nearest[id] !== null && nearest[id] !== undefined) add(near, id, nearest[id]);
  });
  // every pair that is not the same way is across or against
  const share = (t) => (t.pairs ? t.same / t.pairs : 0);
  return {
    sameDirBlock: share(near),
    crossBlock: near.pairs ? 1 - share(near) : 0,
    sameDirBlockAll: share(all),
    crossBlockAll: all.pairs ? 1 - share(all) : 0,
    queueMoves: queueShare(arrows, deps, nearest),
    ...dirMix(level),
  };
}

/** Share of one-at-a-time solve moves that free the next arrow in a same-direction queue. */
function queueShare(arrows, deps, nearest) {
  const n = deps.length;
  const left = deps.map((d) => d.length);
  const waiting = Array.from({ length: n }, () => []);
  deps.forEach((d, id) => d.forEach((b) => waiting[b].push(id)));
  const queue = [];
  for (let id = 0; id < n; id++) if (!left[id]) queue.push(id);
  let head = 0;
  let queued = 0;
  while (head < queue.length) {
    const x = queue[head++];
    let isQueue = false;
    for (const w of waiting[x]) {
      if (--left[w] !== 0) continue;
      queue.push(w);
      if (arrows[w].dir === arrows[x].dir && nearest[w] === x) isQueue = true;
    }
    if (isQueue) queued++;
  }
  return head ? queued / head : 0;
}

/** Head direction mix in WINDOW x WINDOW windows (windows with MIN_HEADS+ heads). */
function dirMix(level) {
  const { rows, cols, arrows } = level;
  const wr = Math.ceil(rows / WINDOW);
  const wc = Math.ceil(cols / WINDOW);
  const count = new Int32Array(wr * wc * 4);
  for (const a of arrows) {
    const h = a.path[0];
    count[(Math.floor(h.r / WINDOW) * wc + Math.floor(h.c / WINDOW)) * 4 + a.dir]++;
  }
  let worst = 0;
  let sum = 0;
  let windows = 0;
  for (let w = 0; w < wr * wc; w++) {
    const k = count.subarray(w * 4, w * 4 + 4);
    const total = k[0] + k[1] + k[2] + k[3];
    if (total < MIN_HEADS) continue;
    const share = Math.max(k[0], k[1], k[2], k[3]) / total;
    sum += share;
    windows++;
    if (share > worst) worst = share;
  }
  return { localDirMix: windows ? sum / windows : 0, localDirMixWorst: worst };
}
