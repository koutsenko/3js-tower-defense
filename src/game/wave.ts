import type { GameEvent } from './events';
import { resolveProjectileHits } from './combat';
import { resolveDefeat, resolveVictory } from './completion';
import { fireReadyTowers } from './firing';
import { getNextEscapeTime, moveMonsters, resolveEscapedMonsters } from './movement';
import { getNextSpawnTime, spawnDueMonsters } from './spawning';
import {
  getNextProjectileImpactTime,
  getNextProjectileStepTime,
  moveProjectiles,
  removeInvalidProjectiles,
} from './projectiles';
import type { EntityIdSequence } from './state';
import { getNextTargetingTime } from './targeting';
import type { GameState } from './types';

const TIME_TOLERANCE = 1e-9;

export function advanceWave(
  state: GameState,
  waveActiveDuration: number,
  entityIds: EntityIdSequence,
): readonly GameEvent[] {
  if (state.status !== 'WaveActive') {
    return [];
  }

  let endTime = state.simulationTime;
  let currentTime = endTime - waveActiveDuration;
  state.simulationTime = currentTime;
  const events: GameEvent[] = [];

  while (true) {
    events.push(...spawnDueMonsters(state, entityIds));
    events.push(...resolveEscapedMonsters(state));
    const defeatEvent = resolveDefeat(state);
    if (defeatEvent !== null) {
      events.push(defeatEvent);
      return events;
    }
    removeInvalidProjectiles(state);
    events.push(...fireReadyTowers(state, entityIds));
    events.push(...resolveProjectileHits(state));
    const victoryEvent = resolveVictory(state);
    if (victoryEvent !== null) {
      events.push(victoryEvent);
      return events;
    }

    const nextSpawnTime = getNextSpawnTime(state);
    const nextEscapeTime = getNextEscapeTime(state, currentTime);
    const nextTargetingTime = getNextTargetingTime(state, currentTime);
    const nextProjectileStepTime = getNextProjectileStepTime(state, currentTime);
    const nextProjectileImpactTime = getNextProjectileImpactTime(state, currentTime);
    const nextBoundary = minDefined(
      minDefined(minDefined(minDefined(nextSpawnTime, nextEscapeTime), nextTargetingTime), nextProjectileStepTime),
      nextProjectileImpactTime,
    );

    if (nextBoundary !== null && Math.abs(endTime - nextBoundary) <= TIME_TOLERANCE) {
      endTime = nextBoundary;
    }

    if (currentTime >= endTime) {
      state.simulationTime = endTime;
      return events;
    }

    const boundaryTime = Math.min(endTime, nextBoundary ?? endTime);
    moveMonsters(state, boundaryTime - currentTime);
    moveProjectiles(state, boundaryTime - currentTime);
    currentTime = boundaryTime;
    state.simulationTime = currentTime;
  }
}

function minDefined(left: number | null, right: number | null): number | null {
  if (left === null) {
    return right;
  }

  if (right === null) {
    return left;
  }

  return Math.min(left, right);
}
