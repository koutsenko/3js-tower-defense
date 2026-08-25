import { OrthographicCamera } from 'three';
import { describe, expect, it } from 'vitest';
import { createInitialState, createSnapshot } from '../../src/game/state';
import { EntityReconciler } from '../../src/rendering/entityReconciler';

describe('snapshot entity reconciliation (FR-006, FR-008, AC-006, AC-014, AC-015)', () => {
  it('creates and updates towers, monsters, projectiles and health bars', () => {
    const state = createInitialState();
    state.towers = [{ id: 1, cell: { x: 6, y: 3 }, nextShotAt: 0 }];
    state.monsters = [{ id: 2, spawnIndex: 0, hp: 100, routeProgress: 4 }];
    state.projectiles = [{ id: 3, targetId: 2, position: { x: 3.5, y: 1 } }];
    const camera = new OrthographicCamera();
    camera.rotation.set(-0.7, 0.4, 0.2);
    const reconciler = new EntityReconciler(undefined, camera);

    reconciler.reconcile(createSnapshot(state));

    expect(reconciler.root.children).toHaveLength(3);
    expect(reconciler.getObject(1)?.position.toArray()).toEqual([6, 0.45, 3]);
    expect(reconciler.getObject(2)?.position.toArray()).toEqual([4, 0.3, 1]);
    expect(reconciler.getObject(3)?.position.toArray()).toEqual([3.5, 0.35, 1]);

    const monsterObject = reconciler.getObject(2);
    const healthBar = monsterObject?.getObjectByName('health-bar');
    expect(healthBar?.userData.ratio).toBe(1);
    expect(healthBar?.quaternion.equals(camera.quaternion)).toBe(true);

    state.monsters[0]!.hp = 25;
    state.monsters[0]!.routeProgress = 9;
    reconciler.reconcile(createSnapshot(state));

    expect(reconciler.getObject(2)).toBe(monsterObject);
    expect(monsterObject?.position.toArray()).toEqual([8, 0.3, 2]);
    expect(healthBar?.userData.ratio).toBe(0.25);
    expect(healthBar?.getObjectByName('health-bar-fill')?.scale.x).toBe(0.25);
  });

  it('removes resolved entities and clears every object on restart', () => {
    const state = createInitialState();
    state.towers = [{ id: 1, cell: { x: 6, y: 3 }, nextShotAt: 0 }];
    state.monsters = [{ id: 2, spawnIndex: 0, hp: 75, routeProgress: 1 }];
    state.projectiles = [{ id: 3, targetId: 2, position: { x: 0.5, y: 1 } }];
    const reconciler = new EntityReconciler();

    reconciler.reconcile(createSnapshot(state));
    state.monsters = [];
    state.projectiles = [];
    reconciler.reconcile(createSnapshot(state));

    expect(reconciler.getObject(1)).toBeDefined();
    expect(reconciler.getObject(2)).toBeUndefined();
    expect(reconciler.getObject(3)).toBeUndefined();

    reconciler.reconcile(createSnapshot(createInitialState()));

    expect(reconciler.root.children).toHaveLength(0);
  });

  it('does not mutate the authoritative snapshot', () => {
    const state = createInitialState();
    state.monsters = [{ id: 1, spawnIndex: 0, hp: 50, routeProgress: 2 }];
    const snapshot = createSnapshot(state);
    const before = JSON.stringify(snapshot);

    new EntityReconciler().reconcile(snapshot);

    expect(JSON.stringify(snapshot)).toBe(before);
  });
});
