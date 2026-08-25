import { SHOT_COOLDOWN } from '../config/gameConfig';
import type { GameEvent } from './events';
import { scheduleProjectileImpact } from './projectiles';
import { selectTarget } from './targeting';
import type { EntityIdSequence } from './state';
import type { GameState } from './types';

const TIME_TOLERANCE = 1e-9;

export function fireReadyTowers(
  state: GameState,
  entityIds: EntityIdSequence,
): readonly GameEvent[] {
  const events: GameEvent[] = [];

  for (const tower of [...state.towers].sort(
    (left, right) => left.id - right.id,
  )) {
    const event = fireTower(state, tower.id, entityIds);
    if (event !== null) {
      events.push(event);
    }
  }

  return events;
}

export function fireTower(
  state: GameState,
  towerId: number,
  entityIds: EntityIdSequence,
): GameEvent | null {
  const tower = state.towers.find(({ id }) => id === towerId);
  if (
    tower === undefined ||
    tower.nextShotAt > state.simulationTime + TIME_TOLERANCE
  ) {
    return null;
  }

  const target = selectTarget(state, tower);
  if (target === null) {
    return null;
  }

  const projectile = {
    id: entityIds.next(),
    targetId: target.id,
    position: { x: tower.cell.x, y: tower.cell.y },
  };
  state.projectiles.push(projectile);
  scheduleProjectileImpact(state, projectile, state.simulationTime);
  tower.nextShotAt = state.simulationTime + SHOT_COOLDOWN;

  return {
    type: 'projectile-shot',
    projectileId: projectile.id,
    towerId: tower.id,
    targetId: target.id,
  };
}
