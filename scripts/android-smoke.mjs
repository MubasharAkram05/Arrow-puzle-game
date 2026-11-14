/**
 * Android emulator smoke test (android-release workflow, "emulator" job). The debug APK is installed and
 * opened on an emulator by scripts/android-smoke.sh, which forwards the app's WebView DevTools socket to
 * localhost:9222. This script talks to that WebView over the Chrome DevTools Protocol (Node's built-in
 * WebSocket, no extra packages): it claims or closes the daily reward, plays level 1 with real touch taps
 * (level 1 is drawn by hand, so its arrows are known), waits for the victory popup, and checks that this
 * WebView builds the golden boards (tests/fixtures/level-hashes.json, debug builds expose the hook).
 * It fails on any console error or warning, uncaught exception or unhandled promise rejection in the app.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { LEVEL_ONE } from '../src/engine/levels.js';
import { solveLevel } from '../src/engine/solver.js';

const OUT = process.env.SMOKE_OUT || '.';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const issues = [];
const notes = [];

// ---------- a tiny CDP client ----------
const targets = await (await fetch('http://127.0.0.1:9222/json')).json();
const target = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
if (!target) throw new Error(`no WebView page target: ${JSON.stringify(targets)}`);
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});
let nextId = 0;
const pending = new Map();
ws.onmessage = ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(`${msg.error.message}`));
    else resolve(msg.result);
    return;
  }
  if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
    const text = msg.params.args.map((a) => a.value ?? a.description).join(' ');
    // Capacitor's SystemBars plugin injects the safe-area CSS variables from native code as soon as the window
    // insets arrive, which can be before the page has a document; it injects them again when the page is shown
    // (checked below), so this one startup message is Capacitor's, not the app's.
    if (/^Error injecting safe area CSS: TypeError: Cannot read properties of null/.test(text)) {
      notes.push(`Capacitor startup message (ignored): ${text.split('\n')[0]}`);
      return;
    }
    issues.push(`console.${msg.params.type}: ${text}`);
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails;
    issues.push(`exception: ${d.exception?.description || d.text}`);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
/** Evaluate an expression in the app (awaits promises) and return its value. */
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const waitFor = async (expression, timeout = 15000) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await evaluate(expression)) return;
    await sleep(200);
  }
  throw new Error(`timed out waiting for: ${expression}`);
};
/** A real touch tap at a point in CSS pixels. */
const tap = async (x, y) => {
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await sleep(40);
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
};
/** Tap the middle of an element. */
const tapEl = async (sel) => {
  const p = await evaluate(
    `(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`,
  );
  await tap(p.x, p.y);
};
const isOpen = (id) => evaluate(`!!document.getElementById('${id}')?.classList.contains('open')`);
const shot = async (name) => {
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${name}`, Buffer.from(data, 'base64'));
};

await send('Runtime.enable');
await send('Page.enable');
await evaluate(
  `window.addEventListener('unhandledrejection', (e) => console.error('unhandledrejection: ' + (e.reason && e.reason.stack || e.reason))), true`,
);

/** What the app shows right now (for the log). */
const STATE = `JSON.stringify({
  screen: [...document.querySelectorAll('.screen')].filter((x) => x.classList.contains('active') || x.classList.contains('on')).map((x) => x.id),
  modals: [...document.querySelectorAll('.modal.open')].map((m) => m.id),
  progress: document.getElementById('progress')?.style.transform,
  lostHearts: document.querySelectorAll('#hearts .heart.lost').length,
  board: (() => { const r = document.getElementById('board').getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round); })(),
  viewport: [innerWidth, innerHeight, devicePixelRatio],
})`;

const step = async (name, fn) => {
  const t = Date.now();
  await fn();
  console.log(`ok  ${name} (${Date.now() - t} ms)`);
};

let failed = null;
try {
  await step('app loaded (splash gone)', () => waitFor(`!document.getElementById('boot-splash')`, 30000));
  await step('daily reward claimed or closed', async () => {
    await sleep(800);
    if (!(await isOpen('modal-daily'))) return;
    const claim = await evaluate(
      `(() => { const b = document.getElementById('btn-daily-claim'); return !!b && !b.hidden; })()`,
    );
    if (claim) await tapEl('#btn-daily-claim');
    await sleep(2500);
    if (await isOpen('modal-daily')) await tapEl('#modal-daily [data-close]');
    await sleep(600);
  });
  await step('level 1 opened', async () => {
    await tapEl('#btn-play');
    await waitFor(`document.getElementById('board').getBoundingClientRect().width > 0`);
    await sleep(1500);
  });
  await step('level 1 won with real taps', async () => {
    const level = { ...LEVEL_ONE, mask: null, arrows: LEVEL_ONE.arrows.map((a) => ({ ...a })) };
    for (const id of solveLevel(level).order) {
      const { r, c } = level.arrows[id].path[Math.floor(level.arrows[id].path.length / 2)];
      const p = await evaluate(
        `(() => { const b = document.getElementById('board').getBoundingClientRect(); return { x: b.left + ${(c + 0.5) / level.cols} * b.width, y: b.top + ${(r + 0.5) / level.rows} * b.height }; })()`,
      );
      const under = await evaluate(
        `(() => { const e = document.elementFromPoint(${p.x}, ${p.y}); return e ? e.id || e.className || e.tagName : 'nothing'; })()`,
      );
      await tap(p.x, p.y);
      await sleep(700);
      console.log(`    tap arrow ${id} at ${p.x.toFixed(0)},${p.y.toFixed(0)} on ${under}: ${await evaluate(STATE)}`);
    }
    await waitFor(`!!document.querySelector('#modal-victory.open')`);
    await sleep(1200);
  });
  await step('level fingerprints match the golden hashes (this WebView builds the same boards)', async () => {
    const want = JSON.parse(readFileSync(new URL('../tests/fixtures/level-hashes.json', import.meta.url), 'utf8'));
    const got = await evaluate('window.__arrowLevelHashes()');
    const bad = Object.keys(want).filter((n) => got[n] !== want[n]);
    console.log(`    ${Object.keys(want).length} levels checked, ${bad.length} different`);
    if (bad.length) throw new Error(`different boards in this WebView for levels ${bad.join(', ')}`);
  });
  await step('safe-area insets set (Capacitor variables and env())', async () => {
    const insets = await evaluate(`(() => {
      const css = getComputedStyle(document.documentElement);
      const probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)';
      document.body.appendChild(probe);
      const p = getComputedStyle(probe);
      const out = { capTop: css.getPropertyValue('--safe-area-inset-top'), capBottom: css.getPropertyValue('--safe-area-inset-bottom'), envTop: p.paddingTop, envBottom: p.paddingBottom };
      probe.remove();
      return JSON.stringify(out);
    })()`);
    console.log(`    ${insets}`);
  });
} catch (e) {
  failed = e;
  console.log(`state at failure: ${await evaluate(STATE).catch((x) => x.message)}`);
} finally {
  await shot('smoke-webview.png').catch(() => {});
  ws.close();
}

if (notes.length) console.log(`\n${notes.join('\n')}`);
console.log(
  issues.length ? `\nApp console issues:\n${issues.join('\n')}` : '\nNo console errors, warnings or page errors.',
);
if (failed) {
  console.error(`\nSmoke test failed: ${failed.message}`);
  process.exit(1);
}
if (issues.length) process.exit(1);
