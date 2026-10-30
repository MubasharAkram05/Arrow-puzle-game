/**
 * Daily reward and daily streak. Pure: the record and the time are passed in, nothing touches the DOM or storage.
 *
 * One claim per local calendar day. Claiming on the day after the last claim adds 1 to the streak; a missed
 * day starts again at 1. Cards cycle through 7 days while the streak count keeps going.
 * Clock guards: if the time is earlier than the latest time this device has seen (beyond a small tolerance,
 * e.g. a time-zone change) or earlier than the last claimed day, nothing is paid; if it jumped far ahead
 * since the last open, nothing is paid that day (the next day works normally). The record is never broken.
 */
import { DAILY } from '../config.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @typedef {{lastClaim: number|null, streak: number, best: number, lastSeen: number, blockedDay: number|null}} DailyRecord
 * lastClaim / blockedDay are local day numbers (see dayNumber); lastSeen is the latest time seen (ms).
 */

/** @returns {DailyRecord} */
export function newDaily() {
  return { lastClaim: null, streak: 0, best: 0, lastSeen: 0, blockedDay: null };
}

/**
 * Local calendar day as a whole number (days since 1970-01-01 in local time), so DST never splits a day.
 * @param {number} time ms
 * @returns {number}
 */
export function dayNumber(time) {
  const d = new Date(time);
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
}

/**
 * Card (1-7) for a streak count.
 * @param {number} streak 1, 2, ...
 * @returns {number}
 */
export const cycleDay = (streak) => ((Math.max(1, streak) - 1) % DAILY.rewards.length) + 1;

/**
 * Where the player stands today.
 * @param {DailyRecord} rec
 * @param {number} now ms
 * @returns {{state: 'available'|'claimed'|'clock', today: number, streak: number, day: number}}
 *   streak = the streak shown now (after a claim today, or the one a claim would give), day = its card 1-7
 */
export function dailyStatus(rec, now) {
  const today = dayNumber(now);
  const blocked =
    now < rec.lastSeen - DAILY.backwardToleranceMs ||
    (rec.lastClaim !== null && today < rec.lastClaim) ||
    rec.blockedDay === today ||
    (rec.lastSeen > 0 && now - rec.lastSeen > DAILY.maxJumpDays * DAY_MS);
  const kept = rec.lastClaim !== null && today - rec.lastClaim <= 1 ? rec.streak : 0;
  if (blocked) return { state: 'clock', today, streak: kept, day: cycleDay(kept || 1) };
  if (rec.lastClaim === today) return { state: 'claimed', today, streak: rec.streak, day: cycleDay(rec.streak) };
  const next = kept + 1;
  return { state: 'available', today, streak: next, day: cycleDay(next) };
}

/**
 * Note that the app was opened at `now`: keeps the latest time seen, and marks today as paying nothing when the
 * clock jumped far ahead. A clock that went back is left alone (it pays nothing until real time catches up).
 * @param {DailyRecord} rec
 * @param {number} now
 * @returns {DailyRecord}
 */
export function touchDaily(rec, now) {
  if (now < rec.lastSeen - DAILY.backwardToleranceMs) return rec;
  const jumped = rec.lastSeen > 0 && now - rec.lastSeen > DAILY.maxJumpDays * DAY_MS;
  return {
    ...rec,
    lastSeen: Math.max(rec.lastSeen, now),
    blockedDay: jumped ? dayNumber(now) : rec.blockedDay,
  };
}

/**
 * Streak to show (0 once a day was missed).
 * @param {DailyRecord} rec
 * @param {number} now
 * @returns {number}
 */
export function currentStreak(rec, now) {
  const s = dailyStatus(rec, now);
  return s.state === 'available' ? s.streak - 1 : s.streak;
}

/**
 * Claim today's reward.
 * @param {DailyRecord} rec
 * @param {number} now
 * @returns {{ok: boolean, reason?: 'claimed'|'clock', rec: DailyRecord, reward?: {coins?: number, diamonds?: number, hints?: number}, day?: number}}
 */
export function claimDaily(rec, now) {
  const s = dailyStatus(rec, now);
  if (s.state !== 'available') return { ok: false, reason: s.state, rec };
  const next = {
    ...rec,
    lastClaim: s.today,
    streak: s.streak,
    best: Math.max(rec.best, s.streak),
    lastSeen: Math.max(rec.lastSeen, now),
  };
  return { ok: true, rec: next, reward: DAILY.rewards[s.day - 1], day: s.day };
}
