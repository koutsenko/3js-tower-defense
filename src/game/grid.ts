export interface GridCell {
  readonly x: number;
  readonly y: number;
}

export function createGridCell(x: number, y: number): GridCell {
  return Object.freeze({ x, y });
}

export function getCellKey(cell: GridCell): string {
  return `${cell.x},${cell.y}`;
}

export function isCellWithinGrid(
  cell: GridCell,
  width: number,
  height: number,
): boolean {
  return (
    Number.isInteger(cell.x) &&
    Number.isInteger(cell.y) &&
    cell.x >= 0 &&
    cell.x < width &&
    cell.y >= 0 &&
    cell.y < height
  );
}

export function getRouteLength(waypoints: readonly GridCell[]): number {
  return waypoints.slice(1).reduce((length, waypoint, index) => {
    const previous = waypoints[index];

    if (!previous) {
      return length;
    }

    assertAxisAligned(previous, waypoint);

    return (
      length +
      Math.abs(waypoint.x - previous.x) +
      Math.abs(waypoint.y - previous.y)
    );
  }, 0);
}

export function createRouteCells(
  waypoints: readonly GridCell[],
): readonly GridCell[] {
  if (waypoints.length === 0) {
    return Object.freeze([]);
  }

  const first = waypoints[0];

  if (!first) {
    return Object.freeze([]);
  }

  const cells: GridCell[] = [createGridCell(first.x, first.y)];

  for (let index = 1; index < waypoints.length; index += 1) {
    const start = waypoints[index - 1];
    const end = waypoints[index];

    if (!start || !end) {
      continue;
    }

    assertAxisAligned(start, end);

    const stepX = Math.sign(end.x - start.x);
    const stepY = Math.sign(end.y - start.y);
    let currentX = start.x;
    let currentY = start.y;

    while (currentX !== end.x || currentY !== end.y) {
      currentX += stepX;
      currentY += stepY;
      cells.push(createGridCell(currentX, currentY));
    }
  }

  return Object.freeze(cells);
}

function assertAxisAligned(start: GridCell, end: GridCell): void {
  if (start.x !== end.x && start.y !== end.y) {
    throw new Error('Route segments must be axis-aligned');
  }
}
