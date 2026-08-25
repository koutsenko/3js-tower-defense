import { KILL_REWARD, PROJECTILE_DAMAGE } from '../config/gameConfig';
import type { GameEvent } from './events';
import { getProjectileTargetDistance } from './projectiles';
import type { GameState } from './types';

const DISTANCE_TOLERANCE = 1e-9;

export function resolveProjectileHits(state: GameState): readonly GameEvent[] {
  const events: GameEvent[] = [];
  const dueProjectiles = state.projectiles
    .filter((projectile) => {
      const distance = getProjectileTargetDistance(state, projectile.id);
      return distance !== null && distance <= DISTANCE_TOLERANCE;
    })
    .sort((left, right) => left.id - right.id);

  for (const projectile of dueProjectiles) {
    const activeProjectile = state.projectiles.find(
      ({ id }) => id === projectile.id,
    );
    const target = state.monsters.find(({ id }) => id === projectile.targetId);
    if (activeProjectile === undefined || target === undefined) {
      continue;
    }

    state.projectiles = state.projectiles.filter(
      ({ id }) => id !== projectile.id,
    );
    target.hp -= PROJECTILE_DAMAGE;
    events.push({
      type: 'projectile-hit',
      projectileId: projectile.id,
      targetId: target.id,
      damage: PROJECTILE_DAMAGE,
    });

    if (target.hp > 0) {
      continue;
    }

    state.monsters = state.monsters.filter(({ id }) => id !== target.id);
    state.projectiles = state.projectiles.filter(
      ({ targetId }) => targetId !== target.id,
    );
    state.killedCount += 1;
    state.coins += KILL_REWARD;
    events.push({ type: 'monster-killed', monsterId: target.id });
  }

  return events;
}
