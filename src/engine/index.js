/** Public engine API: pure logic, no DOM. */
export { DIRS, opposite } from './directions.js';
export { mulberry32, hashSeed, randInt, weightedPick } from './rng.js';
export { MASK_SHAPES, makeMask, insideShape } from './masks.js';
export { TIERS, MIN_LEN, MAX_LEN, MIN_FILL, getLevelConfig, getDailyConfig, dateKey } from './levels.js';
export { makePlan } from './shapes.js';
export { buildLevel, meetsConstraints, generateFromConfig, generateLevel, generateDaily } from './generator.js';
export { buildOccupancy, rayBlocker, rayArrows, freeArrows, clearArrow } from './board.js';
export { solveLevel, validateLevel } from './solver.js';
