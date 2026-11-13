/**
 * Store screenshots (npm run screenshots): real gameplay captured with Playwright, each with a short caption
 * banner on top in the brand gradient.
 *   phone      8 x 1080x1920  store-assets/screenshots/phone/
 *   tablet-7   4 x 1200x1920  store-assets/screenshots/tablet-7/
 *   tablet-10  4 x 1600x2560  store-assets/screenshots/tablet-10/
 * The dev server runs with ARROW_TEST_UNLOCK=0, so TEST_UNLOCK_ALL is off while capturing (no "TEST MODE"
 * badge); nothing in the code changes. Needs Playwright with Chromium, and Python 3 with Pillow
 * to save the files without an alpha channel (Google Play wants opaque images).
 */
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'store-assets', 'screenshots');
const PORT = 5299;
const URL = `http://localhost:${PORT}/`;
const LOGO =
  'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'public', 'icons', 'logo-256.png')).toString('base64');

const DEVICES = {
  phone: { out: [1080, 1920], banner: 300, scale: 3 },
  'tablet-7': { out: [1200, 1920], banner: 280, scale: 2 },
  'tablet-10': { out: [1600, 2560], banner: 360, scale: 2 },
};

const SHOTS = [
  { file: '01-tap-arrows', caption: 'Tap arrows to set them free', setup: (p) => level(p, 5, { hint: true }) },
  { file: '02-think', caption: 'Think before you tap', setup: (p) => level(p, 31, { fit: true }) },
  { file: '03-shapes', caption: '450+ shape puzzles', setup: (p) => level(p, 15, { fit: true }) },
  { file: '04-snake-arrows', caption: 'Snake arrows, endless twists', setup: (p) => level(p, 44) },
  { file: '05-weekly-quests', caption: 'Weekly quests & rewards', setup: weekly },
  { file: '06-daily-rewards', caption: 'Daily rewards', setup: daily },
  { file: '07-badges-trophies', caption: 'Earn badges & trophies', setup: awards },
  { file: '08-themes', caption: 'Light & dark themes', setup: (p) => level(p, 99, { fit: true }), split: true },
];
const TABLET_SHOTS = ['01-tap-arrows', '03-shapes', '05-weekly-quests', '07-badges-trophies'];

// ---------- saves and screens ----------

/** A save for a player at level n, with today's daily reward already claimed (no popup). */
async function seed(page, n, theme, extra = {}, local = {}) {
  await page.evaluate(
    async ({ n, theme, extra, local }) => {
      const { dayNumber } = await import('/src/game/daily.js');
      const today = dayNumber(Date.now());
      const save = {
        version: 7,
        progress: { current: n, unlocked: n, completed: Array.from({ length: n - 1 }, (_, i) => i + 1) },
        wallet: { coins: 1340, diamonds: 12, hints: 3 },
        stats: { arrowsCleared: 2400, wins: n - 1 },
        daily: { lastClaim: today, streak: 4, best: 6, lastSeen: Date.now(), blockedDay: null },
        dailyDays: [today - 3, today - 2, today - 1, today],
        settings: { theme, sound: false, vibration: false, grid: false },
        ...extra,
      };
      localStorage.clear();
      localStorage.setItem('arrowEscape:v7', JSON.stringify(save));
      localStorage.setItem('arrowEscape:zoomGuide', JSON.stringify({ shown: 9, pinched: true }));
      for (const [k, v] of Object.entries(local)) localStorage.setItem(k, v);
    },
    { n, theme, extra, local },
  );
  await page.reload();
  await page.waitForSelector('#boot-splash', { state: 'detached' });
}

async function level(page, n, o = {}) {
  await seed(page, n, o.theme || 'light');
  await page.click('#btn-play');
  await page.waitForTimeout(1500); // board built and the intro animation done
  if (o.fit) await zoomOut(page);
  if (o.hint) {
    await page.click('#btn-hint');
    await page.waitForTimeout(900);
  }
}

