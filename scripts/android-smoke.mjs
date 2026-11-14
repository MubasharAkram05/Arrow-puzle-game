/**
 * Android emulator smoke test (android-release workflow, "emulator" job). The debug APK is installed and
 * opened on an emulator by scripts/android-smoke.sh, which forwards the app's WebView DevTools socket to
 * localhost:9222. This script connects to that WebView, claims or closes the daily reward, plays level 1
 * with real taps (level 1 is drawn by hand, so its arrows are known) and waits for the victory popup.
 * It fails on any console error, page error or unhandled promise rejection in the app.
 * Needs playwright-core (installed by the workflow, not a project dependency).
 */
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import { LEVEL_ONE } from '../src/engine/levels.js';
import { solveLevel } from '../src/engine/solver.js';

const OUT = process.env.SMOKE_OUT || '.';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const issues = [];

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts()[0]?.pages()[0];
if (!page) throw new Error('no WebView page found');
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && issues.push(`console.${m.type()}: ${m.text()}`));
page.on('pageerror', (e) => issues.push(`pageerror: ${e.message}`));
await page.evaluate(() =>
  window.addEventListener('unhandledrejection', (e) => console.error(`unhandledrejection: ${e.reason}`)),
);

const step = async (name, fn) => {
  const t = Date.now();
  await fn();
  console.log(`ok  ${name} (${Date.now() - t} ms)`);
};
const isOpen = (id) => page.evaluate((i) => document.getElementById(i)?.classList.contains('open'), id);

try {
  await step('app loaded (splash gone)', () =>
    page.waitForSelector('#boot-splash', { state: 'detached', timeout: 30000 }),
  );
  await step('daily reward claimed or closed', async () => {
    await sleep(800);
    if (!(await isOpen('modal-daily'))) return;
    if (await page.isVisible('#btn-daily-claim')) await page.click('#btn-daily-claim');
    await sleep(2500);
    if (await isOpen('modal-daily')) await page.click('#modal-daily [data-close]');
    await sleep(500);
  });
  await step('level 1 opened', async () => {
    await page.click('#btn-play');
    await sleep(1500);
  });
  await step('level 1 won with real taps', async () => {
    const level = { ...LEVEL_ONE, arrows: LEVEL_ONE.arrows.map((a) => ({ ...a })) };
    for (const id of solveLevel(level).order) {
      const { r, c } = level.arrows[id].path[Math.floor(level.arrows[id].path.length / 2)];
      const p = await page.evaluate(
        ({ r, c, rows, cols }) => {
          const b = document.getElementById('board').getBoundingClientRect();
          return { x: b.left + ((c + 0.5) / cols) * b.width, y: b.top + ((r + 0.5) / rows) * b.height };
        },
        { r, c, rows: level.rows, cols: level.cols },
      );
      await page.mouse.click(p.x, p.y);
      await sleep(400);
    }
    await page.waitForSelector('#modal-victory.open', { timeout: 15000 });
  });
} finally {
  writeFileSync(`${OUT}/smoke-webview.png`, await page.screenshot().catch(() => Buffer.alloc(0)));
  await browser.close().catch(() => {});
}

console.log(
  issues.length ? `\nApp console issues:\n${issues.join('\n')}` : '\nNo console errors, warnings or page errors.',
);
if (issues.length) process.exit(1);
