import { MONSTER_HP, SPAWN_INTERVAL, WAVE_SIZE } from '../config/gameConfig';
import type { GameEvent } from './events';
import type { EntityIdSequence } from './state';
import type { GameState } from './types';

export function calculateNextSpawnTime(state: Readonly<GameState>): number | null {
  if (state.spawnedCount >= WAVE_SIZE) {
    return null;
  }

  return state.phaseStartedAt + state.spawnedCount * SPAWN_INTERVAL;
}

export function spawnDueMonsters(state: GameState, entityIds: EntityIdSequence): readonly GameEvent[] {
  const events: GameEvent[] = [];
  let nextSpawnTime = calculateNextSpawnTime(state);

  while (nextSpawnTime !== null && nextSpawnTime <= state.simulationTime) {
    const monster = {
      id: entityIds.next(),
      spawnIndex: state.spawnedCount,
      hp: MONSTER_HP,
      routeProgress: 0,
    };

    state.monsters.push(monster);
    state.spawnedCount += 1;
    events.push({
      type: 'monster-spawned',
      monsterId: monster.id,
      spawnIndex: monster.spawnIndex,
    });
    nextSpawnTime = calculateNextSpawnTime(state);
  }

  return events;
}