/** Zoom all the way out (the whole board), as a player would with a pinch; the wheel zoom does the same. */
async function zoomOut(page) {
  const box = await page.locator('#board-wrap').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < 8; i++) await page.mouse.wheel(0, 600);
  await page.waitForTimeout(500); // sharp redraw after the zoom
}

async function weekly(page) {
  const quests = await page.evaluate(async () => {
    const q = await import('/src/game/quests.js');
    const rec = q.rollWeek(q.newWeek(), Date.now()).rec;
    const rows = q.questRows(rec);
    const counts = {};
    rows.forEach((r, i) => {
      const v = i < 2 ? r.goal : i === 2 ? r.goal : Math.ceil(r.goal * [0, 0, 0, 0.6, 0.35, 0.15][i]);
      counts[r.counter] = Math.max(counts[r.counter] || 0, v);
    });
    return { week: rec.week, counts, claimed: rows.slice(0, 2).map((r) => r.id), chests: [] };
  });
  await seed(page, 60, 'light', { quests }, { 'arrowEscape:tasksTab': 'weekly' });
  await page.click('.nav-tab[data-screen="screen-tasks"]');
  await page.waitForTimeout(700);
}

async function daily(page) {
  await page.evaluate(async () => {
    const { dayNumber } = await import('/src/game/daily.js');
    const today = dayNumber(Date.now());
    localStorage.setItem('__dailyToday', String(today));
  });
  const today = Number(await page.evaluate(() => localStorage.getItem('__dailyToday')));
  // yesterday was claimed (day 4 of the cycle), so today's reward is waiting and the popup opens on Home
  await seed(page, 24, 'light', {
    daily: { lastClaim: today - 1, streak: 4, best: 6, lastSeen: Date.now() - 3600e3, blockedDay: null },
    dailyDays: [today - 4, today - 3, today - 2, today - 1],
  });
  await page.waitForSelector('#modal-daily.open', { timeout: 5000 });
  await page.waitForTimeout(900);
}

async function awards(page) {
  const today = await page.evaluate(async () => (await import('/src/game/daily.js')).dayNumber(Date.now()));
  const claimed = [
    'first-escape',
    'level-climber-1',
    'level-climber-2',
    'arrow-hunter',
    'perfectionist',
    'brain-power-1',
    'comeback-1',
    'daily-player-1',
    'daily-player-2',
    'shape-solver-1',
    'hard-worker-1',
  ];
  const days = [];
  for (let d = today - 120; d <= today; d++) if (d % 3 !== 0 || d > today - 20) days.push(d);
  await seed(
    page,
    160,
    'light',
    {
      achievements: { claimed, progress: {} },
      seenBadges: claimed,
      dailyDays: days,
      progress: {
        current: 160,
        unlocked: 160,
        completed: Array.from({ length: 159 }, (_, i) => i + 1),
        perfect: [2, 3, 5, 8, 13],
      },
    },
    { 'arrowEscape:profileTab': 'awards' },
  );
  await page.click('.nav-tab[data-screen="screen-profile"]');
  await page.waitForTimeout(900);
}

// ---------- capture and compose ----------

