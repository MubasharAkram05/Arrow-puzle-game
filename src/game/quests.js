/**
 * Weekly Quests (3.22.0). Pure: no DOM, no storage, no shared state. Records are never mutated.
 *
 * A record holds one quest week: { week, counts, claimed, chests }.
 * - week: Monday 00:00 local time (ms) of the week the record is for, 0 before the first week.
 * - counts: progress per counter (see QUESTS in src/config.js), counted only while this record is current,
 *   so progress always starts from the week's start.
 * - claimed: ids of the quests claimed this week; their points fill the bar.
 * - chests: thresholds (30, 60, 100) of the chests opened this week.
 *
 * Clock safety: the record only ever moves to a LATER week. A clock moved backward keeps the current week
 * (no reset, no old week back); a clock jumped forward starts that later week once, and real time then has
 * to catch up before the next reset, so there are never more resets than real weeks plus that one.
 */
import { QUESTS } from '../config.js';
import { hashSeed, mulberry32 } from '../engine/rng.js';

const DAY = 24 * 60 * 60 * 1000;

/** Every counter a quest can use. */
export const QUEST_COUNTERS = Object.freeze([...new Set(QUESTS.pool.map((q) => q.counter))]);

/**
 * Monday 00:00 local time of the week holding `now`.
 * @param {number} now ms
 * @returns {number}
 */
export function weekStart(now) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

/**
 * The next Monday 00:00 local time after a week start (DST-safe: calendar days, not 7 x 24 h).
 * @param {number} week
 * @returns {number}
 */
export function nextReset(week) {
  const d = new Date(week);
  d.setDate(d.getDate() + 7);
  return d.getTime();
}

/**
 * ISO week of a local calendar date (the Thursday of its week decides the year).
 * @param {number} t ms
 * @returns {{year: number, week: number}}
 */
export function isoWeekOf(t) {
  const local = new Date(t);
  const d = new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return { year: d.getUTCFullYear(), week: Math.ceil(((d - yearStart) / DAY + 1) / 7) };
}

/**
 * The week's quests: `perWeek` quests from different families, the same for everyone in an ISO week.
 * Draws repeat on the same seed stream until the points add up to QUESTS.weekPoints.
 * @param {{year: number, week: number}} iso
 * @returns {typeof QUESTS.pool[number][]}
 */
export function weekQuests(iso) {
  const rng = mulberry32(hashSeed(iso.year, iso.week));
  const families = [...new Set(QUESTS.pool.map((q) => q.family))];
  const { min, max } = QUESTS.weekPoints;
  let picks = [];
  for (let tries = 0; tries < 200; tries++) {
    const order = families.map((f) => ({ f, k: rng() })).sort((a, b) => a.k - b.k);
    picks = order.slice(0, QUESTS.perWeek).map(({ f }) => {
      const options = QUESTS.pool.filter((q) => q.family === f);
      return options[Math.floor(rng() * options.length)];
    });
    const total = picks.reduce((s, q) => s + q.points, 0);
    if (total >= min && total <= max) break;
  }
  return picks;
}

/** An empty record for a week. */
export const newWeek = (week = 0) => ({ week, counts: {}, claimed: [], chests: [] });

/**
 * Move a record to the week holding `now` when that week is later; otherwise keep it as it is.
 * @param {ReturnType<typeof newWeek>} rec
 * @param {number} now
 * @returns {{rec: ReturnType<typeof newWeek>, reset: boolean}}
 */
export function rollWeek(rec, now) {
  const w = weekStart(now);
  if (!rec.week || w > rec.week) return { rec: newWeek(w), reset: !!rec.week };
  return { rec, reset: false };
}

/**
 * Count progress (after moving to the current week).
 * @param {ReturnType<typeof newWeek>} rec
 * @param {number} now
 * @param {Partial<Record<string, number>>} deltas counter -> amount (booleans count as 1 / 0)
 * @returns {ReturnType<typeof newWeek>}
 */
export function addProgress(rec, now, deltas) {
  const { rec: r } = rollWeek(rec, now);
  const counts = { ...r.counts };
  for (const [k, v] of Object.entries(deltas)) {
    const n = Number(v);
    if (!QUEST_COUNTERS.includes(k) || !Number.isFinite(n) || n <= 0) continue;
    counts[k] = (counts[k] || 0) + Math.floor(n);
  }
  return { ...r, counts };
}

/**
 * Rows for the quest list, in the week's order.
 * @param {ReturnType<typeof newWeek>} rec a record for the current week (see rollWeek)
 * @returns {{id: string, title: string, icon: string, counter: string, goal: number, points: number, value: number,
 *   state: 'ready'|'progress'|'done'}[]}
 */
