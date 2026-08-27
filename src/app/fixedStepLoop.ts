import type { GameEvent } from '../game/events';
import type { GameRuntime } from '../game/GameRuntime';
import type { GameSnapshot } from '../game/types';

export const FIXED_STEP_SECONDS = 1 / 60;
export const MAX_FRAME_DELTA_SECONDS = 0.25;

export interface PresentationFrame {
  readonly snapshot: GameSnapshot;
  readonly events: readonly GameEvent[];
  readonly interpolationAlpha: number;
}

export type RenderFrame = (frame: PresentationFrame) => void;

type RuntimeBoundary = Pick<GameRuntime, 'advance' | 'getSnapshot'>;

export class FixedStepLoop {
  private accumulatorSeconds = 0;

  constructor(
    private readonly runtime: RuntimeBoundary,
    private readonly renderFrame: RenderFrame,
  ) {}

  advanceFrame(frameDeltaSeconds: number): void {
    assertValidFrameDelta(frameDeltaSeconds);

    this.accumulatorSeconds += Math.min(frameDeltaSeconds, MAX_FRAME_DELTA_SECONDS);

    const events: GameEvent[] = [];
    let stepCount = Math.floor((this.accumulatorSeconds + Number.EPSILON) / FIXED_STEP_SECONDS);

    while (stepCount > 0) {
      events.push(...this.runtime.advance(FIXED_STEP_SECONDS));
      this.accumulatorSeconds -= FIXED_STEP_SECONDS;
      stepCount -= 1;
    }

    if (events.length === 0) {
      events.push(...this.runtime.advance(0));
    }

    this.renderFrame({
      snapshot: this.runtime.getSnapshot(),
      events,
      interpolationAlpha: this.accumulatorSeconds / FIXED_STEP_SECONDS,
    });
  }
}

function assertValidFrameDelta(frameDeltaSeconds: number): void {
  if (!Number.isFinite(frameDeltaSeconds) || frameDeltaSeconds < 0) {
    throw new RangeError('frameDeltaSeconds must be a finite non-negative number');
  }
}
