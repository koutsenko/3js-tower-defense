import {
  BufferGeometry,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import { levelConfig, type LevelConfig } from '../config/levelConfig';
import type { GameEvent } from '../game/events';
import { getRoutePosition } from '../game/movement';
import type { EntityId, GameSnapshot } from '../game/types';
import type { EntityReconciler } from './entityReconciler';

const EFFECT_LIFETIME_FRAMES = 4;

interface ActiveEffect {
  readonly object: Line | Mesh;
  framesRemaining: number;
}

export class TransientEffects {
  readonly root = new Group();
  private readonly effects: ActiveEffect[] = [];

  constructor(private readonly level: Readonly<LevelConfig> = levelConfig) {
    this.root.name = 'transient-effects';
  }

  present(events: readonly GameEvent[], snapshot: GameSnapshot, entities: EntityReconciler): void {
    this.expireEffects();
    const spawnedMonsterIds = new Set(
      events.filter((event) => event.type === 'monster-spawned').map((event) => event.monsterId),
    );

    for (const event of events) {
      if (event.type === 'projectile-shot') {
        const origin = this.resolvePosition(event.towerId, snapshot, entities);
        const target = this.resolvePosition(event.targetId, snapshot, entities, spawnedMonsterIds.has(event.targetId));
        if (origin !== null && target !== null) {
          this.addShotTrail(origin, target);
        }
      } else if (event.type === 'projectile-hit') {
        const target = this.resolvePosition(event.targetId, snapshot, entities, spawnedMonsterIds.has(event.targetId));
        if (target !== null) {
          this.addHitFlash(target);
        }
      }
    }
  }

  dispose(): void {
    for (const effect of this.effects.splice(0)) {
      disposeEffect(effect.object);
    }
    this.root.removeFromParent();
  }

  private expireEffects(): void {
    for (let index = this.effects.length - 1; index >= 0; index -= 1) {
      const effect = this.effects[index]!;
      effect.framesRemaining -= 1;
      if (effect.framesRemaining <= 0) {
        disposeEffect(effect.object);
        this.effects.splice(index, 1);
      }
    }
  }

  private addShotTrail(origin: Vector3, target: Vector3): void {
    const trail = new Line(
      new BufferGeometry().setFromPoints([origin, target]),
      new LineBasicMaterial({ color: 0xf5e663 }),
    );
    trail.name = 'shot-trail';
    this.addEffect(trail);
  }

  private addHitFlash(position: Vector3): void {
    const flash = new Mesh(
      new SphereGeometry(0.18 * this.level.cellSize, 8, 6),
      new MeshBasicMaterial({ color: 0xffffff }),
    );
    flash.name = 'hit-flash';
    flash.position.copy(position);
    this.addEffect(flash);
  }

  private addEffect(object: Line | Mesh): void {
    this.root.add(object);
    this.effects.push({ object, framesRemaining: EFFECT_LIFETIME_FRAMES });
  }

  private resolvePosition(
    entityId: EntityId,
    snapshot: GameSnapshot,
    entities: EntityReconciler,
    spawnedThisFrame = false,
  ): Vector3 | null {
    const rendered = entities.getObject(entityId);
    if (rendered !== undefined) {
      return rendered.getWorldPosition(new Vector3());
    }

    const tower = snapshot.towers.find(({ id }) => id === entityId);
    if (tower !== undefined) {
      return new Vector3(
        tower.cell.x * this.level.cellSize,
        0.45 * this.level.cellSize,
        tower.cell.y * this.level.cellSize,
      );
    }

    const monster = snapshot.monsters.find(({ id }) => id === entityId);
    if (monster !== undefined) {
      const position = getRoutePosition(monster.routeProgress, this.level);
      return new Vector3(position.x * this.level.cellSize, 0.3 * this.level.cellSize, position.y * this.level.cellSize);
    }

    if (spawnedThisFrame) {
      return new Vector3(
        this.level.entrance.x * this.level.cellSize,
        0.3 * this.level.cellSize,
        this.level.entrance.y * this.level.cellSize,
      );
    }

    return null;
  }
}

function disposeEffect(effect: Line | Mesh): void {
  effect.removeFromParent();
  effect.geometry.dispose();
  const materials = Array.isArray(effect.material) ? effect.material : [effect.material];
  for (const material of materials) {
    material.dispose();
  }
}
