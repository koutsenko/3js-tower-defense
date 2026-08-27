import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Object3D, OrthographicCamera, SphereGeometry } from 'three';
import { levelConfig, type LevelConfig } from '../config/levelConfig';
import { getRoutePosition } from '../game/movement';
import type { EntityId, GameSnapshot, MonsterState, ProjectileState, TowerState } from '../game/types';
import { createHealthBar, updateHealthBar } from './healthBars';

type EntityKind = 'tower' | 'monster' | 'projectile';

interface EntityEntry {
  readonly kind: EntityKind;
  readonly object: Object3D;
}

const COLORS = {
  tower: 0x4267d5,
  monster: 0xd58a42,
  projectile: 0xf5e663,
} as const;

export class EntityReconciler {
  readonly root = new Group();
  private readonly entities = new Map<EntityId, EntityEntry>();

  constructor(
    private readonly level: Readonly<LevelConfig> = levelConfig,
    private readonly camera?: OrthographicCamera,
  ) {
    this.root.name = 'active-entities';
  }

  reconcile(snapshot: GameSnapshot): void {
    const activeIds = new Set<EntityId>();

    for (const tower of snapshot.towers) {
      activeIds.add(tower.id);
      this.reconcileTower(tower);
    }
    for (const monster of snapshot.monsters) {
      activeIds.add(monster.id);
      this.reconcileMonster(monster);
    }
    for (const projectile of snapshot.projectiles) {
      activeIds.add(projectile.id);
      this.reconcileProjectile(projectile);
    }

    for (const [id, entry] of this.entities) {
      if (!activeIds.has(id)) {
        this.removeEntity(id, entry.object);
      }
    }
  }

  getObject(entityId: EntityId): Object3D | undefined {
    return this.entities.get(entityId)?.object;
  }

  dispose(): void {
    for (const [id, entry] of this.entities) {
      this.removeEntity(id, entry.object);
    }
    this.root.removeFromParent();
  }

  private reconcileTower(tower: Readonly<TowerState>): void {
    const object = this.getOrCreate(tower.id, 'tower', () => {
      const mesh = new Mesh(
        new BoxGeometry(0.55 * this.level.cellSize, 0.9 * this.level.cellSize, 0.55 * this.level.cellSize),
        new MeshBasicMaterial({ color: COLORS.tower }),
      );
      mesh.name = `tower:${tower.id}`;
      return mesh;
    });
    object.position.set(
      tower.cell.x * this.level.cellSize,
      0.45 * this.level.cellSize,
      tower.cell.y * this.level.cellSize,
    );
  }

  private reconcileMonster(monster: Readonly<MonsterState>): void {
    const object = this.getOrCreate(monster.id, 'monster', () => {
      const root = new Group();
      root.name = `monster:${monster.id}`;
      const body = new Mesh(
        new BoxGeometry(0.5 * this.level.cellSize, 0.5 * this.level.cellSize, 0.5 * this.level.cellSize),
        new MeshBasicMaterial({ color: COLORS.monster }),
      );
      body.name = 'monster-body';
      const healthBar = createHealthBar(this.level.cellSize);
      healthBar.position.y = 0.55 * this.level.cellSize;
      root.add(body, healthBar);
      return root;
    });
    const position = getRoutePosition(monster.routeProgress, this.level);
    object.position.set(position.x * this.level.cellSize, 0.3 * this.level.cellSize, position.y * this.level.cellSize);

    const healthBar = object.getObjectByName('health-bar');
    if (!(healthBar instanceof Group)) {
      throw new Error('Monster health bar is missing');
    }
    updateHealthBar(healthBar, monster.hp, this.camera);
  }

  private reconcileProjectile(projectile: Readonly<ProjectileState>): void {
    const object = this.getOrCreate(projectile.id, 'projectile', () => {
      const mesh = new Mesh(
        new SphereGeometry(0.11 * this.level.cellSize, 8, 6),
        new MeshBasicMaterial({ color: COLORS.projectile }),
      );
      mesh.name = `projectile:${projectile.id}`;
      return mesh;
    });
    object.position.set(
      projectile.position.x * this.level.cellSize,
      0.35 * this.level.cellSize,
      projectile.position.y * this.level.cellSize,
    );
  }

  private getOrCreate(id: EntityId, kind: EntityKind, create: () => Object3D): Object3D {
    const existing = this.entities.get(id);
    if (existing) {
      if (existing.kind !== kind) {
        throw new Error(`Entity ${id} changed kind`);
      }
      return existing.object;
    }

    const object = create();
    object.userData.entityId = id;
    object.userData.entityKind = kind;
    this.entities.set(id, { kind, object });
    this.root.add(object);
    return object;
  }

  private removeEntity(id: EntityId, object: Object3D): void {
    object.traverse((child) => {
      if (child instanceof Mesh) {
        child.geometry.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) {
          material.dispose();
        }
      }
    });
    object.removeFromParent();
    this.entities.delete(id);
  }
}
