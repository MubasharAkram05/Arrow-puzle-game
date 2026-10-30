/** Public engine API: pure logic, no DOM. */
export { DIRS, opposite } from './directions.js';
export { mulberry32, hashSeed, randInt, weightedPick } from './rng.js';
export { MASK_SHAPES, makeMask, insideShape } from './masks.js';
export { SHAPE_ART } from './shapeArt.js';
export { TIERS, MIN_LEN, MAX_LEN, MIN_FILL, getLevelConfig, tierOf, shapeOf, shapeSize } from './levels.js';
export { makePlan } from './shapes.js';
export { buildLevel, meetsConstraints, meetsGoals, generateFromConfig, generateLevel } from './generator.js';
export { buildOccupancy, rayBlocker, rayArrows, freeArrows, clearArrow } from './board.js';
export { solveLevel, validateLevel } from './solver.js';
export { analyzeLevel } from './difficulty.js';
