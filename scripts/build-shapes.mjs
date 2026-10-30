#!/usr/bin/env node
/**
 * Builds the board-shape library (dev only, never shipped).
 *
 *   npm run shapes:sources   (once: installs the icon sets, fonts and rasterizer into scripts/shape-sources)
 *   npm run shapes:build
 *
 * 1. Every catalog entry (scripts/shape-catalog.mjs) lists one or more sources. Each source is
 *    rendered to a filled silhouette: icons and emoji from open sets (iconify JSON packs), letters and
 *    numbers from the Inter font, and the game's 20 original shapes from src/engine/masks.js.
 *    Fallback letters come from Roboto Slab.
 * 2. The silhouette is downsampled to 32 cells on its longest side (proportions kept), small holes
 *    are filled, parts thinner than the board allows are trimmed and only the main connected area stays.
 * 3. The first source that passes the quality filter (src/engine/shapes/quality.js) is kept;
 *    rejected ones are logged with the reason.
 * 4. Output: src/engine/shapes/library.json (lazy chunk with the masks), src/engine/shapes/index.json (category ->
 *    ids, loaded up front), CREDITS.md and scripts/shapes-preview.html
 *    (a contact sheet to review every shape; not part of the build).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { insideShape } from '../src/engine/masks.js';
import {
  QUALITY,
  crop,
  emptyMask,
  encodeRle,
  fillHoles,
  filledCount,
  largestPart,
  openMask,
  qualityProblem,
} from '../src/engine/shapes/quality.js';
import { CATEGORIES, CATALOG } from './shape-catalog.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(ROOT, 'scripts/shape-sources');
const require = createRequire(join(SRC_DIR, 'package.json'));
let Resvg;
let opentype;
try {
  ({ Resvg } = require('@resvg/resvg-js'));
  opentype = require('opentype.js');
} catch {
  console.error('Shape sources are missing. Run: npm --prefix scripts/shape-sources install');
  process.exit(1);
}

/** Source sets: prefix -> where it comes from and its license (all allow commercial use). */
export const SOURCES = {
  t: {
    set: 'tabler',
    name: 'Tabler Icons (filled)',
    license: 'MIT',
    url: 'https://tabler.io/icons',
    author: 'Paweł Kuna',
  },
  m: {
    set: 'material-symbols',
    name: 'Material Symbols (filled)',
    license: 'Apache-2.0',
    url: 'https://fonts.google.com/icons',
    author: 'Google',
  },
  f: {
    set: 'fa6-solid',
    name: 'Font Awesome Free 6 (solid)',
    license: 'CC-BY-4.0',
    url: 'https://fontawesome.com',
    author: 'Fonticons, Inc.',
  },
  g: {
    set: 'game-icons',
    name: 'game-icons.net',
    license: 'CC-BY-3.0',
    url: 'https://game-icons.net',
    author: 'Lorc, Delapouite and contributors',
  },
  e: {
    set: 'fluent-emoji-flat',
    name: 'Fluent Emoji (flat)',
    license: 'MIT',
    url: 'https://github.com/microsoft/fluentui-emoji',
    author: 'Microsoft Corporation',
  },
  font: {
    name: 'Inter (Black 900)',
    license: 'OFL-1.1',
    url: 'https://rsms.me/inter/',
    author: 'Rasmus Andersson',
    file: '@fontsource/inter/files/inter-latin-900-normal.woff',
  },
  font2: {
    name: 'Roboto Slab (Black 900)',
    license: 'Apache-2.0',
    url: 'https://fonts.google.com/specimen/Roboto+Slab',
    author: 'Christian Robertson',
    file: '@fontsource/roboto-slab/files/roboto-slab-latin-900-normal.woff',
  },
  orig: { name: 'Arrow Escape original shapes', license: 'project', url: '', author: 'Arrow Escape' },
};

const RENDER_PX = 256;
const HOLE_MAX = 14;
const MIN_KEEP = Number(process.env.MIN_KEEP ?? 0.88); // a trim may remove at most 12% of the silhouette, or the shape stops looking like itself // enclosed holes smaller than this (cells at 32) are filled
const OPEN_KS = [3, 4, 5]; // trims tried in order: parts thinner than this many cells (at 32) are removed

