import type { GridCell } from './grid';
import type { EntityId } from './types';

export type GameEvent =
  | { readonly type: 'game-start' }
  | { readonly type: 'wave-start' }
  | {
      readonly type: 'tower-built';
      readonly towerId: EntityId;
      readonly cell: GridCell;
    }
  | {
      readonly type: 'monster-spawned';
      readonly monsterId: EntityId;
      readonly spawnIndex: number;
    }
  | {
      readonly type: 'projectile-shot';
      readonly projectileId: EntityId;
      readonly towerId: EntityId;
      readonly targetId: EntityId;
    }
  | {
      readonly type: 'projectile-hit';
      readonly projectileId: EntityId;
      readonly targetId: EntityId;
      readonly damage: number;
    }
  | { readonly type: 'monster-killed'; readonly monsterId: EntityId }
  | { readonly type: 'monster-escaped'; readonly monsterId: EntityId }
  | {
      readonly type: 'session-ended';
      readonly outcome: 'Victory' | 'Defeat';
    };
