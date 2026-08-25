import type { GameEvent } from './events';
import { fireReadyTowers } from './firing';
import {
  getNextEscapeTime,
  moveMonsters,
  resolveEscapedMonsters,
} from './movement';
import { getNextSpawnTime, spawnDueMonsters } from './spawning';
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
    events.push(...fireReadyTowers(state, entityIds));

    const nextSpawnTime = getNextSpawnTime(state);
    const nextEscapeTime = getNextEscapeTime(state, currentTime);
    const nextTargetingTime = getNextTargetingTime(state, currentTime);
    const nextBoundary = minDefined(
      minDefined(nextSpawnTime, nextEscapeTime),
      nextTargetingTime,
    );

    if (
      nextBoundary !== null &&
      Math.abs(endTime - nextBoundary) <= TIME_TOLERANCE
    ) {
      endTime = nextBoundary;
    }

    if (currentTime >= endTime) {
      state.simulationTime = endTime;
      return events;
    }

    const boundaryTime = Math.min(endTime, nextBoundary ?? endTime);
    moveMonsters(state, boundaryTime - currentTime);
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
