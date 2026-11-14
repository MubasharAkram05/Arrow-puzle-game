/**
 * Write tests/fixtures/level-hashes.json: the fingerprint of every golden level (src/engine/levelHash.js).
 * Run only when a change to the boards is intended (npm run levels:hashes); the tests compare against it.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { setShapeLibrary } from '../src/engine/shapes/library.js';
import { goldenHashes } from '../src/engine/levelHash.js';

const root = new URL('../', import.meta.url);
setShapeLibrary(JSON.parse(readFileSync(new URL('src/engine/shapes/library.json', root), 'utf8')));
const hashes = goldenHashes();
mkdirSync(new URL('tests/fixtures/', root), { recursive: true });
writeFileSync(new URL('tests/fixtures/level-hashes.json', root), `${JSON.stringify(hashes, null, 2)}\n`);
console.log(`wrote ${Object.keys(hashes).length} level hashes to tests/fixtures/level-hashes.json`);