const sets = {};
function iconSet(key) {
  if (!sets[key]) sets[key] = require(`@iconify-json/${SOURCES[key].set}/icons.json`);
  return sets[key];
}

/** SVG markup of an iconify icon (aliases without transforms are followed). */
function iconSvg(key, name) {
  const set = iconSet(key);
  let icon = set.icons[name];
  const alias = set.aliases?.[name];
  if (!icon && alias && Object.keys(alias).length === 1) icon = set.icons[alias.parent];
  if (!icon) return null;
  const w = icon.width ?? set.width ?? 16;
  const h = icon.height ?? set.height ?? 16;
  const body = icon.body.replace(/currentColor/g, '#000');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${icon.left ?? 0} ${icon.top ?? 0} ${w} ${h}" width="${w}" height="${h}">${body}</svg>`;
}

const fonts = {};
/** SVG markup of a letter or digit in one of the fonts. */
function glyphSvg(key, ch) {
  const file = readFileSync(require.resolve(SOURCES[key].file));
  fonts[key] ??= opentype.parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
  const path = fonts[key].getPath(ch, 0, 0, 200);
  const b = path.getBoundingBox();
  const w = b.x2 - b.x1;
  const h = b.y2 - b.y1;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.x1} ${b.y1} ${w} ${h}" width="${w}" height="${h}"><path d="${path.toPathData(2)}" fill="#000"/></svg>`;
}

/** Render SVG markup and downsample its alpha to a mask with `size` cells on the longest side. */
function rasterize(svg, size = QUALITY.size) {
  const img = new Resvg(svg, { fitTo: { mode: 'width', value: RENDER_PX }, background: 'rgba(0,0,0,0)' }).render();
  const { width: W, height: H, pixels } = img;
  const alpha = (x, y) => pixels[(y * W + x) * 4 + 3] / 255;
  let x0 = W;
  let y0 = H;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (alpha(x, y) > 0.1) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  if (x1 < 0) return emptyMask(0, 0);
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  const scale = size / Math.max(bw, bh);
  const m = emptyMask(Math.max(1, Math.round(bw * scale)), Math.max(1, Math.round(bh * scale)));
  for (let r = 0; r < m.h; r++)
    for (let c = 0; c < m.w; c++) {
      const sx0 = x0 + Math.floor((c * bw) / m.w);
      const sx1 = x0 + Math.max(Math.floor(((c + 1) * bw) / m.w), Math.floor((c * bw) / m.w) + 1);
      const sy0 = y0 + Math.floor((r * bh) / m.h);
      const sy1 = y0 + Math.max(Math.floor(((r + 1) * bh) / m.h), Math.floor((r * bh) / m.h) + 1);
      let s = 0;
      for (let y = sy0; y < sy1; y++) for (let x = sx0; x < sx1; x++) s += alpha(x, y);
      m.bits[r * m.w + c] = s / ((sy1 - sy0) * (sx1 - sx0)) >= 0.5 ? 1 : 0;
    }
  return m;
}

/** One of the game's original 20 shapes, sampled from its formula or pixel art. */
function originalMask(name, size = QUALITY.size) {
  const m = emptyMask(size, size);
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      m.bits[r * size + c] = insideShape(name, ((c + 0.5) / size) * 2 - 1, ((r + 0.5) / size) * 2 - 1) ? 1 : 0;
  return crop(m);
}

/** Holes filled, parts thinner than k cells trimmed (k = 0: none), main area only, cropped. */
function clean(m, k) {
  let out = fillHoles(m, HOLE_MAX);
  if (k > 1) out = openMask(out, k);
  return crop(largestPart(out));
}

/**
 * Raw mask for a source reference ('g:cat', 'font:A', 'orig:heart').
 * @returns {{w: number, h: number, bits: Uint8Array}|null}
 */
