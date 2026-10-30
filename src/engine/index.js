/** Public engine API: pure logic, no DOM. */
export { DIRS, opposite } from './directions.js';
export { mulberry32, hashSeed, randInt, weightedPick } from './rng.js';
export { ORIGINAL_SHAPES, makeMask, insideShape } from './masks.js';
export { SHAPE_ART } from './shapeArt.js';
export {
  MIN_LEN,
  MAX_LEN,
  MIN_FILL,
  LEVEL_ONE,
  getLevelConfig,
  isShapeLevel,
  shapeOf,
  shapeSlot,
  shapeSize,
} from './levels.js';
export {
  allShapes,
  getShape,
  loadShapeLibrary,
  setShapeLibrary,
  shapeCategories,
  shapeLibraryReady,
  shapeOrder,
  shapeSources,
} from './shapes/library.js';
export {
  SHAPE_CATEGORIES,
  SHAPE_COUNT,
  categoryOf,
  collectedIn,
  collectionProgress,
  shapesIn,
} from './shapes/collection.js';
export { makePlan } from './shapes.js';
export { buildLevel, meetsConstraints, meetsGoals, generateFromConfig, generateLevel } from './generator.js';
export { buildOccupancy, rayBlocker, rayArrows, freeArrows, clearArrow } from './board.js';
export { solveLevel, validateLevel } from './solver.js';
export { analyzeLevel, difficultyFor, tierLabel } from './difficulty.js';
