import { MONSTER_SPEED } from '../config/gameConfig';
import { levelConfig, type LevelConfig } from '../config/levelConfig';
import type { GameEvent } from './events';
import type { GameState, Position } from './types';

const DISTANCE_TOLERANCE = 1e-9;

export function getNextEscapeTime(state: Readonly<GameState>, currentTime: number): number | null {
  if (state.monsters.length === 0) {
    return null;
  }

  return Math.min(
    ...state.monsters.map(
      (monster) => currentTime + Math.max(0, levelConfig.routeLength - monster.routeProgress) / MONSTER_SPEED,
    ),
  );
}

export function moveMonsters(state: GameState, duration: number): void {
  if (duration <= 0) {
    return;
  }

  for (const monster of state.monsters) {
    const nextProgress = monster.routeProgress + MONSTER_SPEED * duration;
    monster.routeProgress =
      Math.abs(nextProgress - levelConfig.routeLength) <= DISTANCE_TOLERANCE ? levelConfig.routeLength : nextProgress;
  }
}

export function resolveEscapedMonsters(state: GameState): readonly GameEvent[] {
  const escapedMonsters = state.monsters
    .filter((monster) => monster.routeProgress >= levelConfig.routeLength)
    .sort((left, right) => left.spawnIndex - right.spawnIndex);

  if (escapedMonsters.length === 0) {
    return [];
  }

  const resolvedEscapes = escapedMonsters.slice(0, state.baseHp);
  const escapedIds = new Set(resolvedEscapes.map(({ id }) => id));
  state.monsters = state.monsters.filter(({ id }) => !escapedIds.has(id));
  state.baseHp -= resolvedEscapes.length;
  state.escapedCount += resolvedEscapes.length;

  return resolvedEscapes.map(({ id }) => ({
    type: 'monster-escaped',
    monsterId: id,
  }));
}

export function getRoutePosition(
  routeProgress: number,
  level: Pick<LevelConfig, 'routeLength' | 'routeWaypoints' | 'exit'> = levelConfig,
): Position {
  let remainingProgress = Math.min(Math.max(routeProgress, 0), level.routeLength);

  for (let index = 1; index < level.routeWaypoints.length; index += 1) {
    const start = level.routeWaypoints[index - 1]!;
    const end = level.routeWaypoints[index]!;
    const segmentLength = Math.abs(end.x - start.x) + Math.abs(end.y - start.y);

    if (remainingProgress <= segmentLength) {
      const ratio = segmentLength === 0 ? 0 : remainingProgress / segmentLength;
      return {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
      };
    }

    remainingProgress -= segmentLength;
  }

  return { ...level.exit };
}
