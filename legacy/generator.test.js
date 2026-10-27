// Plain Node test: node tests/generator.test.js
// Extracts the <script id="engine"> block from index.html, runs it in a sandbox,
// then generates levels 1-200 and 30 daily seeds and checks every one.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const match = html.match(/<script id="engine">([\s\S]*?)<\/script>/);
if (!match) throw new Error('engine block not found in index.html');
const sandbox = { module: { exports: {} } };
vm.runInNewContext(match[1], sandbox, { filename: 'engine.js' });
const E = sandbox.module.exports;

let failures = 0;
let checks = 0;

/* Record a failed check. */
function fail(name, msg) {
    failures++;
    console.error('FAIL ' + name + ': ' + msg);
}

/* Check one level against structure, solver and tier rules. */
function checkLevel(name, level, rules) {
    checks++;
    const errs = E.validateLevel(level);
    errs.forEach(e => fail(name, e));
    if (level.rows < rules.min || level.rows > rules.max || level.cols < rules.min || level.cols > rules.max) {
        fail(name, 'size ' + level.rows + 'x' + level.cols + ' outside ' + rules.min + '-' + rules.max);
    }
    if (rules.arrows && (level.arrows.length < rules.arrows[0] || level.arrows.length > rules.arrows[1])) {
        fail(name, 'arrow count ' + level.arrows.length);
    }
    if (rules.difficulty && level.difficulty !== rules.difficulty) fail(name, 'difficulty ' + level.difficulty);
    if (rules.shape !== undefined && level.shape !== rules.shape) fail(name, 'shape ' + level.shape + ' expected ' + rules.shape);
    // Replay the solver's order step by step with the same ray rule the game uses
    const occ = E.buildOccupancy(level);
    for (const id of E.solveLevel(level).order) {
        const a = level.arrows[id];
        if (E.rayBlocker(occ, level.rows, level.cols, a.path[0], a.dir)) { fail(name, 'replay blocked at arrow ' + id); break; }
        for (const p of a.path) occ[p.r * level.cols + p.c] = -1;
    }
}

/* Expected tier rules for a level number (mirrors the spec). */
function rulesFor(n) {
    const shape = n % 10 === 0 ? E.MASK_SHAPES[(n / 10 - 1) % 5] : null;
    if (n <= 5) return { min: 5, max: 6, arrows: [4, 8], difficulty: 'Normal', shape };
    if (n <= 20) return { min: 7, max: 9, difficulty: 'Normal', shape };
    if (n <= 50) return { min: 10, max: 13, difficulty: 'Hard', shape };
    return { min: 14, max: 16, difficulty: 'Super Hard', shape };
}

const t0 = Date.now();
for (let n = 1; n <= 200; n++) {
    let level;
    try { level = E.generateLevel(n); } catch (e) { fail('level ' + n, e.message); continue; }
    checkLevel('level ' + n, level, rulesFor(n));
    // Same seed must give the same level
    if (JSON.stringify(E.generateLevel(n).arrows) !== JSON.stringify(level.arrows)) fail('level ' + n, 'not deterministic');
}

const start = new Date(2026, 0, 1);
for (let i = 0; i < 30; i++) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = E.dateKey(day);
    let level;
    try { level = E.generateDaily(key); } catch (e) { fail('daily ' + key, e.message); continue; }
    checkLevel('daily ' + key, level, { min: 14, max: 16, difficulty: 'Super Hard' });
}

// Each mask shape must appear in the cycle
const shapes = new Set();
for (let n = 10; n <= 50; n += 10) shapes.add(E.generateLevel(n).shape);
if (shapes.size !== 5) fail('masks', 'expected 5 shapes, got ' + [...shapes].join(','));

console.log((failures ? 'FAILED' : 'PASSED') + ': ' + checks + ' levels checked, ' + failures + ' failures, ' + (Date.now() - t0) + ' ms');
process.exit(failures ? 1 : 0);
