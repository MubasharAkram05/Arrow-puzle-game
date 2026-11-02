/**
 * The seven Daily Reward cards and their states. Pure: built from dailyStatus (daily.js) and the rewards.
 *
 * Cards of the current 7-day cycle before today's are claimed; today's card is 'today' while its reward is
 * waiting (and 'claimed' once taken); later cards are 'future'. When the clock looks wrong there is no
 * 'today' card.
 */
import { DAILY } from '../config.js';

/**
 * @typedef {{day: number, reward: {coins?: number, diamonds?: number, hints?: number}, state: 'claimed'|'today'|'future'}} DailyCard
 */

/**
 * @param {{state: 'available'|'claimed'|'clock', day: number}} status from dailyStatus
 * @returns {DailyCard[]}
 */
export function dailyCards(status) {
  const doneUpTo = status.state === 'claimed' ? status.day : status.day - 1;
  return DAILY.rewards.map((reward, i) => {
    const day = i + 1;
    const state = day <= doneUpTo ? 'claimed' : day === status.day && status.state === 'available' ? 'today' : 'future';
    return { day, reward, state };
  });
}

/**
 * The main reward of a card, for its big icon: diamonds win over coins, hints alone show the bulb.
 * @param {{coins?: number, diamonds?: number, hints?: number}} r
 * @returns {{kind: 'coins'|'diamonds'|'hints', amount: number}}
 */
export function mainReward(r) {
  if (r.diamonds) return { kind: 'diamonds', amount: r.diamonds };
  if (r.coins) return { kind: 'coins', amount: r.coins };
  return { kind: 'hints', amount: r.hints || 0 };
}
