import { OrthographicCamera } from 'three';
import { describe, expect, it } from 'vitest';
import { levelConfig, type LevelConfig } from '../../src/config/levelConfig';
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

  it('uses an injected route and scales placeholders with its cell size', () => {
    const customLevel: Readonly<LevelConfig> = {
      ...levelConfig,
      cellSize: 2,
      entrance: { x: 0, y: 0 },
      exit: { x: 0, y: 2 },
      routeWaypoints: [
        { x: 0, y: 0 },
        { x: 0, y: 2 },
      ],
      routeLength: 2,
    };
    const state = createInitialState();
    state.towers = [{ id: 1, cell: { x: 1, y: 1 }, nextShotAt: 0 }];
    state.monsters = [{ id: 2, spawnIndex: 0, hp: 100, routeProgress: 1 }];
    state.projectiles = [{ id: 3, targetId: 2, position: { x: 0, y: 0.5 } }];
    const reconciler = new EntityReconciler(customLevel);

    reconciler.reconcile(createSnapshot(state));

    const tower = reconciler.getObject(1);
    const monster = reconciler.getObject(2);
    const projectile = reconciler.getObject(3);
    expect(tower?.position.toArray()).toEqual([2, 0.9, 2]);
    expect(monster?.position.toArray()).toEqual([0, 0.6, 2]);
    expect(projectile?.position.toArray()).toEqual([0, 0.7, 1]);
    expect(tower?.scale.toArray()).toEqual([1, 1, 1]);

    const towerGeometry = tower?.getObjectByName('tower:1');
    const monsterBody = monster?.getObjectByName('monster-body');
    const healthBarBackground = monster?.getObjectByName('health-bar-background');
    expect(towerGeometry).toHaveProperty('geometry.parameters.width', 1.1);
    expect(towerGeometry).toHaveProperty('geometry.parameters.height', 1.8);
    expect(monsterBody).toHaveProperty('geometry.parameters.width', 1);
    expect(healthBarBackground).toHaveProperty('geometry.parameters.width', 1.4);
    expect(projectile).toHaveProperty('geometry.parameters.radius', 0.22);
  });
});