async function capture(browser, shot, dev, theme = 'light') {
  const [W, H] = dev.out;
  const vw = W / dev.scale;
  const vh = (H - dev.banner) / dev.scale;
  const ctx = await browser.newContext({
    viewport: { width: vw, height: vh },
    deviceScaleFactor: dev.scale,
    colorScheme: theme,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL);
  await page.waitForSelector('#boot-splash', { state: 'detached' });
  if (theme === 'dark') {
    // same setup, dark theme saved in settings
    await seed(page, 99, 'dark');
    await page.click('#btn-play');
    await page.waitForTimeout(1500);
    await zoomOut(page);
  } else await shot.setup(page);
  const badge = await page.evaluate(() => {
    const b = document.getElementById('test-badge');
    return !!b && !b.hidden && b.offsetParent !== null;
  });
  if (badge) throw new Error(`${shot.file}: TEST MODE badge is visible`);
  const png = await page.screenshot();
  await ctx.close();
  if (errors.length) throw new Error(`${shot.file}: ${errors.join('; ')}`);
  return 'data:image/png;base64,' + png.toString('base64');
}

function composeHTML(dev, caption, img, img2) {
  const [W, H] = dev.out;
  const fs1 = Math.round(W * 0.062);
  const split = img2
    ? `<img class="shot" src="${img2}" style="clip-path: polygon(62% 0, 100% 0, 100% 100%, 38% 100%)" />
       <div class="divider"></div>`
    : '';
  return `<!doctype html><html><head><style>
    * { margin: 0; box-sizing: border-box; }
    body { width: ${W}px; height: ${H}px; overflow: hidden; background: #021470; font-family: Inter, system-ui, sans-serif; }
    .banner { position: relative; height: ${dev.banner}px; display: flex; align-items: center; justify-content: center;
      gap: ${Math.round(W * 0.03)}px; padding: 0 ${Math.round(W * 0.06)}px;
      background: linear-gradient(135deg, #05e6fc 0%, #0250f7 50%, #021470 100%); color: #fff; }
    .banner img { width: ${Math.round(dev.banner * 0.42)}px; height: ${Math.round(dev.banner * 0.42)}px; flex: none;
      filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.25)); }
    .banner h1 { font-size: ${fs1}px; font-weight: 800; line-height: 1.12; letter-spacing: -0.01em;
      text-shadow: 0 3px 12px rgba(0, 0, 0, 0.25); }
    .wrap { position: relative; height: ${H - dev.banner}px; }
    .shot { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
    .divider { position: absolute; top: 0; bottom: 0; left: 50%; width: 6px; background: #fff;
      transform: translateX(-50%) skewX(-${Math.round((Math.atan((0.24 * W) / (H - dev.banner)) * 180) / Math.PI)}deg);
      box-shadow: 0 0 18px rgba(0, 0, 0, 0.35); }
  </style></head><body>
    <div class="banner"><img src="${LOGO}" alt="" /><h1>${caption}</h1></div>
    <div class="wrap"><img class="shot" src="${img}" />${split}</div>
  </body></html>`;
}

async function compose(browser, dev, caption, img, img2, file) {
  const [W, H] = dev.out;
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(composeHTML(dev, caption, img, img2));
  await page.waitForLoadState('networkidle');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file });
  await page.close();
}

// ---------- run ----------

function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
      cwd: ROOT,
      detached: true,
      env: { ...process.env, ARROW_TEST_UNLOCK: '0' },
    });
    let out = '';
    const timer = setTimeout(() => reject(new Error('dev server did not start')), 30000);
    proc.stdout.on('data', (d) => {
      out += d;
      if (out.includes('Local')) {
        clearTimeout(timer);
        resolve(proc);
      }
    });
    proc.on('exit', (code) => reject(new Error(`dev server exited (${code})`)));
  });
}

async function main() {
  let server;
  let browser;
  const files = [];
  try {
    server = await startServer();
    browser = await chromium.launch();
    for (const [name, dev] of Object.entries(DEVICES)) {
      const list = name === 'phone' ? SHOTS : SHOTS.filter((s) => TABLET_SHOTS.includes(s.file));
      for (const shot of list) {
        const img = await capture(browser, shot, dev);
        const img2 = shot.split ? await capture(browser, shot, dev, 'dark') : null;
        const file = path.join(OUT, name, `${shot.file}.png`);
        await compose(browser, dev, shot.caption, img, img2, file);
        files.push(file);
        console.log('wrote', path.relative(ROOT, file));
      }
    }
  } finally {
    if (browser) await browser.close();
    if (server) process.kill(-server.pid);
  }
  // Google Play wants opaque images: drop the alpha channel
  execFileSync('python3', [
    '-c',
    'import sys\nfrom PIL import Image\nfor f in sys.argv[1:]:\n    Image.open(f).convert("RGB").save(f, optimize=True)',
    ...files,
  ]);
  console.log(`done: ${files.length} screenshots`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
