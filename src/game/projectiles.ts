import { MONSTER_SPEED, PROJECTILE_SPEED } from '../config/gameConfig';
import { levelConfig } from '../config/levelConfig';
import { getAxisAlignedSegmentLength } from './grid';
import { getRoutePosition } from './movement';
import type { GameState, Position } from './types';

const DISTANCE_TOLERANCE = 1e-9;
const TIME_TOLERANCE = 1e-9;
const PROJECTILE_STEP = 1 / 60;

/**
 * Прогнозирует ближайший момент попадания активного снаряда в назначенную цель.
 *
 * `advanceWave` использует результат как кандидата на следующую временную границу. После перехода к ней
 * `resolveProjectileHits` проверяет наступившие попадания и применяет урон.
 *
 * Прогноз перестаёт быть актуальным, если цель исчезает раньше, и пересчитывается после другой границы.
 *
 * @param state Текущее состояние игровой сессии.
 * @param currentTime Текущее время симуляции.
 * @returns Время ближайшего возможного попадания или null, если оно не прогнозируется.
 */
export function predictNextProjectileImpactTime(state: Readonly<GameState>, currentTime: number): number | null {
  const impactTimes = state.projectiles.flatMap((projectile) => {
    const target = state.monsters.find(({ id }) => id === projectile.targetId);
    if (target === undefined) {
      return [];
    }

    const delay = predictProjectileImpactDelay(projectile.position, target.routeProgress);
    return delay === null ? [] : [currentTime + delay];
  });

  return impactTimes.length === 0 ? null : Math.min(...impactTimes);
}

export function isProjectileImpactDue(projectile: GameState['projectiles'][number], targetPosition: Position): boolean {
  return getDistance(projectile.position, targetPosition) <= DISTANCE_TOLERANCE;
}

export function calculateNextProjectileStepTime(state: Readonly<GameState>, currentTime: number): number | null {
  if (state.projectiles.length === 0) {
    return null;
  }

  const elapsedWaveTime = Math.max(0, currentTime - state.phaseStartedAt);
  const completedSteps = Math.floor((elapsedWaveTime + DISTANCE_TOLERANCE) / PROJECTILE_STEP);
  return state.phaseStartedAt + (completedSteps + 1) * PROJECTILE_STEP;
}

export function moveProjectiles(state: GameState, duration: number): void {
  if (duration <= 0) {
    return;
  }

  for (const projectile of state.projectiles) {
    const target = state.monsters.find(({ id }) => id === projectile.targetId);
    if (target === undefined) {
      continue;
    }

    const targetPosition = getRoutePosition(target.routeProgress);
    const distance = getDistance(projectile.position, targetPosition);
    const travelDistance = PROJECTILE_SPEED * duration;

    if (distance <= travelDistance + DISTANCE_TOLERANCE) {
      projectile.position = { ...targetPosition };
      continue;
    }

    const ratio = travelDistance / distance;
    projectile.position = {
      x: projectile.position.x + (targetPosition.x - projectile.position.x) * ratio,
      y: projectile.position.y + (targetPosition.y - projectile.position.y) * ratio,
    };
  }
}

export function removeInvalidProjectiles(state: GameState): void {
  const livingMonsterIds = new Set(state.monsters.map(({ id }) => id));
  state.projectiles = state.projectiles.filter(({ targetId }) => livingMonsterIds.has(targetId));
}

export function getProjectileTargetDistance(state: Readonly<GameState>, projectileId: number): number | null {
  const projectile = state.projectiles.find(({ id }) => id === projectileId);
  if (projectile === undefined) {
    return null;
  }

  const target = state.monsters.find(({ id }) => id === projectile.targetId);
  if (target === undefined) {
    return null;
  }

  return getDistance(projectile.position, getRoutePosition(target.routeProgress));
}

function getDistance(left: Position, right: Position): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function predictProjectileImpactDelay(projectilePosition: Position, targetRouteProgress: number): number | null {
  const currentTargetPosition = getRoutePosition(targetRouteProgress);
  if (getDistance(projectilePosition, currentTargetPosition) <= DISTANCE_TOLERANCE) {
    return 0;
  }

  let segmentStartProgress = 0;

  for (let index = 1; index < levelConfig.routeWaypoints.length; index += 1) {
    const segmentStart = levelConfig.routeWaypoints[index - 1]!;
    const segmentEnd = levelConfig.routeWaypoints[index]!;
    const segmentLength = getAxisAlignedSegmentLength(segmentStart, segmentEnd);
    const segmentEndProgress = segmentStartProgress + segmentLength;

    if (segmentEndProgress < targetRouteProgress - DISTANCE_TOLERANCE) {
      segmentStartProgress = segmentEndProgress;
      continue;
    }

    const activeSegmentStartProgress = Math.max(segmentStartProgress, targetRouteProgress);
    const startDelay = (activeSegmentStartProgress - targetRouteProgress) / MONSTER_SPEED;
    const endDelay = (segmentEndProgress - targetRouteProgress) / MONSTER_SPEED;
    const velocity = {
      x: ((segmentEnd.x - segmentStart.x) / segmentLength) * MONSTER_SPEED,
      y: ((segmentEnd.y - segmentStart.y) / segmentLength) * MONSTER_SPEED,
    };
    const activeSegmentStartPosition = getRoutePosition(activeSegmentStartProgress);
    const extrapolatedTargetOrigin = {
      x: activeSegmentStartPosition.x - velocity.x * startDelay,
      y: activeSegmentStartPosition.y - velocity.y * startDelay,
    };
    const relativeOrigin = {
      x: extrapolatedTargetOrigin.x - projectilePosition.x,
      y: extrapolatedTargetOrigin.y - projectilePosition.y,
    };
    const impactDelay = findInterceptDelay(relativeOrigin, velocity, startDelay, endDelay);

    if (impactDelay !== null) {
      return impactDelay;
    }

    segmentStartProgress = segmentEndProgress;
  }

  return null;
}

function findInterceptDelay(
  relativeOrigin: Position,
  targetVelocity: Position,
  minimumDelay: number,
  maximumDelay: number,
): number | null {
  const a =
    targetVelocity.x * targetVelocity.x + targetVelocity.y * targetVelocity.y - PROJECTILE_SPEED * PROJECTILE_SPEED;
  const b = 2 * (relativeOrigin.x * targetVelocity.x + relativeOrigin.y * targetVelocity.y);
  const c = relativeOrigin.x * relativeOrigin.x + relativeOrigin.y * relativeOrigin.y;
  const discriminant = b * b - 4 * a * c;

  if (discriminant < -DISTANCE_TOLERANCE) {
    return null;
  }

  const squareRoot = Math.sqrt(Math.max(0, discriminant));
  const roots = [(-b - squareRoot) / (2 * a), (-b + squareRoot) / (2 * a)].sort((left, right) => left - right);

  return (
    roots.find((root) => root >= Math.max(0, minimumDelay) - TIME_TOLERANCE && root <= maximumDelay + TIME_TOLERANCE) ??
    null
  );
}
