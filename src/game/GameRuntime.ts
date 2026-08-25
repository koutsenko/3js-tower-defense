import type { GridCell } from './grid';
import type { GameEvent } from './events';
import type {
  BuildValidation,
  CommandResult,
  GameCommand,
  GameSnapshot,
} from './types';

export interface GameRuntime {
  dispatch(command: GameCommand): CommandResult;
  advance(deltaSeconds: number): readonly GameEvent[];
  getSnapshot(): GameSnapshot;
  validateBuild(cell: GridCell): BuildValidation;
}
