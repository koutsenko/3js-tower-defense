import { PROJECTILE_SPEED } from '../config/gameConfig';
import { getRoutePosition } from './movement';
import type { GameState, Position } from './types';

const DISTANCE_TOLERANCE = 1e-9;
const PROJECTILE_STEP = 1 / 60;

export function getNextProjectileStepTime(
  state: Readonly<GameState>,
  currentTime: number,
): number | null {
  if (state.projectiles.length === 0) {
    return null;
  }

  const elapsedWaveTime = Math.max(0, currentTime - state.phaseStartedAt);
  const completedSteps = Math.floor(
    (elapsedWaveTime + DISTANCE_TOLERANCE) / PROJECTILE_STEP,
  );
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
      x:
        projectile.position.x +
        (targetPosition.x - projectile.position.x) * ratio,
      y:
        projectile.position.y +
        (targetPosition.y - projectile.position.y) * ratio,
    };
  }
}

export function removeInvalidProjectiles(state: GameState): void {
  const livingMonsterIds = new Set(state.monsters.map(({ id }) => id));
  state.projectiles = state.projectiles.filter(({ targetId }) =>
    livingMonsterIds.has(targetId),
  );
}

export function getProjectileTargetDistance(
  state: Readonly<GameState>,
  projectileId: number,
): number | null {
  const projectile = state.projectiles.find(({ id }) => id === projectileId);
  if (projectile === undefined) {
    return null;
  }

  const target = state.monsters.find(({ id }) => id === projectile.targetId);
  if (target === undefined) {
    return null;
  }

  return getDistance(
    projectile.position,
    getRoutePosition(target.routeProgress),
  );
}

function getDistance(left: Position, right: Position): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}