export function questRows(rec) {
  return weekQuests(isoWeekOf(rec.week)).map((q) => {
    const value = Math.min(q.goal, rec.counts[q.counter] || 0);
    const state = rec.claimed.includes(q.id) ? 'done' : value >= q.goal ? 'ready' : 'progress';
    return { id: q.id, title: q.title, icon: q.icon, counter: q.counter, goal: q.goal, points: q.points, value, state };
  });
}

/**
 * Points earned this week (claimed quests), capped at QUESTS.maxPoints.
 * @param {ReturnType<typeof newWeek>} rec
 * @returns {number}
 */
export function weekPoints(rec) {
  const total = questRows(rec)
    .filter((q) => q.state === 'done')
    .reduce((s, q) => s + q.points, 0);
  return Math.min(QUESTS.maxPoints, total);
}

/**
 * Chests with their state: 'open' (claimed), 'ready' (enough points) or 'locked'.
 * @param {ReturnType<typeof newWeek>} rec
 * @returns {{at: number, reward: object, state: 'open'|'ready'|'locked'}[]}
 */
export function chestRows(rec) {
  const pts = weekPoints(rec);
  return QUESTS.chests.map((c) => ({
    ...c,
    state: rec.chests.includes(c.at) ? 'open' : pts >= c.at ? 'ready' : 'locked',
  }));
}

/**
 * Claim a finished quest (its points go on the bar).
 * @param {ReturnType<typeof newWeek>} rec
 * @param {number} now
 * @param {string} id
 * @returns {{ok: boolean, rec: ReturnType<typeof newWeek>, points?: number, reason?: string}}
 */
export function claimQuest(rec, now, id) {
  const { rec: r } = rollWeek(rec, now);
  const row = questRows(r).find((q) => q.id === id);
  if (!row) return { ok: false, rec: r, reason: 'unknown' };
  if (row.state === 'done') return { ok: false, rec: r, reason: 'claimed' };
  if (row.state !== 'ready') return { ok: false, rec: r, reason: 'progress' };
  return { ok: true, rec: { ...r, claimed: [...r.claimed, id] }, points: row.points };
}

/**
 * Open a chest whose points are reached.
 * @param {ReturnType<typeof newWeek>} rec
 * @param {number} now
 * @param {number} at threshold
 * @returns {{ok: boolean, rec: ReturnType<typeof newWeek>, reward?: {coins?: number, diamonds?: number, hints?: number}, reason?: string}}
 */
export function openChest(rec, now, at) {
  const { rec: r } = rollWeek(rec, now);
  const chest = chestRows(r).find((c) => c.at === at);
  if (!chest) return { ok: false, rec: r, reason: 'unknown' };
  if (chest.state === 'open') return { ok: false, rec: r, reason: 'open' };
  if (chest.state !== 'ready') return { ok: false, rec: r, reason: 'points' };
  return { ok: true, rec: { ...r, chests: [...r.chests, at] }, reward: { ...chest.reward } };
}

/**
 * How many quests and chests can be claimed now (the Quests tab dot).
 * @param {ReturnType<typeof newWeek>} rec
 * @param {number} now
 * @returns {number}
 */
export function questReadyCount(rec, now) {
  const { rec: r } = rollWeek(rec, now);
  return (
    questRows(r).filter((q) => q.state === 'ready').length + chestRows(r).filter((c) => c.state === 'ready').length
  );
}

/**
 * Time left until the reset, e.g. "5d 23h", "7h 05m" or "12m". The reset is the next Monday after the
 * record's week (when the clock was moved back, that is further away, never sooner).
 * @param {ReturnType<typeof newWeek>} rec
 * @param {number} now
 * @returns {string}
 */
export function resetCountdown(rec, now) {
  const { rec: r } = rollWeek(rec, now);
  const ms = Math.max(0, nextReset(r.week) - now);
  const mins = Math.ceil(ms / 60000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m`;
}

/**
 * What is left for a quest, for the toast on a grey Claim button: "Complete 5 more levels first".
 * @param {{counter: string, goal: number, value: number}} row
 * @returns {string}
 */
export function questLeftText(row) {
  const n = Math.max(1, row.goal - row.value);
  const s = n === 1 ? '' : 's';
  const k = n.toLocaleString('en-US');
  const text = {
    wins: `Complete ${k} more level${s}`,
    perfect: `Finish ${k} more perfect level${s}`,
    shapes: `Finish ${k} more shape level${s}`,
    hard: `Finish ${k} more Hard-or-above level${s}`,
    superHard: `Finish ${k} more Super Hard-or-above level${s}`,
    clean: `Complete ${k} more level${s} without a hint`,
    comeback: `Win ${k} more level${s} with only 1 heart left`,
    newLevels: `Finish ${k} more new level${s}`,
    arrows: `Clear ${k} more arrow${s}`,
    daily: `Claim the daily reward on ${k} more day${s}`,
    spend: `Spend ${k} more coin${s}`,
  }[row.counter];
  return `${text || `${k} more to go`} first`;
}
