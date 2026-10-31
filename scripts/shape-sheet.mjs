/**
 * Contact sheet of every shape as it really plays: the generated board of the shape's first level (cycle 1),
 * with the name under it. Flags shapes whose arrows cover less than 85% of the mask, whose board outline
 * breaks apart or strays from the shape, or that needed many attempts or a fallback.
 *
 *   node scripts/shape-sheet.mjs [out.html]
 *
 * Writes a self-contained HTML page (default: shape-sheet.html) and prints the flagged shapes.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEVELS } from '../src/config.js';
import { generateLevel } from '../src/engine/generator.js';
import { getShape, setShapeLibrary, shapeOrder } from '../src/engine/shapes/library.js';
import { cycleOrder } from '../src/engine/shapes/plan.js';
import { areaMask, components, similarity } from '../src/engine/shapes/quality.js';
import { DIRS } from '../src/engine/directions.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] || join(ROOT, 'shape-sheet.html');
const MIN_COVER = 0.85;
const MIN_OUTLINE = 0.8;

setShapeLibrary(JSON.parse(readFileSync(join(ROOT, 'src/engine/shapes/library.json'), 'utf8')));
const first = cycleOrder(shapeOrder(), 0);

/** Small SVG of a generated board: mask cells, then every arrow. */
function boardSvg(level) {
  const { rows, cols, mask } = level;
  let cells = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (mask[r * cols + c]) cells += `M${c} ${r}h1v1h-1z`;
  let lines = '';
  let heads = '';
  for (const a of level.arrows) {
    const pts = [...a.path].reverse().map((p) => `${p.c + 0.5},${p.r + 0.5}`);
    lines += `<polyline points="${pts.join(' ')}"/>`;
    const h = a.path[0];
    const d = DIRS[a.dir];
    const [x, y] = [h.c + 0.5 + d.dc * 0.35, h.r + 0.5 + d.dr * 0.35];
    const [px, py] = [-d.dr * 0.32, d.dc * 0.32];
    heads += `M${x + d.dc * 0.3} ${y + d.dr * 0.3}L${x + px} ${y + py}L${x - px} ${y - py}z`;
  }
  return `<svg viewBox="-0.5 -0.5 ${cols + 1} ${rows + 1}"><path d="${cells}" class="m"/><g class="a">${lines}</g><path d="${heads}" class="h"/></svg>`;
}

const rows = [];
const t0 = Date.now();
first.forEach((id, k) => {
  const n = LEVELS.shapeFrom + k;
  const t = performance.now();
  const level = generateLevel(n);
  const ms = performance.now() - t;
  const maskCells = level.mask.reduce((s, b) => s + b, 0);
  const arrowCells = level.arrows.reduce((s, a) => s + a.path.length, 0);
  const board = { w: level.cols, h: level.rows, bits: Uint8Array.from(level.mask) };
  const outline = similarity(board, areaMask(getShape(id), level.cols));
  const flags = [];
  if (level.shape !== id) flags.push(`fallback to ${level.shape}`);
  if (arrowCells / maskCells < MIN_COVER) flags.push(`arrows cover ${Math.round((100 * arrowCells) / maskCells)}%`);
  if (components(board).length > 1) flags.push('outline in pieces');
  if (outline < MIN_OUTLINE) flags.push(`outline ${Math.round(outline * 100)}% like the shape`);
  if (level.attempt > 20) flags.push(`${level.attempt + 1} attempts`);
  rows.push({ id, n, name: getShape(id).name, size: level.cols, ms, flags, svg: boardSvg(level) });
});

const cards = rows
  .map(
    (r) =>
      `<figure class="${r.flags.length ? 'flag' : ''}">${r.svg}<figcaption><b>${r.name}</b><small>L${r.n} · ${r.size}x${r.size} · ${r.ms.toFixed(0)} ms</small>${r.flags.map((f) => `<em>${f}</em>`).join('')}</figcaption></figure>`,
  )
  .join('');
writeFileSync(
  OUT,
  `<!doctype html><meta charset="utf-8"><title>Shape sheet</title><style>
body{font:12px system-ui,sans-serif;margin:16px;background:#f4f6fa;color:#111}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
figure{margin:0;background:#fff;border-radius:8px;padding:6px;border:2px solid transparent}
figure.flag{border-color:#e5484d}
svg{width:100%;aspect-ratio:1;display:block}
.m{fill:#e8edf6}.a polyline{fill:none;stroke:#0b1442;stroke-width:.32;stroke-linecap:round;stroke-linejoin:round}.h{fill:#0b1442}
figcaption{display:flex;flex-direction:column;gap:2px;margin-top:4px}small{color:#667}em{color:#c92a2a;font-style:normal}
</style><h1>Shape sheet: ${rows.length} shapes, ${rows.filter((r) => r.flags.length).length} flagged</h1><main>${cards}</main>`,
);
const flagged = rows.filter((r) => r.flags.length);
console.log(`${rows.length} shapes in ${((Date.now() - t0) / 1000).toFixed(0)} s, ${flagged.length} flagged -> ${OUT}`);
for (const r of flagged) console.log(`  ${r.id} (level ${r.n}): ${r.flags.join(', ')}`);
