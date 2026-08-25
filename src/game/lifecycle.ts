import { PREPARATION_DURATION } from '../config/gameConfig';
import type { GameEvent } from './events';
import type { GameState } from './types';

export function startGame(state: GameState): GameEvent {
  state.status = 'Preparation';
  state.phaseStartedAt = state.simulationTime;

  return { type: 'game-start' };
}

export function advanceLifecycle(
  state: GameState,
  deltaSeconds: number,
): readonly GameEvent[] {
  if (
    state.status === 'Ready' ||
    state.status === 'Victory' ||
    state.status === 'Defeat'
  ) {
    return [];
  }

  state.simulationTime += deltaSeconds;

  if (
    state.status === 'Preparation' &&
    state.simulationTime - state.phaseStartedAt >= PREPARATION_DURATION
  ) {
    state.status = 'WaveActive';
    state.phaseStartedAt += PREPARATION_DURATION;
    return [{ type: 'wave-start' }];
  }

  return [];
}
