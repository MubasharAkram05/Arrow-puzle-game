import { readFileSync, statSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { LEVELS } from '../src/config.js';
import {
  allShapes,
  getShape,
  isShapeLevel,
  loadShapeLibrary,
  shapeCategories,
  shapeOf,
  shapeOrder,
  shapeSources,
} from '../src/engine/index.js';
import { buildOrder } from '../src/engine/shapes/library.js';
import { decodeRle, encodeRle, qualityProblem } from '../src/engine/shapes/quality.js';

const FILE = new URL('../src/engine/shapes/library.json', import.meta.url);
const OPEN_LICENSES = ['MIT', 'Apache-2.0', 'CC-BY-4.0', 'CC-BY-3.0', 'OFL-1.1', 'project'];

beforeAll(() => loadShapeLibrary());

describe('shape library', () => {
  it('loads 500+ shapes and every category meets its target', () => {
    expect(allShapes().length).toBeGreaterThanOrEqual(500);
    for (const c of shapeCategories()) {
      const n = allShapes().filter((s) => s.category === c.id).length;
      expect(n, c.name).toBeGreaterThanOrEqual(c.target);
    }
    expect(shapeCategories().map((c) => c.id)).toEqual(
      expect.arrayContaining(['letters', 'numbers', 'symbols', 'transport', 'objects']),
    );
    expect(allShapes().filter((s) => s.category === 'letters')).toHaveLength(26);
    expect(allShapes().filter((s) => s.category === 'numbers')).toHaveLength(10);
  });

  it('has no duplicate ids or names, and every shape belongs to a known category', () => {
    const ids = allShapes().map((s) => s.id);
    const names = allShapes().map((s) => s.name);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
    const cats = new Set(shapeCategories().map((c) => c.id));
    for (const s of allShapes()) expect(cats.has(s.category), s.id).toBe(true);
  });

  it('every shape passes the quality filter', () => {
    const bad = allShapes()
      .map((s) => [s.id, qualityProblem(s)])
      .filter(([, p]) => p);
    expect(bad).toEqual([]);
  });

  it('every shape records an open source and license', () => {
    const sources = shapeSources();
    for (const s of allShapes()) {
      expect(sources[s.source.split(':')[0]], s.id).toBeTruthy();
      expect(OPEN_LICENSES, s.id).toContain(s.license);
      expect(sources[s.source.split(':')[0]].license, s.id).toBe(s.license);
    }
  });

  it('stays small (under 150 KB) and decodes what it encodes', () => {
    expect(statSync(FILE).size).toBeLessThan(150 * 1024);
    const raw = JSON.parse(readFileSync(FILE, 'utf8'));
    expect(raw.fields).toEqual(['id', 'name', 'category', 'width', 'height', 'source', 'license', 'rle']);
    for (const s of allShapes().slice(0, 50)) expect(decodeRle(encodeRle(s.bits), s.w * s.h)).toEqual(s.bits);
  });

  it('keeps the 20 original shapes with their old ids', () => {
    for (const id of ['heart', 'arrow', 'cat', 'dog', 'whale', 'letterA', 'letterZ', 'donut', 'tree', 'plus'])
      expect(getShape(id), id).toBeTruthy();
  });
});

describe('shape order', () => {
  it('uses every shape exactly once', () => {
    const order = shapeOrder();
    expect(order).toHaveLength(allShapes().length);
    expect(new Set(order).size).toBe(order.length);
  });

  it('is deterministic', () => {
    expect(buildOrder(allShapes(), LEVELS.shapeRotation)).toEqual(shapeOrder());
    expect(buildOrder([...allShapes()].reverse(), LEVELS.shapeRotation)).toEqual(shapeOrder());
  });

  it('starts with one shape of each category in rotation order, then never repeats a category back to back', () => {
    const cat = (id) => getShape(id).category;
    const order = shapeOrder();
    expect(order.slice(0, LEVELS.shapeRotation.length).map(cat)).toEqual(LEVELS.shapeRotation);
    for (let i = 1; i < order.length; i++) expect(cat(order[i]), `slot ${i}`).not.toBe(cat(order[i - 1]));
  });

  it('spreads categories through the cycle (letters are never 26 in a row)', () => {
    const cat = (id) => getShape(id).category;
    const order = shapeOrder();
    const firstHalf = order.slice(0, order.length / 2).map(cat);
    for (const c of shapeCategories()) {
      const total = allShapes().filter((s) => s.category === c.id).length;
      const early = firstHalf.filter((x) => x === c.id).length;
      // about half of each category lands in the first half of the cycle
      expect(early / total, c.id).toBeGreaterThan(0.3);
      expect(early / total, c.id).toBeLessThan(0.7);
    }
  });

  it('shows easy (compact) shapes first inside a category', () => {
    const order = shapeOrder().map(getShape);
    for (const c of shapeCategories()) {
      const list = order.filter((s) => s.category === c.id);
      const third = Math.floor(list.length / 3);
      const avg = (xs) => xs.reduce((a, s) => a + s.complexity, 0) / xs.length;
      expect(avg(list.slice(0, third)), c.id).toBeLessThan(avg(list.slice(-third)));
    }
  });

  it('shape levels are 6, 9, 12, ... and walk the order, then repeat', () => {
    expect([6, 9, 12, 300].every(isShapeLevel)).toBe(true);
    expect([1, 2, 3, 4, 5, 7, 8, 10].some(isShapeLevel)).toBe(false);
    const order = shapeOrder();
    expect(shapeOf(6)).toBe(order[0]);
    expect(shapeOf(12)).toBe(order[2]);
    expect(shapeOf(6 + order.length * 3)).toBe(order[0]);
    // a full cycle is about 3 x the number of shapes in levels
    expect(order.length * LEVELS.shapeEvery).toBeGreaterThan(1500);
  });
});
