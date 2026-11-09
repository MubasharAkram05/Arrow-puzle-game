/**
 * Red dots for the Tasks screen (3.23.0): Weekly when a quest or chest can be claimed, Achievements when an
 * achievement step can be claimed, and the Tasks nav icon when either can. Pure.
 */
import { readyCount } from './achievementList.js';
import { questReadyCount } from './quests.js';

/**
 * @param {object} questRec the weekly quest record
 * @param {number} now
 * @param {{state: string}[]} achievementRows rows from achievementRows()
 * @returns {{weekly: boolean, achievements: boolean, nav: boolean}}
 */
export function taskDots(questRec, now, achievementRows) {
  const weekly = questReadyCount(questRec, now) > 0;
  const achievements = readyCount(achievementRows) > 0;
  return { weekly, achievements, nav: weekly || achievements };
}
