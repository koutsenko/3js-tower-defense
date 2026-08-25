import type { GridCell } from './grid';

export type EntityId = number;

export type SessionStatus =
  'Ready' | 'Preparation' | 'WaveActive' | 'Victory' | 'Defeat';

export interface Position {
  readonly x: number;
  readonly y: number;
}

export interface TowerState {
  id: EntityId;
  cell: GridCell;
  nextShotAt: number;
}

export interface MonsterState {
  id: EntityId;
  spawnIndex: number;
  hp: number;
  routeProgress: number;
}

export interface ProjectileState {
  id: EntityId;
  targetId: EntityId;
  position: Position;
}

export interface GameState {
  status: SessionStatus;
  simulationTime: number;
  phaseStartedAt: number;
  coins: number;
  baseHp: number;
  spawnedCount: number;
  killedCount: number;
  escapedCount: number;
  towers: TowerState[];
  monsters: MonsterState[];
  projectiles: ProjectileState[];
}

export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;

export type GameSnapshot = DeepReadonly<GameState>;

export type GameCommand =
  | { readonly type: 'BuildTower'; readonly cell: GridCell }
  | { readonly type: 'StartGame' }
  | { readonly type: 'Restart' };

export type BuildRejectionCode =
  | 'SESSION_ENDED'
  | 'GAME_NOT_STARTED'
  | 'OUT_OF_BOUNDS'
  | 'PATH_CELL'
  | 'OCCUPIED'
  | 'INSUFFICIENT_FUNDS';

export type BuildValidation =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: BuildRejectionCode };

export type CommandRejectionCode = BuildRejectionCode | 'INVALID_SESSION_STATE';

export type CommandResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: CommandRejectionCode };
