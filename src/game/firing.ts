import { SHOT_COOLDOWN } from '../config/gameConfig';
import type { GameEvent } from './events';
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
    if (tower.nextShotAt > state.simulationTime + TIME_TOLERANCE) {
      continue;
    }

    const target = selectTarget(state, tower);
    if (target === null) {
      continue;
    }

    const projectile = {
      id: entityIds.next(),
      targetId: target.id,
      position: { x: tower.cell.x, y: tower.cell.y },
    };
    state.projectiles.push(projectile);
    tower.nextShotAt = state.simulationTime + SHOT_COOLDOWN;
    events.push({
      type: 'projectile-shot',
      projectileId: projectile.id,
      towerId: tower.id,
      targetId: target.id,
    });
  }

  return events;
}
