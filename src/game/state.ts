import { STARTING_BASE_HP, STARTING_COINS } from '../config/gameConfig';
import type { GameSnapshot, GameState } from './types';

export function createInitialState(): GameState {
  return {
    status: 'Ready',
    simulationTime: 0,
    phaseStartedAt: 0,
    coins: STARTING_COINS,
    baseHp: STARTING_BASE_HP,
    spawnedCount: 0,
    killedCount: 0,
    escapedCount: 0,
    towers: [],
    monsters: [],
    projectiles: [],
  };
}

export interface EntityIdSequence {
  next(): number;
}

export function createEntityIdSequence(startId = 1): EntityIdSequence {
  let nextId = startId;

  return {
    next() {
      const id = nextId;
      nextId += 1;
      return id;
    },
  };
}

export function createSnapshot(state: GameState): GameSnapshot {
  return Object.freeze({
    ...state,
    towers: Object.freeze(
      state.towers.map((tower) =>
        Object.freeze({ ...tower, cell: Object.freeze({ ...tower.cell }) }),
      ),
    ),
    monsters: Object.freeze(
      state.monsters.map((monster) => Object.freeze({ ...monster })),
    ),
    projectiles: Object.freeze(
      state.projectiles.map((projectile) =>
        Object.freeze({
          ...projectile,
          position: Object.freeze({ ...projectile.position }),
        }),
      ),
    ),
  });
}
