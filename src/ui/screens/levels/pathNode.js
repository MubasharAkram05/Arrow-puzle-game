/**
 * Level path nodes: the state of each node (pure, tested) and its markup.
 *
 * A level node is completed, perfect, current, open (playable but not the current level: replays or test
 * mode) or locked. Shape levels show their shape, every 10th level is a star node. After the last level of
 * a chapter comes a treasure chest that opens once the chapter reward is paid.
 */
import { isMilestoneLevel } from '../../../game/economy.js';
import { isPlayable } from '../../../game/unlock.js';
import { isShapeLevel, shapeLibraryReady, shapeOf } from '../../../engine/index.js';
import { icon } from '../../components/icons.js';
import { shapeIcon } from '../../components/shapeIcon.js';

/**
 * @typedef {{n: number, status: 'completed'|'perfect'|'current'|'open'|'locked', shape: boolean, milestone: boolean}} NodeState
 */

/**
 * State of the node for level n.
 * @param {number} n
 * @param {{current: number, unlocked: number, completed: Set<number>, perfect: Set<number>}} progress
 * @param {boolean} [unlockAll] test mode (defaults to TEST_UNLOCK_ALL)
 * @returns {NodeState}
 */
export function levelNodeState(n, progress, unlockAll) {
  const playable = isPlayable(n, progress, unlockAll);
  let status = 'locked';
  // the current level is highlighted even when it is a replay of a finished level
  if (n === progress.current && playable) status = 'current';
  else if (progress.perfect.has(n)) status = 'perfect';
  else if (progress.completed.has(n)) status = 'completed';
  else if (playable) status = 'open';
  return { n, status, shape: isShapeLevel(n), milestone: isMilestoneLevel(n) };
}

/**
 * State of a chapter's treasure chest.
 * @param {number[]} levels the chapter's levels
 * @param {number} chapter
 * @param {{completed: Set<number>, chaptersRewarded: Set<number>}} progress
 * @returns {{chapter: number, status: 'opened'|'ready'|'closed'}}
 *   opened: reward paid; ready: every level done but not paid yet (it pays on the next win there)
 */
export function chestState(levels, chapter, progress) {
  if (progress.chaptersRewarded.has(chapter)) return { chapter, status: 'opened' };
  return { chapter, status: levels.every((l) => progress.completed.has(l)) ? 'ready' : 'closed' };
}

/**
 * Horizontal offset of the i-th node of a chapter, from -1 (left) to 1 (right): a smooth S-curve.
 * @param {number} i
 * @returns {number}
 */
export const nodeOffset = (i) => Math.round(Math.sin((i * Math.PI) / 4) * 100) / 100 || 0; // no -0

/** Shape silhouette, or a placeholder until the shape library chunk has loaded (pathView fills it in). */
function shapeMark(n) {
  if (shapeLibraryReady()) return shapeIcon(shapeOf(n), 'pn-shape');
  return `<i class="pn-shape shape-pending" data-shape-level="${n}"></i>`;
}

/** Icon in the middle of a node. */
function nodeIcon(s) {
  if (s.status === 'locked') return icon('lock', 'pn-ico');
  if (s.milestone) return icon('shape-star', 'pn-ico solid');
  if (s.shape) return shapeMark(s.n);
  if (s.status === 'perfect') return icon('crown', 'pn-ico solid');
  if (s.status === 'completed') return icon('check', 'pn-ico');
  return `<b class="pn-num">${s.n}</b>`;
}

const LABEL = {
  completed: 'completed',
  perfect: 'perfect',
  current: 'current level',
  open: 'open',
  locked: 'locked',
};

/**
 * Markup of one path row (node, its level number and a light decoration on the other side).
 * @param {NodeState} s
 * @param {number} i index in the chapter (for the wave)
 * @returns {string}
 */
export function nodeHTML(s, i) {
  const cls = ['pn', `pn-${s.status}`, s.milestone ? 'pn-star' : '', s.shape ? 'pn-shapelvl' : ''].join(' ');
  const done = s.status === 'completed' || s.status === 'perfect';
  // star and shape nodes keep their picture; a small corner badge shows they are done
  const badge =
    done && (s.milestone || s.shape)
      ? icon(s.status === 'perfect' ? 'crown' : 'check', `pn-badge${s.status === 'perfect' ? ' solid' : ''}`)
      : '';
  const inner = nodeIcon(s);
  // nodes that show a picture get their level number underneath
  const label = inner.startsWith('<b class="pn-num"') ? '' : `<small class="pn-label">${s.n}</small>`;
  const bubble = s.status === 'current' ? '<span class="pn-start" aria-hidden="true">START</span>' : '';
  const deco = i % 3 === 1 ? `<i class="pn-deco pn-deco-${i % 2 ? 'arrow' : 'dots'}" aria-hidden="true"></i>` : '';
  return `<li class="pn-row${s.status === 'current' ? ' pn-row-current' : ''}" style="--o:${nodeOffset(i)}">
    ${deco}<div class="pn-wrap">${bubble}<button class="${cls}" data-level="${s.n}" aria-label="Level ${s.n}, ${LABEL[s.status]}">${inner}${badge}</button>${label}</div>
  </li>`;
}

/**
 * Markup of the chest after a chapter's last level.
 * @param {{chapter: number, status: string}} c
 * @param {number} i index after the last node (for the wave)
 * @param {boolean} [opening] play the opening animation now
 * @returns {string}
 */
export function chestHTML(c, i, opening = false) {
  const label = { opened: 'reward collected', ready: 'reward ready', closed: 'finish the chapter to open' }[c.status];
  return `<li class="pn-row pn-chest-row" style="--o:${nodeOffset(i)}">
    <div class="pn-chest pn-chest-${c.status}${opening ? ' opening' : ''}" role="img" aria-label="Chapter ${c.chapter} chest, ${label}">
      <svg viewBox="0 0 64 56" aria-hidden="true">
        <rect class="ch-body" x="6" y="24" width="52" height="28" rx="6"/>
        <g class="ch-lid"><path d="M6 26v-6a14 14 0 0 1 14-14h24a14 14 0 0 1 14 14v6z"/><rect class="ch-band" x="6" y="22" width="52" height="5"/></g>
        <rect class="ch-lock" x="27" y="24" width="10" height="12" rx="3"/>
        <g class="ch-glow"><circle cx="32" cy="24" r="10"/></g>
      </svg>
    </div>
  </li>`;
}
