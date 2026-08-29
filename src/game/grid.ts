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

export function isCellWithinGrid(cell: GridCell, width: number, height: number): boolean {
  return (
    Number.isInteger(cell.x) &&
    Number.isInteger(cell.y) &&
    cell.x >= 0 &&
    cell.x < width &&
    cell.y >= 0 &&
    cell.y < height
  );
}

/**
 * Вычисляет длину проверенного горизонтального или вертикального участка между двумя клетками.
 *
 * @param start Начальная клетка участка.
 * @param end Конечная клетка участка.
 * @returns Длина участка в клетках.
 */
export function getAxisAlignedSegmentLength(start: GridCell, end: GridCell): number {
  return Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
}

/**
 * Проверяет, что маршрут состоит только из горизонтальных и вертикальных участков.
 *
 * @param waypoints Последовательность поворотных точек маршрута.
 * @throws {Error} Если маршрут содержит диагональный участок.
 */
export function assertAxisAlignedRoute(waypoints: readonly GridCell[]): void {
  for (let index = 1; index < waypoints.length; index += 1) {
    const start = waypoints[index - 1]!;
    const end = waypoints[index]!;

    if (start.x !== end.x && start.y !== end.y) {
      throw new Error('Route segments must be axis-aligned');
    }
  }
}

export function getRouteLength(waypoints: readonly GridCell[]): number {
  return waypoints.slice(1).reduce((length, waypoint, index) => {
    const previous = waypoints[index];

    if (!previous) {
      return length;
    }

    return length + getAxisAlignedSegmentLength(previous, waypoint);
  }, 0);
}

/**
 * Создаёт клетки заранее проверенного горизонтального и вертикального маршрута.
 *
 * @param waypoints Последовательность точек, предварительно проверенная через `assertAxisAlignedRoute`.
 * @returns Клетки маршрута, включая начальную и конечную точки каждого участка.
 */
export function createRouteCells(waypoints: readonly GridCell[]): readonly GridCell[] {
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