function sourceMask(ref) {
  const [key, name] = ref.split(':');
  if (key === 'orig') return originalMask(name);
  if (key === 'font' || key === 'font2') return rasterize(glyphSvg(key, name));
  if (!SOURCES[key]?.set) throw new Error(`unknown source ${ref}`);
  const svg = iconSvg(key, name);
  return svg ? rasterize(svg) : null;
}

/** Build every catalog entry; the first source that passes the filter wins. */
function build() {
  const shapes = [];
  const rejected = [];
  for (const key of ['id', 'name']) {
    const seen = new Set();
    for (const entry of CATALOG) {
      if (seen.has(entry[key])) throw new Error(`duplicate ${key} ${entry[key]}`);
      seen.add(entry[key]);
    }
  }
  for (const entry of CATALOG) {
    let kept = null;
    const why = [];
    for (const ref of entry.sources) {
      const raw = sourceMask(ref);
      if (!raw) {
        why.push(`${ref}: not found`);
        continue;
      }
      // untouched first, then lighter to stronger trims
      let first = null;
      const full = filledCount(clean(raw, 0));
      for (const k of [0, ...OPEN_KS]) {
        const m = clean(raw, k);
        const keep = filledCount(m) / full;
        const problem =
          keep < MIN_KEEP ? `trimming thin parts loses ${Math.round((1 - keep) * 100)}% of it` : qualityProblem(m);
        first ??= problem; // the untouched shape's problem is the useful one to log
        if (!problem) {
          kept = { ...entry, ref, mask: m };
          break;
        }
      }
      if (kept) break;
      why.push(`${ref}: ${first}`);
    }
    if (kept) shapes.push(kept);
    else rejected.push({ entry, why });
  }
  return { shapes, rejected };
}

function writeLibrary(shapes) {
  const lib = {
    version: 1,
    size: QUALITY.size,
    categories: CATEGORIES.map(({ id, name, target }) => ({ id, name, target })),
    sources: Object.fromEntries(
      Object.entries(SOURCES).map(([k, s]) => [k, { name: s.name, license: s.license, url: s.url, author: s.author }]),
    ),
    // one array per shape (keys once here) keeps the file small
    fields: ['id', 'name', 'category', 'width', 'height', 'source', 'license', 'rle'],
    shapes: shapes.map((s) => [
      s.id,
      s.name,
      s.category,
      s.mask.w,
      s.mask.h,
      s.ref,
      SOURCES[s.ref.split(':')[0]].license,
      encodeRle(s.mask.bits),
    ]),
  };
  const file = join(ROOT, 'src/engine/shapes/library.json');
  writeFileSync(file, JSON.stringify(lib));
  return { file, bytes: Buffer.byteLength(JSON.stringify(lib)) };
}

/** Small index (category -> shape ids) the game loads up front, for the collection and achievements. */
function writeIndex(shapes) {
  const index = {
    categories: CATEGORIES.map(({ id, name, target }) => ({ id, name, target })),
    members: Object.fromEntries(
      CATEGORIES.map((c) => [c.id, shapes.filter((s) => s.category === c.id).map((s) => s.id)]),
    ),
  };
  writeFileSync(join(ROOT, 'src/engine/shapes/index.json'), JSON.stringify(index));
}

