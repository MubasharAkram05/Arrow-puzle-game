/**
 * CI check (3.28.0): the boards built inside Chrome match the golden hashes (tests/fixtures/level-hashes.json),
 * so the browser builds exactly the boards Node's tests check. Needs a debug build served at the given URL
 * (ARROW_TEST_ADS=1 exposes window.__arrowLevelHashes) and a Chrome started with --remote-debugging-port=9222.
 * Uses the DevTools protocol directly (Node's built-in fetch and WebSocket), no extra packages.
 *   node scripts/chrome-level-hashes.mjs http://localhost:4173/
 */
import { readFileSync } from 'node:fs';

const url = process.argv[2] || 'http://localhost:4173/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let version = null;
for (let i = 0; i < 60 && !version; i++) {
  version = await fetch('http://127.0.0.1:9222/json/version')
    .then((r) => r.json())
    .catch(() => null);
  if (!version) await sleep(500);
}
if (!version) throw new Error('no Chrome DevTools endpoint on port 9222');
const target = await (
  await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })
).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});
let id = 0;
const pending = new Map();
ws.onmessage = ({ data }) => {
  const m = JSON.parse(data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve) => {
    pending.set(++id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const m = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (m.error || m.result.exceptionDetails) throw new Error(JSON.stringify(m.error || m.result.exceptionDetails));
  return m.result.result.value;
};

for (let i = 0; i < 120; i++) {
  if (await evaluate(`typeof window.__arrowLevelHashes === 'function'`).catch(() => false)) break;
  await sleep(250);
}
const want = JSON.parse(readFileSync(new URL('../tests/fixtures/level-hashes.json', import.meta.url), 'utf8'));
const got = await evaluate('window.__arrowLevelHashes()');
ws.close();
const bad = Object.keys(want).filter((n) => got[n] !== want[n]);
console.log(`${version.Browser}: ${Object.keys(want).length} golden levels, ${bad.length} different`);
if (bad.length) {
  for (const n of bad) console.log(`  level ${n}: expected ${want[n]}, got ${got[n]}`);
  process.exit(1);
}
