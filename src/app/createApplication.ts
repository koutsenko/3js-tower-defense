import { FixedStepLoop, type RenderFrame } from './fixedStepLoop';
import { GameRuntime } from '../game/GameRuntime';
import { SceneRenderer } from '../rendering/SceneRenderer';
import { FinalOverlay } from '../ui/FinalOverlay';
import { HudView } from '../ui/HudView';
import { PlacementController } from '../ui/PlacementController';
import { BuildFeedbackView } from '../ui/buildFeedback';
import type { Camera, Object3D, Scene } from 'three';
import type { GameEvent } from '../game/events';
import type { GameSnapshot } from '../game/types';

export interface Application {
  readonly runtime: GameRuntime;
  start(): void;
  stop(): void;
}

export interface ApplicationOptions {
  readonly renderFrame: RenderFrame;
  readonly runtime?: GameRuntime;
}

export function createApplication({ renderFrame, runtime = new GameRuntime() }: ApplicationOptions): Application {
  const loop = new FixedStepLoop(runtime, renderFrame);
  let animationFrameId: number | null = null;
  let previousTimestamp: number | null = null;

  const onAnimationFrame = (timestamp: number): void => {
    if (animationFrameId === null) {
      return;
    }

    const deltaSeconds = previousTimestamp === null ? 0 : (timestamp - previousTimestamp) / 1000;
    previousTimestamp = timestamp;
    loop.advanceFrame(deltaSeconds);

    if (animationFrameId !== null) {
      animationFrameId = requestAnimationFrame(onAnimationFrame);
    }
  };

  return {
    runtime,
    start() {
      if (animationFrameId !== null) {
        return;
      }

      previousTimestamp = null;
      animationFrameId = requestAnimationFrame(onAnimationFrame);
    },
    stop() {
      if (animationFrameId === null) {
        return;
      }

      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
      previousTimestamp = null;
    },
  };
}

interface SceneView {
  readonly scene: Scene;
  readonly camera: Camera;
  resize(width: number, height: number, pixelRatio?: number): void;
  presentEvents(events: readonly GameEvent[], snapshot: GameSnapshot): void;
  reconcile(snapshot: GameSnapshot): void;
  render(): void;
  dispose(): void;
}

interface SnapshotView {
  render(snapshot: GameSnapshot): void;
  dispose(): void;
}

interface PlacementView {
  readonly root: Object3D;
  dispose(): void;
}

export interface BrowserApplication extends Application {
  readonly canvas: HTMLCanvasElement;
  dispose(): void;
}

export interface BrowserApplicationOptions {
  readonly runtime?: GameRuntime;
  readonly createScene?: (canvas: HTMLCanvasElement) => SceneView;
  readonly createHud?: (container: HTMLElement, runtime: GameRuntime) => SnapshotView;
  readonly createFinalOverlay?: (container: HTMLElement, runtime: GameRuntime) => SnapshotView;
  readonly createPlacement?: (
    canvas: HTMLCanvasElement,
    camera: Camera,
    runtime: GameRuntime,
    container: HTMLElement,
  ) => PlacementView;
  readonly onEvents?: (events: readonly GameEvent[]) => void;
}

export function createBrowserApplication(
  root: HTMLElement,
  {
    runtime = new GameRuntime(),
    createScene = (canvas) => new SceneRenderer(canvas),
    createHud = (container, gameRuntime) => new HudView(container, gameRuntime),
    createFinalOverlay = (container, gameRuntime) => new FinalOverlay(container, gameRuntime),
    createPlacement = (canvas, camera, gameRuntime, container) =>
      new PlacementController(canvas, camera, gameRuntime, new BuildFeedbackView(container)),
    onEvents = () => undefined,
  }: BrowserApplicationOptions = {},
): BrowserApplication {
  root.replaceChildren();
  root.classList.add('game-root');

  const canvas = document.createElement('canvas');
  canvas.className = 'game-canvas';
  canvas.setAttribute('aria-label', 'Tower defense level');
  root.append(canvas);

  const scene = createScene(canvas);
  const hud = createHud(root, runtime);
  const finalOverlay = createFinalOverlay(root, runtime);
  const placement = createPlacement(canvas, scene.camera, runtime, root);
  scene.scene.add(placement.root);

  const renderFrame: RenderFrame = ({ snapshot, events }) => {
    scene.presentEvents(events, snapshot);
    scene.reconcile(snapshot);
    hud.render(snapshot);
    finalOverlay.render(snapshot);
    onEvents(events);
    scene.render();
  };
  const animation = createApplication({ runtime, renderFrame });

  const resize = (): void => {
    const bounds = root.getBoundingClientRect();
    const width = Math.max(1, bounds.width || window.innerWidth);
    const height = Math.max(1, bounds.height || window.innerHeight);
    scene.resize(width, height, window.devicePixelRatio);
  };
  window.addEventListener('resize', resize);
  resize();
  renderFrame({
    snapshot: runtime.getSnapshot(),
    events: [],
    interpolationAlpha: 0,
  });

  let disposed = false;
  return {
    runtime,
    canvas,
    start: animation.start,
    stop: animation.stop,
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      animation.stop();
      window.removeEventListener('resize', resize);
      placement.dispose();
      finalOverlay.dispose();
      hud.dispose();
      scene.dispose();
      canvas.remove();
      root.classList.remove('game-root');
    },
  };
}
