import { LineSegments, Mesh, Scene, WebGLRenderer } from 'three';
import { levelConfig, type LevelConfig } from '../config/levelConfig';
import type { GameEvent } from '../game/events';
import type { GameSnapshot } from '../game/types';
import { createLevelCamera, resizeLevelCamera } from './camera';
import { EntityReconciler } from './entityReconciler';
import { createLevelPlaceholders } from './placeholders';
import { TransientEffects } from './transientEffects';

export class SceneRenderer {
  readonly scene = new Scene();
  readonly camera;
  private readonly renderer: WebGLRenderer;
  private readonly level: Readonly<LevelConfig>;
  private readonly entityReconciler: EntityReconciler;
  private readonly transientEffects: TransientEffects;

  constructor(canvas: HTMLCanvasElement, level: Readonly<LevelConfig> = levelConfig) {
    this.level = level;
    this.camera = createLevelCamera(level);
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.scene.add(createLevelPlaceholders(level));
    this.entityReconciler = new EntityReconciler(level, this.camera);
    this.transientEffects = new TransientEffects(level);
    this.scene.add(this.entityReconciler.root, this.transientEffects.root);
  }

  resize(width: number, height: number, pixelRatio = 1): void {
    resizeLevelCamera(this.camera, this.level, width, height);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  reconcile(snapshot: GameSnapshot): void {
    this.entityReconciler.reconcile(snapshot);
  }

  presentEvents(events: readonly GameEvent[], snapshot: GameSnapshot): void {
    this.transientEffects.present(events, snapshot, this.entityReconciler);
  }

  dispose(): void {
    this.entityReconciler.dispose();
    this.transientEffects.dispose();
    this.scene.traverse((object) => {
      if (object instanceof Mesh || object instanceof LineSegments) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          material.dispose();
        }
      }
    });
    this.renderer.dispose();
  }
}
