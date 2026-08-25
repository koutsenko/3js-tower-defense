import { FixedStepLoop, type RenderFrame } from './fixedStepLoop';
import { GameRuntime } from '../game/GameRuntime';

export interface Application {
  readonly runtime: GameRuntime;
  start(): void;
  stop(): void;
}

export interface ApplicationOptions {
  readonly renderFrame: RenderFrame;
  readonly runtime?: GameRuntime;
}

export function createApplication({
  renderFrame,
  runtime = new GameRuntime(),
}: ApplicationOptions): Application {
  const loop = new FixedStepLoop(runtime, renderFrame);
  let animationFrameId: number | null = null;
  let previousTimestamp: number | null = null;

  const onAnimationFrame = (timestamp: number): void => {
    if (animationFrameId === null) {
      return;
    }

    const deltaSeconds =
      previousTimestamp === null ? 0 : (timestamp - previousTimestamp) / 1000;
    previousTimestamp = timestamp;
    loop.advanceFrame(deltaSeconds);
    animationFrameId = requestAnimationFrame(onAnimationFrame);
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
