import { describe, expect, it } from 'vitest';

import { PREPARATION_DURATION, STARTING_BASE_HP, STARTING_COINS, WAVE_SIZE } from '../../src/config/gameConfig';
import { GameRuntime } from '../../src/game/GameRuntime';
import { createInitialState } from '../../src/game/state';
import type { GameSnapshot } from '../../src/game/types';

const FIXED_STEP = 1 / 60;

describe('terminal outcomes and restart (FR-013, FR-015)', () => {
  it('ends in Defeat immediately and freezes the boundary remainder (AC-010)', () => {
    const state = createInitialState();
    state.status = 'WaveActive';
    state.spawnedCount = WAVE_SIZE;
    state.baseHp = 1;
    state.monsters = [
      { id: 1, spawnIndex: 0, hp: 100, routeProgress: 25 },
      { id: 2, spawnIndex: 1, hp: 100, routeProgress: 25 },
    ];
    state.projectiles = [{ id: 3, targetId: 1, position: { x: 0, y: 0 } }];
    const runtime = new GameRuntime(state);

    expect(runtime.advance(10)).toEqual([
      { type: 'monster-escaped', monsterId: 1 },
      { type: 'session-ended', outcome: 'Defeat' },
    ]);
    expect(runtime.getSnapshot()).toMatchObject({
      status: 'Defeat',
      simulationTime: 1,
      baseHp: 0,
      escapedCount: 1,
      monsters: [{ id: 2, routeProgress: 26 }],
      projectiles: [{ id: 3, targetId: 1 }],
    });

    const frozenSnapshot = runtime.getSnapshot();
    expect(runtime.advance(100)).toEqual([]);
    expect(runtime.getSnapshot()).toEqual(frozenSnapshot);
    expect(runtime.validateBuild({ x: 0, y: 0 })).toEqual({
      ok: false,
      code: 'SESSION_ENDED',
    });
  });

  it('ends in Victory when the tenth monster is resolved (AC-011)', () => {
    const state = createInitialState();
    state.status = 'WaveActive';
    state.spawnedCount = WAVE_SIZE;
    state.killedCount = WAVE_SIZE - 1;
    state.monsters = [{ id: 1, spawnIndex: WAVE_SIZE - 1, hp: 100, routeProgress: 25 }];
    const runtime = new GameRuntime(state);

    expect(runtime.advance(5)).toEqual([
      { type: 'monster-escaped', monsterId: 1 },
      { type: 'session-ended', outcome: 'Victory' },
    ]);
    expect(runtime.getSnapshot()).toMatchObject({
      status: 'Victory',
      simulationTime: 1,
      baseHp: STARTING_BASE_HP - 1,
      killedCount: WAVE_SIZE - 1,
      escapedCount: 1,
    });
  });

  it('produces the same terminal state and events for coarse and fixed intervals', () => {
    const coarseRuntime = createUndefendedRuntime();
    const fixedRuntime = createUndefendedRuntime();
    const duration = PREPARATION_DURATION + 32;

    const coarseEvents = coarseRuntime.advance(duration);
    const fixedEvents = [];
    for (let tick = 0; tick < duration / FIXED_STEP; tick += 1) {
      fixedEvents.push(...fixedRuntime.advance(FIXED_STEP));
    }

    expect(fixedEvents).toEqual(coarseEvents);
    expectSnapshotsEquivalent(fixedRuntime.getSnapshot(), coarseRuntime.getSnapshot());
    expect(coarseRuntime.getSnapshot().status).toBe('Defeat');
  });

  it('rejects an early Restart without changing state or queued events', () => {
    const runtime = new GameRuntime();
    runtime.dispatch({ type: 'StartGame' });
    const snapshot = runtime.getSnapshot();

    expect(runtime.dispatch({ type: 'Restart' })).toEqual({
      ok: false,
      code: 'INVALID_SESSION_STATE',
    });
    expect(runtime.getSnapshot()).toEqual(snapshot);
    expect(runtime.advance(0)).toEqual([{ type: 'game-start' }]);
  });

  it('fully resets session state, events, and entity IDs (AC-012)', () => {
    const state = createInitialState();
    state.status = 'Victory';
    state.simulationTime = 42;
    state.phaseStartedAt = 20;
    state.coins = 60;
    state.spawnedCount = WAVE_SIZE;
    state.killedCount = WAVE_SIZE;
    state.towers = [{ id: 7, cell: { x: 0, y: 0 }, nextShotAt: 43 }];
    const runtime = new GameRuntime(state);

    expect(runtime.dispatch({ type: 'Restart' })).toEqual({ ok: true });
    expect(runtime.getSnapshot()).toEqual(createInitialState());
    expect(runtime.advance(0)).toEqual([]);
    expect(runtime.dispatch({ type: 'BuildTower', cell: { x: 0, y: 0 } })).toEqual({
      ok: false,
      code: 'GAME_NOT_STARTED',
    });
    expect(runtime.dispatch({ type: 'StartGame' })).toEqual({ ok: true });
    expect(runtime.dispatch({ type: 'BuildTower', cell: { x: 0, y: 0 } })).toEqual({
      ok: true,
    });
    expect(runtime.getSnapshot()).toMatchObject({
      status: 'Preparation',
      coins: STARTING_COINS - 50,
      towers: [{ id: 1 }],
    });
  });
});

function createUndefendedRuntime(): GameRuntime {
  const runtime = new GameRuntime();
  runtime.dispatch({ type: 'StartGame' });
  return runtime;
}

function expectSnapshotsEquivalent(actual: GameSnapshot, expected: GameSnapshot): void {
  expect(actual).toMatchObject({
    status: expected.status,
    phaseStartedAt: expected.phaseStartedAt,
    coins: expected.coins,
    baseHp: expected.baseHp,
    spawnedCount: expected.spawnedCount,
    killedCount: expected.killedCount,
    escapedCount: expected.escapedCount,
    towers: expected.towers,
    monsters: expected.monsters,
    projectiles: expected.projectiles,
  });
  expect(actual.simulationTime).toBeCloseTo(expected.simulationTime, 10);
}
