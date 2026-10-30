/**
 * Which levels can be played. Pure: the test flag is passed in (defaults to TEST_UNLOCK_ALL).
 *
 * Test mode only opens the Levels page. It never writes progress: a win on a level the player
 * hasn't really unlocked pays nothing and changes nothing, so turning the flag off brings the
 * exact old lock state back.
 */
import { TEST_UNLOCK_ALL } from '../config.js';

/**
 * Can level n be started from the Levels page?
 * @param {number} n
 * @param {{unlocked: number}} progress
 * @param {boolean} [unlockAll]
 * @returns {boolean}
 */
export function isPlayable(n, progress, unlockAll = TEST_UNLOCK_ALL) {
  return unlockAll || n <= progress.unlocked;
}

/**
 * Is this a test play: a level only open because of the test flag? Such a win records nothing.
 * @param {number} n
 * @param {{unlocked: number}} progress
 * @param {boolean} [unlockAll]
 * @returns {boolean}
 */
export function isTestPlay(n, progress, unlockAll = TEST_UNLOCK_ALL) {
  return unlockAll && n > progress.unlocked;
}

/**
 * Victory summary for a test play: no coins, no diamonds, no XP, wallet unchanged.
 * @param {{coins: number, diamonds: number}} before
 * @returns {{reward: object, xp: number, before: object, test: true}}
 */
export function testPlaySummary(before) {
  return {
    reward: { coins: 0, diamonds: 0, perfect: false, chapter: false, lines: [{ label: 'Test mode: no rewards' }] },
    xp: 0,
    before,
    test: true,
  };
}
