import { MONSTER_SPEED, TOWER_RANGE } from '../config/gameConfig';
import { levelConfig } from '../config/levelConfig';
import { MathExtra } from './math/MathExtra';
import { getRoutePosition } from './movement';
import type { GameState, MonsterState, TowerState } from './types';

const DISTANCE_TOLERANCE = 1e-9;

export function selectTarget(state: Readonly<GameState>, tower: Readonly<TowerState>): Readonly<MonsterState> | null {
  const targets = state.monsters
    .filter((monster) => isInRange(tower, monster))
    .sort((left, right) => right.routeProgress - left.routeProgress || left.spawnIndex - right.spawnIndex);

  return targets[0] ?? null;
}

export function getNextTargetingTime(state: Readonly<GameState>, currentTime: number): number | null {
  let nextTime: number | null = null;

  for (const tower of state.towers) {
    const readyAt = Math.max(currentTime, tower.nextShotAt);

    if (readyAt > currentTime + DISTANCE_TOLERANCE) {
      nextTime = minDefined(nextTime, readyAt);
      continue;
    }

    if (selectTarget(state, tower) !== null) {
      return currentTime;
    }

    for (const monster of state.monsters) {
      const entryProgress = getNextRangeEntryProgress(tower, monster);
      if (entryProgress !== null) {
        nextTime = minDefined(nextTime, currentTime + (entryProgress - monster.routeProgress) / MONSTER_SPEED);
      }
    }
  }

  return nextTime;
}

function isInRange(tower: Readonly<TowerState>, monster: Readonly<MonsterState>): boolean {
  const position = getRoutePosition(monster.routeProgress);
  return Math.hypot(position.x - tower.cell.x, position.y - tower.cell.y) <= TOWER_RANGE + DISTANCE_TOLERANCE;
}

/**
 * Ищет на оставшейся части маршрута место, где монстр впервые войдёт в радиус указанной башни.
 *
 * @param tower Башня, для которой проверяется радиус атаки.
 * @param monster Монстр, движущийся по маршруту.
 * @returns Расстояние в клетках от начала маршрута до входа в радиус башни или null, если пересечения нет.
 */
function getNextRangeEntryProgress(tower: Readonly<TowerState>, monster: Readonly<MonsterState>): number | null {
  let segmentStartProgress = 0;

  // TODO: Предвычислить участки маршрута, чтобы не обходить заново пройденные участки при поиске входа в радиус башни.
  for (let index = 1; index < levelConfig.routeWaypoints.length; index += 1) {
    const start = levelConfig.routeWaypoints[index - 1]!;
    const end = levelConfig.routeWaypoints[index]!;
    const segmentLength = Math.hypot(end.x - start.x, end.y - start.y);
    const segmentEndProgress = segmentStartProgress + segmentLength;

    if (segmentEndProgress > monster.routeProgress + DISTANCE_TOLERANCE) {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const offsetX = start.x - tower.cell.x;
      const offsetY = start.y - tower.cell.y;
      const a = dx * dx + dy * dy;
      const b = 2 * (offsetX * dx + offsetY * dy);
      const c = offsetX * offsetX + offsetY * offsetY - TOWER_RANGE * TOWER_RANGE;
      const entryRatio = MathExtra.findSmallerQuadraticRoot(a, b, c, DISTANCE_TOLERANCE);

      if (entryRatio !== null) {
        const earliestRatio = Math.max(0, (monster.routeProgress - segmentStartProgress) / segmentLength);
        const ratio = Math.max(entryRatio, earliestRatio);

        if (ratio <= 1 + DISTANCE_TOLERANCE) {
          const x = start.x + dx * ratio;
          const y = start.y + dy * ratio;
          if (Math.hypot(x - tower.cell.x, y - tower.cell.y) <= TOWER_RANGE + DISTANCE_TOLERANCE) {
            return segmentStartProgress + ratio * segmentLength;
          }
        }
      }
    }

    segmentStartProgress = segmentEndProgress;
  }

  return null;
}

function minDefined(left: number | null, right: number): number {
  return left === null ? right : Math.min(left, right);
}
