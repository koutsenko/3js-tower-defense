import { PREPARATION_DURATION, WAVE_SIZE } from '../config/gameConfig';
import type { GameSnapshot, GameState } from './types';

type ReadableGameState = GameState | GameSnapshot;

export function getRemainingCount(state: ReadableGameState): number {
  return WAVE_SIZE - state.killedCount - state.escapedCount;
}

export function getPreparationCountdown(
  state: ReadableGameState,
): number | null {
  if (state.status !== 'Preparation') {
    return null;
  }

  return Math.max(
    0,
    PREPARATION_DURATION - (state.simulationTime - state.phaseStartedAt),
  );
}
