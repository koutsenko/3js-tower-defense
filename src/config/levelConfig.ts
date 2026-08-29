import {
  assertAxisAlignedRoute,
  createGridCell,
  createRouteCells,
  getCellKey,
  getRouteLength,
  type GridCell,
} from '../game/grid';

export interface LevelConfig {
  readonly width: number;
  readonly height: number;
  readonly cellSize: number;
  readonly entrance: GridCell;
  readonly exit: GridCell;
  readonly routeWaypoints: readonly GridCell[];
  readonly routeLength: number;
  readonly routeCells: readonly GridCell[];
  readonly buildableCells: readonly GridCell[];
}

const GRID_WIDTH = 12;
const GRID_HEIGHT = 8;

const routeWaypoints = Object.freeze([
  createGridCell(0, 1),
  createGridCell(8, 1),
  createGridCell(8, 4),
  createGridCell(3, 4),
  createGridCell(3, 6),
  createGridCell(11, 6),
]);

assertAxisAlignedRoute(routeWaypoints);

const routeCells = createRouteCells(routeWaypoints);
const routeCellKeys = new Set(routeCells.map(getCellKey));
const buildableCells: GridCell[] = [];

for (let y = 0; y < GRID_HEIGHT; y += 1) {
  for (let x = 0; x < GRID_WIDTH; x += 1) {
    const cell = createGridCell(x, y);

    if (!routeCellKeys.has(getCellKey(cell))) {
      buildableCells.push(cell);
    }
  }
}

export const levelConfig: Readonly<LevelConfig> = Object.freeze({
  width: GRID_WIDTH,
  height: GRID_HEIGHT,
  cellSize: 1,
  entrance: routeWaypoints[0]!,
  exit: routeWaypoints.at(-1)!,
  routeWaypoints,
  routeLength: getRouteLength(routeWaypoints),
  routeCells,
  buildableCells: Object.freeze(buildableCells),
});