function writePreview(shapes, rejected) {
  const tile = (s) => {
    const { w, h, bits } = s.mask;
    let d = '';
    for (let i = 0; i < bits.length; i++) if (bits[i]) d += `M${i % w} ${Math.floor(i / w)}h1v1h-1z`;
    const size = Math.max(w, h);
    return `<figure title="${s.id} (${s.ref}, ${SOURCES[s.ref.split(':')[0]].license})"><svg viewBox="${(w - size) / 2} ${(h - size) / 2} ${size} ${size}"><path d="${d}"/></svg><figcaption>${s.name}</figcaption></figure>`;
  };
  const sections = CATEGORIES.map((c) => {
    const list = shapes.filter((s) => s.category === c.id);
    return `<h2>${c.name} <small>${list.length} / ${c.target}</small></h2><div class="grid">${list.map(tile).join('')}</div>`;
  }).join('');
  const rej = rejected
    .map(({ entry, why }) => `<li><b>${entry.name}</b> (${entry.category}): ${why.join('; ')}</li>`)
    .join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Shape Library Preview</title>
<style>
:root{--bg:#f4f6fb;--fg:#1d2433;--muted:#667;--tile:#fff;--ink:#3b5bdb}
@media (prefers-color-scheme:dark){:root{--bg:#11151f;--fg:#e8ecf5;--muted:#99a;--tile:#1b2130;--ink:#8ea8ff}}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.4 system-ui,sans-serif}
h1{margin:0 0 4px}h2{margin:28px 0 10px;font-size:18px}small{color:var(--muted);font-weight:500}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:8px}
figure{margin:0;padding:8px 4px 6px;background:var(--tile);border-radius:10px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.08)}
svg{width:56px;height:56px;fill:var(--ink);shape-rendering:crispEdges}
figcaption{font-size:11px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
li{margin:2px 0;color:var(--muted)}
</style></head><body><h1>Shape library: ${shapes.length} shapes</h1><p>Generated by scripts/build-shapes.mjs. Hover a tile for its id, source and license. Not part of the game build.</p>${sections}<h2>Rejected <small>${rejected.length}</small></h2><ul>${rej}</ul></body></html>`;
  const file = join(ROOT, 'scripts/shapes-preview.html');
  writeFileSync(file, html);
  return file;
}

/** CREDITS.md: every source in use, its license and how many shapes come from it. */
function writeCredits(shapes) {
  const count = (k) => shapes.filter((s) => s.ref.startsWith(`${k}:`)).length;
  const rows = Object.entries(SOURCES)
    .filter(([k]) => count(k) > 0)
    .map(([k, s]) => `| ${s.url ? `[${s.name}](${s.url})` : s.name} | ${s.author} | ${s.license} | ${count(k)} |`)
    .join('\n');
  const md = `# Credits

Arrow Escape's board shapes (\`src/engine/shapes/library.json\`) are silhouettes made from the open sources below
by \`scripts/build-shapes.mjs\`. Each shape records its source and license in the library, and the game lists these
credits in Settings > Credits.

| Source | Author | License | Shapes |
| --- | --- | --- | ---: |
${rows}

## Attribution

- **Font Awesome Free** icons by Fonticons, Inc. are licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). https://fontawesome.com/license/free
- **game-icons.net** icons by Lorc, Delapouite and other contributors are licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). https://game-icons.net
- **Material Symbols** by Google are licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).
- **Tabler Icons** by Paweł Kuna are licensed under the [MIT License](https://github.com/tabler/tabler-icons/blob/main/LICENSE).
- **Fluent Emoji** by Microsoft Corporation are licensed under the [MIT License](https://github.com/microsoft/fluentui-emoji/blob/main/LICENSE).
- **Inter** by Rasmus Andersson is licensed under the [SIL Open Font License 1.1](https://openfontlicense.org).
- **Roboto Slab** by Christian Robertson is licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).

The shapes are changed from the originals: filled, downsampled to a 32-cell grid and trimmed to play as boards.
`;
  writeFileSync(join(ROOT, 'CREDITS.md'), md);
}

const { shapes, rejected } = build();
for (const { entry, why } of rejected) console.log(`REJECTED ${entry.category}/${entry.name}: ${why.join('; ')}`);
let short = false;
for (const c of CATEGORIES) {
  const n = shapes.filter((s) => s.category === c.id).length;
  if (n < c.target) short = true;
  console.log(`${c.name.padEnd(10)} ${String(n).padStart(4)} / ${c.target}${n < c.target ? '  BELOW TARGET' : ''}`);
}
const { file, bytes } = writeLibrary(shapes);
const preview = writePreview(shapes, rejected);
writeCredits(shapes);
writeIndex(shapes);
// keep generated Markdown in the repo's Prettier style
execFileSync(join(ROOT, 'node_modules/.bin/prettier'), ['--write', join(ROOT, 'CREDITS.md')]);
console.log(`Total ${shapes.length} shapes, ${rejected.length} rejected. ${file} (${(bytes / 1024).toFixed(1)} KB)`);
console.log(`Preview: ${preview}`);
if (short) process.exitCode = 1;
