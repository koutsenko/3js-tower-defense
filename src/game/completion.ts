import { WAVE_SIZE } from '../config/gameConfig';
import type { GameEvent } from './events';
import type { GameState } from './types';

export function resolveDefeat(state: GameState): GameEvent | null {
  if (state.status !== 'WaveActive' || state.baseHp > 0) {
    return null;
  }

  state.status = 'Defeat';
  return { type: 'session-ended', outcome: 'Defeat' };
}

export function resolveVictory(state: GameState): GameEvent | null {
  if (state.status !== 'WaveActive' || state.baseHp <= 0 || state.killedCount + state.escapedCount < WAVE_SIZE) {
    return null;
  }

  state.status = 'Victory';
  return { type: 'session-ended', outcome: 'Victory' };
}
