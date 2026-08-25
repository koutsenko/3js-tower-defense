import { describe, expect, it, vi } from 'vitest';
import {
  FIXED_STEP_SECONDS,
  FixedStepLoop,
  MAX_FRAME_DELTA_SECONDS,
  type PresentationFrame,
} from '../../src/app/fixedStepLoop';
import { GameRuntime } from '../../src/game/GameRuntime';

describe('FixedStepLoop', () => {
  it('accumulates frame time into fixed gameplay steps and renders once', () => {
    const runtime = new GameRuntime();
    runtime.dispatch({ type: 'StartGame' });
    const frames: PresentationFrame[] = [];
    const loop = new FixedStepLoop(runtime, (frame) => frames.push(frame));

    loop.advanceFrame(FIXED_STEP_SECONDS * 2.5);

    expect(runtime.getSnapshot().simulationTime).toBeCloseTo(
      FIXED_STEP_SECONDS * 2,
    );
    expect(frames).toHaveLength(1);
    expect(frames[0]?.interpolationAlpha).toBeCloseTo(0.5);
    expect(frames[0]?.events.map(({ type }) => type)).toEqual(['game-start']);
  });

  it('produces the same gameplay result for equivalent frame partitions', () => {
    const runFrames = (frameDeltas: readonly number[]) => {
      const runtime = new GameRuntime();
      runtime.dispatch({ type: 'StartGame' });
      const loop = new FixedStepLoop(runtime, () => undefined);

      for (const frameDelta of frameDeltas) {
        loop.advanceFrame(frameDelta);
      }

      return runtime.getSnapshot();
    };

    const singleFrame = runFrames([FIXED_STEP_SECONDS * 12]);
    const splitFrames = runFrames(
      Array.from({ length: 12 }, () => FIXED_STEP_SECONDS),
    );

    expect(splitFrames).toEqual(singleFrame);
  });

  it('caps a frame contribution at 250 milliseconds', () => {
    const runtime = new GameRuntime();
    runtime.dispatch({ type: 'StartGame' });
    const advance = vi.spyOn(runtime, 'advance');
    const loop = new FixedStepLoop(runtime, () => undefined);

    loop.advanceFrame(10);

    expect(advance).toHaveBeenCalledTimes(
      MAX_FRAME_DELTA_SECONDS / FIXED_STEP_SECONDS,
    );
    expect(runtime.getSnapshot().simulationTime).toBeCloseTo(
      MAX_FRAME_DELTA_SECONDS,
    );
  });

  it('drains command events without advancing gameplay on a partial frame', () => {
    const runtime = new GameRuntime();
    runtime.dispatch({ type: 'StartGame' });
    const frames: PresentationFrame[] = [];
    const loop = new FixedStepLoop(runtime, (frame) => frames.push(frame));

    loop.advanceFrame(FIXED_STEP_SECONDS / 2);

    expect(runtime.getSnapshot().simulationTime).toBe(0);
    expect(frames[0]?.events.map(({ type }) => type)).toEqual(['game-start']);
  });

  it('keeps interpolation data outside gameplay calculations', () => {
    const runtime = new GameRuntime();
    runtime.dispatch({ type: 'StartGame' });
    const loop = new FixedStepLoop(runtime, () => undefined);

    loop.advanceFrame(FIXED_STEP_SECONDS * 0.75);

    expect(runtime.getSnapshot().simulationTime).toBe(0);
  });

  it('does not progress terminal gameplay behavior', () => {
    const runtime = new GameRuntime({
      status: 'Victory',
      simulationTime: 42,
      phaseStartedAt: 20,
      coins: 30,
      baseHp: 1,
      spawnedCount: 10,
      killedCount: 8,
      escapedCount: 2,
      towers: [],
      monsters: [],
      projectiles: [],
    });
    const before = runtime.getSnapshot();
    const loop = new FixedStepLoop(runtime, () => undefined);

    loop.advanceFrame(MAX_FRAME_DELTA_SECONDS);

    expect(runtime.getSnapshot()).toEqual(before);
  });
});
