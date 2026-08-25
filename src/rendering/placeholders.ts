import {
  BoxGeometry,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
} from 'three';
import type { LevelConfig } from '../config/levelConfig';
import type { GridCell } from '../game/grid';

const COLORS = {
  buildable: 0x5c7f62,
  route: 0xb59b78,
  entrance: 0x3f8cff,
  exit: 0xef5b5b,
  boundary: 0xe7e7e7,
} as const;

export function createLevelPlaceholders(level: Readonly<LevelConfig>): Group {
  const root = new Group();
  root.name = 'level-placeholders';

  const buildableCells = createCellGroup(
    'buildable-cells',
    level.buildableCells,
    level.cellSize,
    COLORS.buildable,
    0,
  );
  const routeCells = createCellGroup(
    'route-cells',
    level.routeCells,
    level.cellSize,
    COLORS.route,
    0.01,
  );

  root.add(buildableCells, routeCells);
  root.add(createMarker('entrance', level.entrance, level, COLORS.entrance));
  root.add(createMarker('exit', level.exit, level, COLORS.exit));
  root.add(createBoundary(level));

  return root;
}

function createCellGroup(
  name: string,
  cells: readonly GridCell[],
  cellSize: number,
  color: number,
  y: number,
): Group {
  const group = new Group();
  group.name = name;
  const geometry = new PlaneGeometry(cellSize * 0.92, cellSize * 0.92);
  geometry.rotateX(-Math.PI / 2);
  const material = new MeshBasicMaterial({ color });

  for (const cell of cells) {
    const mesh = new Mesh(geometry, material);
    mesh.name = `${name}:${cell.x},${cell.y}`;
    mesh.position.set(cell.x * cellSize, y, cell.y * cellSize);
    mesh.userData.cell = { x: cell.x, y: cell.y };
    group.add(mesh);
  }

  return group;
}

function createMarker(
  name: 'entrance' | 'exit',
  cell: GridCell,
  level: Readonly<LevelConfig>,
  color: number,
): Mesh {
  const marker = new Mesh(
    new BoxGeometry(
      level.cellSize * 0.6,
      level.cellSize * 0.5,
      level.cellSize * 0.6,
    ),
    new MeshBasicMaterial({ color }),
  );
  marker.name = name;
  marker.position.set(
    cell.x * level.cellSize,
    level.cellSize * 0.25,
    cell.y * level.cellSize,
  );
  return marker;
}

function createBoundary(level: Readonly<LevelConfig>): LineSegments {
  const geometry = new BoxGeometry(
    level.width * level.cellSize,
    0.05,
    level.height * level.cellSize,
  );
  const boundary = new LineSegments(
    new EdgesGeometry(geometry),
    new LineBasicMaterial({ color: COLORS.boundary }),
  );
  boundary.name = 'level-boundary';
  boundary.position.set(
    ((level.width - 1) * level.cellSize) / 2,
    0,
    ((level.height - 1) * level.cellSize) / 2,
  );
  return boundary;
}
