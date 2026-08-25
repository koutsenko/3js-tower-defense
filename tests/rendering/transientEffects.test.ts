import { describe, expect, it } from 'vitest';
import { createInitialState, createSnapshot } from '../../src/game/state';
import { EntityReconciler } from '../../src/rendering/entityReconciler';
import { TransientEffects } from '../../src/rendering/transientEffects';

describe('transient rendering feedback (FR-008, AC-006, AC-015)', () => {
  it('shows shot and hit feedback when the projectile is absent from the final snapshot', () => {
    const state = createInitialState();
    state.towers = [{ id: 1, cell: { x: 6, y: 3 }, nextShotAt: 0 }];
    state.monsters = [{ id: 2, spawnIndex: 0, hp: 75, routeProgress: 8 }];
    const snapshot = createSnapshot(state);
    const entities = new EntityReconciler();
    const effects = new TransientEffects();

    effects.present(
      [
        {
          type: 'projectile-shot',
          projectileId: 3,
          towerId: 1,
          targetId: 2,
        },
        {
          type: 'projectile-hit',
          projectileId: 3,
          targetId: 2,
          damage: 25,
        },
      ],
      snapshot,
      entities,
    );

    expect(snapshot.projectiles).toHaveLength(0);
    expect(effects.root.getObjectByName('shot-trail')).toBeDefined();
    expect(effects.root.getObjectByName('hit-flash')).toBeDefined();
  });

  it('retains feedback for several frames and then disposes it', () => {
    const state = createInitialState();
    state.towers = [{ id: 1, cell: { x: 6, y: 3 }, nextShotAt: 0 }];
    state.monsters = [{ id: 2, spawnIndex: 0, hp: 75, routeProgress: 8 }];
    const snapshot = createSnapshot(state);
    const entities = new EntityReconciler();
    const effects = new TransientEffects();

    effects.present(
      [
        {
          type: 'projectile-shot',
          projectileId: 3,
          towerId: 1,
          targetId: 2,
        },
      ],
      snapshot,
      entities,
    );
    effects.present([], snapshot, entities);
    effects.present([], snapshot, entities);
    expect(effects.root.children).toHaveLength(1);

    effects.present([], snapshot, entities);
    effects.present([], snapshot, entities);
    expect(effects.root.children).toHaveLength(0);
  });

  it('uses the entrance when a target spawns and resolves within one frame', () => {
    const state = createInitialState();
    state.towers = [{ id: 1, cell: { x: 0, y: 0 }, nextShotAt: 0 }];
    const snapshot = createSnapshot(state);
    const effects = new TransientEffects();

    effects.present(
      [
        { type: 'monster-spawned', monsterId: 2, spawnIndex: 0 },
        {
          type: 'projectile-shot',
          projectileId: 3,
          towerId: 1,
          targetId: 2,
        },
        { type: 'monster-killed', monsterId: 2 },
      ],
      snapshot,
      new EntityReconciler(),
    );

    expect(effects.root.getObjectByName('shot-trail')).toBeDefined();
  });
});
