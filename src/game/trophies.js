/**
 * Monthly trophies: one trophy per calendar month, filled by the days the daily reward was claimed in that
 * month. Pure: claim days (local day numbers, see daily.js dayNumber) and "today" are passed in.
 */
import { dayNumber } from './daily.js';

/** Keep at most this many claim days in the save (about five years). */
export const MAX_DAILY_DAYS = 1830;

const DAY_MS = 24 * 60 * 60 * 1000;

export const MONTHS = Object.freeze([
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]);

/** Is this a leap year (Gregorian rules)? */
export const isLeapYear = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/**
 * Days in a month.
 * @param {number} year
 * @param {number} month 0-11
 * @returns {number}
 */
export function daysInMonth(year, month) {
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
}

/** Calendar date (year, month 0-11) of a local day number. */
export function dayDate(day) {
  const d = new Date(day * DAY_MS);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

/**
 * @typedef {{month: number, name: string, days: number, claimed: number, share: number,
 *   state: 'future'|'empty'|'progress'|'complete', current: boolean}} Trophy
 */

/**
 * The 12 trophies of a year.
 * @param {number[]} claimDays local day numbers of daily-reward claims
 * @param {number} year
 * @param {number} now ms (decides which months are still in the future)
 * @returns {Trophy[]}
 */
export function yearTrophies(claimDays, year, now) {
  const counts = new Array(12).fill(0);
  for (const day of new Set(claimDays)) {
    const d = dayDate(day);
    if (d.year === year) counts[d.month]++;
  }
  const today = dayDate(dayNumber(now));
  return MONTHS.map((name, month) => {
    const days = daysInMonth(year, month);
    const claimed = Math.min(days, counts[month]);
    const future = year > today.year || (year === today.year && month > today.month);
    const state = future ? 'future' : claimed >= days ? 'complete' : claimed ? 'progress' : 'empty';
    return {
      month,
      name,
      days,
      claimed,
      share: claimed / days,
      state,
      current: year === today.year && month === today.month,
    };
  });
}

/**
 * Earlier years that have at least one claim (newest first), for the collapsed sections.
 * @param {number[]} claimDays
 * @param {number} now
 * @returns {number[]}
 */
export function pastYears(claimDays, now) {
  const thisYear = dayDate(dayNumber(now)).year;
  const years = new Set(claimDays.map((d) => dayDate(d).year).filter((y) => y < thisYear));
  return [...years].sort((a, b) => b - a);
}
