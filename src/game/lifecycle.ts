import { PREPARATION_DURATION } from '../config/gameConfig';
import type { GameEvent } from './events';
import type { GameState } from './types';

const TIME_TOLERANCE = 1e-9;

export interface LifecycleAdvanceResult {
  readonly events: readonly GameEvent[];
  readonly waveActiveDuration: number;
}

export function startGame(state: GameState): GameEvent {
  state.status = 'Preparation';
  state.phaseStartedAt = state.simulationTime;

  return { type: 'game-start' };
}

export function advanceLifecycle(
  state: GameState,
  deltaSeconds: number,
): LifecycleAdvanceResult {
  if (
    state.status === 'Ready' ||
    state.status === 'Victory' ||
    state.status === 'Defeat'
  ) {
    return { events: [], waveActiveDuration: 0 };
  }

  if (state.status === 'WaveActive') {
    state.simulationTime += deltaSeconds;
    return { events: [], waveActiveDuration: deltaSeconds };
  }

  const waveStartsAt = state.phaseStartedAt + PREPARATION_DURATION;
  const targetTime = state.simulationTime + deltaSeconds;

  if (targetTime < waveStartsAt) {
    state.simulationTime = targetTime;
    return { events: [], waveActiveDuration: 0 };
  }

  const normalizedTargetTime =
    Math.abs(targetTime - waveStartsAt) <= TIME_TOLERANCE
      ? waveStartsAt
      : targetTime;

  state.status = 'WaveActive';
  state.simulationTime = normalizedTargetTime;
  state.phaseStartedAt = waveStartsAt;

  return {
    events: [{ type: 'wave-start' }],
    waveActiveDuration: normalizedTargetTime - waveStartsAt,
  };
}
