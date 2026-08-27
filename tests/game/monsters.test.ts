import { describe, expect, it } from 'vitest';

import { MONSTER_HP, PREPARATION_DURATION, WAVE_SIZE } from '../../src/config/gameConfig';
import { GameRuntime } from '../../src/game/GameRuntime';
import { getRoutePosition } from '../../src/game/movement';
import { createInitialState } from '../../src/game/state';
import type { GameSnapshot } from '../../src/game/types';

const FIXED_STEP = 1 / 60;

describe('monster spawning, movement, and escape (FR-006, FR-010, FR-012)', () => {
  it('spawns the first monster at wave start with zero progress (AC-004)', () => {
    const runtime = new GameRuntime();
    runtime.dispatch({ type: 'StartGame' });

    expect(runtime.advance(PREPARATION_DURATION)).toEqual([
      { type: 'game-start' },
      { type: 'wave-start' },
      { type: 'monster-spawned', monsterId: 1, spawnIndex: 0 },
    ]);
    expect(runtime.getSnapshot().monsters).toEqual([{ id: 1, spawnIndex: 0, hp: MONSTER_HP, routeProgress: 0 }]);
  });

  it('gives each monster only its active time across spawn boundaries', () => {
    const runtime = new GameRuntime();
    runtime.dispatch({ type: 'StartGame' });

    const events = runtime.advance(PREPARATION_DURATION + 4);

    expect(events).toEqual([
      { type: 'game-start' },
      { type: 'wave-start' },
      { type: 'monster-spawned', monsterId: 1, spawnIndex: 0 },
      { type: 'monster-spawned', monsterId: 2, spawnIndex: 1 },
      { type: 'monster-spawned', monsterId: 3, spawnIndex: 2 },
    ]);
    expect(runtime.getSnapshot().monsters).toEqual([
      { id: 1, spawnIndex: 0, hp: MONSTER_HP, routeProgress: 4 },
      { id: 2, spawnIndex: 1, hp: MONSTER_HP, routeProgress: 2 },
      { id: 3, spawnIndex: 2, hp: MONSTER_HP, routeProgress: 0 },
    ]);
  });

  it('spawns exactly ten monsters at the approved schedule', () => {
    const runtime = new GameRuntime();
    runtime.dispatch({ type: 'StartGame' });

    const events = runtime.advance(PREPARATION_DURATION + 18);

    expect(events.filter(({ type }) => type === 'monster-spawned')).toHaveLength(WAVE_SIZE);
    expect(runtime.getSnapshot().spawnedCount).toBe(WAVE_SIZE);
    expect(runtime.getSnapshot().monsters).toHaveLength(WAVE_SIZE);
    expect(runtime.getSnapshot().monsters.at(-1)?.routeProgress).toBe(0);

    const eventsAfterSchedule = runtime.advance(5);
    expect(eventsAfterSchedule.filter(({ type }) => type === 'monster-spawned')).toEqual([]);
    expect(runtime.getSnapshot().spawnedCount).toBe(WAVE_SIZE);
  });

  it('produces equivalent state and events for coarse and fixed intervals', () => {
    const coarseRuntime = new GameRuntime();
    const fixedRuntime = new GameRuntime();
    coarseRuntime.dispatch({ type: 'StartGame' });
    fixedRuntime.dispatch({ type: 'StartGame' });

    const coarseEvents = coarseRuntime.advance(PREPARATION_DURATION + 4);
    const fixedEvents = [];
    for (let tick = 0; tick < (PREPARATION_DURATION + 4) / FIXED_STEP; tick += 1) {
      fixedEvents.push(...fixedRuntime.advance(FIXED_STEP));
    }

    expect(fixedEvents).toEqual(coarseEvents);
    expectSnapshotsEquivalent(fixedRuntime.getSnapshot(), coarseRuntime.getSnapshot());
  });

  it('interpolates route position through every turn', () => {
    expect(getRoutePosition(7.75)).toEqual({ x: 7.75, y: 1 });
    expect(getRoutePosition(8.25)).toEqual({ x: 8, y: 1.25 });
    expect(getRoutePosition(11.5)).toEqual({ x: 7.5, y: 4 });
    expect(getRoutePosition(17)).toEqual({ x: 3, y: 5 });
    expect(getRoutePosition(26)).toEqual({ x: 11, y: 6 });
  });

  it('resolves escapes in spawn order without changing coins or kills (AC-008)', () => {
    const state = createInitialState();
    state.status = 'WaveActive';
    state.coins = 40;
    state.spawnedCount = WAVE_SIZE;
    state.monsters = [
      { id: 7, spawnIndex: 2, hp: 75, routeProgress: 25.5 },
      { id: 3, spawnIndex: 0, hp: 100, routeProgress: 25.5 },
    ];
    const runtime = new GameRuntime(state);

    expect(runtime.advance(0.5)).toEqual([
      { type: 'monster-escaped', monsterId: 3 },
      { type: 'monster-escaped', monsterId: 7 },
    ]);
    expect(runtime.getSnapshot()).toMatchObject({
      coins: 40,
      baseHp: 1,
      killedCount: 0,
      escapedCount: 2,
      monsters: [],
    });
  });

  it('does not let later spawns escape using time before they appeared', () => {
    const runtime = new GameRuntime();
    runtime.dispatch({ type: 'StartGame' });

    runtime.advance(PREPARATION_DURATION + 26);

    const snapshot = runtime.getSnapshot();
    expect(snapshot.escapedCount).toBe(1);
    expect(snapshot.baseHp).toBe(2);
    expect(snapshot.monsters.find(({ spawnIndex }) => spawnIndex === 1)).toMatchObject({
      routeProgress: 24,
    });
  });
});

function expectSnapshotsEquivalent(actual: GameSnapshot, expected: GameSnapshot): void {
  expect(actual).toMatchObject({
    status: expected.status,
    phaseStartedAt: expected.phaseStartedAt,
    coins: expected.coins,
    baseHp: expected.baseHp,
    spawnedCount: expected.spawnedCount,
    killedCount: expected.killedCount,
    escapedCount: expected.escapedCount,
  });
  expect(actual.simulationTime).toBeCloseTo(expected.simulationTime, 10);
  expect(actual.monsters).toHaveLength(expected.monsters.length);

  for (const [index, monster] of actual.monsters.entries()) {
    expect(monster).toMatchObject({
      id: expected.monsters[index]?.id,
      spawnIndex: expected.monsters[index]?.spawnIndex,
      hp: expected.monsters[index]?.hp,
    });
    expect(monster.routeProgress).toBeCloseTo(expected.monsters[index]?.routeProgress ?? Number.NaN, 10);
  }
}
