import { describe, expect, it } from 'vitest';

import { PREPARATION_DURATION } from '../../src/config/gameConfig';
import { GameRuntime } from '../../src/game/GameRuntime';
import { advanceLifecycle } from '../../src/game/lifecycle';
import { getPreparationCountdown } from '../../src/game/selectors';
import { createInitialState } from '../../src/game/state';

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
    expect(snapshot.monsters).toEqual([
      { id: 1, spawnIndex: 0, hp: 100, routeProgress: 0 },
    ]);
    expect(events).toEqual([
      { type: 'wave-start' },
      { type: 'monster-spawned', monsterId: 1, spawnIndex: 0 },
    ]);
    expect(getPreparationCountdown(snapshot)).toBeNull();
    expect(runtime.advance(FIXED_STEP)).not.toContainEqual({
      type: 'wave-start',
    });
  });

  it('passes only the post-boundary remainder to wave systems', () => {
    const state = createInitialState();
    state.status = 'Preparation';

    const result = advanceLifecycle(state, 25);

    expect(result).toEqual({
      events: [{ type: 'wave-start' }],
      waveActiveDuration: 5,
    });
    expect(state).toMatchObject({
      status: 'WaveActive',
      simulationTime: 25,
      phaseStartedAt: PREPARATION_DURATION,
      monsters: [],
    });
  });

  it('has no wave-active remainder when the interval ends on the boundary', () => {
    const state = createInitialState();
    state.status = 'Preparation';

    expect(advanceLifecycle(state, PREPARATION_DURATION)).toEqual({
      events: [{ type: 'wave-start' }],
      waveActiveDuration: 0,
    });
    expect(state.simulationTime).toBe(PREPARATION_DURATION);
    expect(state.phaseStartedAt).toBe(PREPARATION_DURATION);
  });

  it('does not start the wave immediately before the exact boundary', () => {
    const state = createInitialState();
    state.status = 'Preparation';

    expect(advanceLifecycle(state, PREPARATION_DURATION - 5e-10)).toEqual({
      events: [],
      waveActiveDuration: 0,
    });
    expect(state.status).toBe('Preparation');
  });

  it('produces equivalent lifecycle results for coarse and fixed intervals', () => {
    const coarseRuntime = new GameRuntime();
    const fixedRuntime = new GameRuntime();
    coarseRuntime.dispatch({ type: 'StartGame' });
    fixedRuntime.dispatch({ type: 'StartGame' });

    const coarseEvents = coarseRuntime.advance(25);
    const fixedEvents = [];
    for (let tick = 0; tick < 1_500; tick += 1) {
      fixedEvents.push(...fixedRuntime.advance(FIXED_STEP));
    }

    expect(coarseEvents).toEqual(fixedEvents);
    expect(fixedRuntime.getSnapshot()).toMatchObject({
      status: coarseRuntime.getSnapshot().status,
      phaseStartedAt: coarseRuntime.getSnapshot().phaseStartedAt,
    });
    expect(fixedRuntime.getSnapshot().simulationTime).toBeCloseTo(
      coarseRuntime.getSnapshot().simulationTime,
      10,
    );
  });

  it('uses advance(0) only to drain command events', () => {
    const runtime = new GameRuntime();
    runtime.dispatch({ type: 'StartGame' });
    const before = runtime.getSnapshot();

    expect(runtime.advance(0)).toEqual([{ type: 'game-start' }]);
    expect(runtime.getSnapshot()).toEqual(before);
    expect(runtime.advance(0)).toEqual([]);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects invalid delta %s without state changes or draining events',
    (deltaSeconds) => {
      const runtime = new GameRuntime();
      runtime.dispatch({ type: 'StartGame' });
      const before = runtime.getSnapshot();

      expect(() => runtime.advance(deltaSeconds)).toThrow(RangeError);
      expect(runtime.getSnapshot()).toEqual(before);
      expect(runtime.advance(0)).toEqual([{ type: 'game-start' }]);
    },
  );
});
