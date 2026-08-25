import { TOWER_COST } from '../config/gameConfig';
import { levelConfig } from '../config/levelConfig';
import { getCellKey, isCellWithinGrid, type GridCell } from './grid';
import type { BuildValidation, GameState } from './types';

const routeCellKeys = new Set(levelConfig.routeCells.map(getCellKey));

export function validateBuild(
  state: Readonly<GameState>,
  cell: GridCell,
): BuildValidation {
  if (state.status === 'Victory' || state.status === 'Defeat') {
    return { ok: false, code: 'SESSION_ENDED' };
  }

  if (state.status === 'Ready') {
    return { ok: false, code: 'GAME_NOT_STARTED' };
  }

  if (!isCellWithinGrid(cell, levelConfig.width, levelConfig.height)) {
    return { ok: false, code: 'OUT_OF_BOUNDS' };
  }

  const cellKey = getCellKey(cell);

  if (routeCellKeys.has(cellKey)) {
    return { ok: false, code: 'PATH_CELL' };
  }

  if (state.towers.some((tower) => getCellKey(tower.cell) === cellKey)) {
    return { ok: false, code: 'OCCUPIED' };
  }

  if (state.coins < TOWER_COST) {
    return { ok: false, code: 'INSUFFICIENT_FUNDS' };
  }

  return { ok: true };
}
