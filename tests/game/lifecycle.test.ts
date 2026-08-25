import { describe, expect, it } from 'vitest';

import { PREPARATION_DURATION } from '../../src/config/gameConfig';
import { GameRuntime } from '../../src/game/GameRuntime';
import { getPreparationCountdown } from '../../src/game/selectors';

const FIXED_STEP = 1 / 60;

describe('game start and preparation lifecycle (FR-001, FR-005, FR-006, FR-012)', () => {
  it('starts preparation at 20 seconds without spawning monsters (AC-004)', () => {
    const runtime = new GameRuntime();

    expect(runtime.dispatch({ type: 'StartGame' })).toEqual({ ok: true });

    const snapshot = runtime.getSnapshot();
    expect(snapshot.status).toBe('Preparation');
    expect(snapshot.phaseStartedAt).toBe(snapshot.simulationTime);
    expect(getPreparationCountdown(snapshot)).toBe(PREPARATION_DURATION);
    expect(snapshot.monsters).toEqual([]);
    expect(runtime.advance(0)).toEqual([{ type: 'game-start' }]);
  });

  it('rejects a repeated start without changing state or creating events', () => {
    const runtime = new GameRuntime();
    runtime.dispatch({ type: 'StartGame' });
    runtime.advance(0);
    const before = runtime.getSnapshot();

    expect(runtime.dispatch({ type: 'StartGame' })).toEqual({
      ok: false,
      code: 'INVALID_SESSION_STATE',
    });
    expect(runtime.getSnapshot()).toEqual(before);
    expect(runtime.advance(0)).toEqual([]);
  });

  it('keeps preparation active and countdown non-increasing before 20 seconds', () => {
    const runtime = new GameRuntime();
    runtime.dispatch({ type: 'StartGame' });

    const countdowns: number[] = [];
    for (let tick = 0; tick < 1_199; tick += 1) {
      expect(runtime.advance(FIXED_STEP)).not.toContainEqual({
        type: 'wave-start',
      });
      const countdown = getPreparationCountdown(runtime.getSnapshot());
      expect(countdown).not.toBeNull();
      countdowns.push(countdown!);
    }

    const snapshot = runtime.getSnapshot();
    expect(snapshot.status).toBe('Preparation');
    expect(snapshot.monsters).toEqual([]);
    expect(
      countdowns.every(
        (value, index) => index === 0 || value <= countdowns[index - 1]!,
      ),
    ).toBe(true);
  });

  it('starts the wave exactly at 20 seconds with deterministic fixed steps', () => {
    const runtime = new GameRuntime();
    runtime.dispatch({ type: 'StartGame' });

    let events = runtime.advance(0);
    for (let tick = 0; tick < 1_200; tick += 1) {
      events = runtime.advance(FIXED_STEP);
    }

    const snapshot = runtime.getSnapshot();
    expect(snapshot.status).toBe('WaveActive');
    expect(snapshot.simulationTime).toBeCloseTo(PREPARATION_DURATION, 10);
    expect(snapshot.phaseStartedAt).toBe(PREPARATION_DURATION);
    expect(snapshot.monsters).toEqual([]);
    expect(events).toEqual([{ type: 'wave-start' }]);
    expect(getPreparationCountdown(snapshot)).toBeNull();
    expect(runtime.advance(FIXED_STEP)).not.toContainEqual({
      type: 'wave-start',
    });
  });
});
