import { LineSegments, Mesh, Scene, WebGLRenderer } from 'three';
import { levelConfig, type LevelConfig } from '../config/levelConfig';
import { createLevelCamera, resizeLevelCamera } from './camera';
import { createLevelPlaceholders } from './placeholders';

export class SceneRenderer {
  readonly scene = new Scene();
  readonly camera;
  private readonly renderer: WebGLRenderer;
  private readonly level: Readonly<LevelConfig>;

  constructor(
    canvas: HTMLCanvasElement,
    level: Readonly<LevelConfig> = levelConfig,
  ) {
    this.level = level;
    this.camera = createLevelCamera(level);
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.scene.add(createLevelPlaceholders(level));
  }

  resize(width: number, height: number, pixelRatio = 1): void {
    resizeLevelCamera(this.camera, this.level, width, height);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.scene.traverse((object) => {
      if (object instanceof Mesh || object instanceof LineSegments) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        for (const material of materials) {
          material.dispose();
        }
      }
    });
    this.renderer.dispose();
  }
}
