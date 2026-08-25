import type { GridCell } from './grid';
import type { GameEvent } from './events';
import { TOWER_COST } from '../config/gameConfig';
import { validateBuild as validateBuildState } from './building';
import { advanceLifecycle, startGame } from './lifecycle';
import {
  createEntityIdSequence,
  createInitialState,
  createSnapshot,
  type EntityIdSequence,
} from './state';
import type {
  BuildValidation,
  CommandResult,
  GameCommand,
  GameSnapshot,
  GameState,
} from './types';

export class GameRuntime {
  private readonly state: GameState;
  private readonly entityIds: EntityIdSequence;
  private pendingEvents: GameEvent[] = [];

  constructor(initialState: GameState = createInitialState()) {
    this.state = cloneState(initialState);
    this.entityIds = createEntityIdSequence(getNextEntityId(this.state));
  }

  dispatch(command: GameCommand): CommandResult {
    switch (command.type) {
      case 'BuildTower':
        return this.buildTower(command.cell);
      case 'StartGame':
        return this.startGame();
      case 'Restart':
        return { ok: false, code: 'INVALID_SESSION_STATE' };
    }
  }

  private buildTower(cell: GridCell): CommandResult {
    const validation = this.validateBuild(cell);

    if (!validation.ok) {
      return validation;
    }

    const tower = {
      id: this.entityIds.next(),
      cell: { ...cell },
      nextShotAt: this.state.simulationTime,
    };

    this.state.towers.push(tower);
    this.state.coins -= TOWER_COST;
    this.pendingEvents.push({
      type: 'tower-built',
      towerId: tower.id,
      cell: { ...tower.cell },
    });

    return { ok: true };
  }

  private startGame(): CommandResult {
    if (this.state.status !== 'Ready') {
      return { ok: false, code: 'INVALID_SESSION_STATE' };
    }

    this.pendingEvents.push(startGame(this.state));
    return { ok: true };
  }

  advance(deltaSeconds: number): readonly GameEvent[] {
    const events = [
      ...this.pendingEvents,
      ...advanceLifecycle(this.state, deltaSeconds),
    ];
    this.pendingEvents = [];
    return events;
  }

  getSnapshot(): GameSnapshot {
    return createSnapshot(this.state);
  }

  validateBuild(cell: GridCell): BuildValidation {
    return validateBuildState(this.state, cell);
  }
}

function getNextEntityId(state: GameState): number {
  const entityIds = [
    ...state.towers.map(({ id }) => id),
    ...state.monsters.map(({ id }) => id),
    ...state.projectiles.map(({ id }) => id),
  ];

  return Math.max(0, ...entityIds) + 1;
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    towers: state.towers.map((tower) => ({
      ...tower,
      cell: { ...tower.cell },
    })),
    monsters: state.monsters.map((monster) => ({ ...monster })),
    projectiles: state.projectiles.map((projectile) => ({
      ...projectile,
      position: { ...projectile.position },
    })),
  };
}
