import { describe, expect, it } from 'vitest';

import { PREPARATION_DURATION, SHOT_COOLDOWN } from '../../src/config/gameConfig';
import { GameRuntime } from '../../src/game/GameRuntime';
import { createInitialState } from '../../src/game/state';
import { selectTarget } from '../../src/game/targeting';
import type { GameSnapshot, GameState } from '../../src/game/types';

const FIXED_STEP = 1 / 60;

describe('tower targeting and firing (FR-007, FR-011)', () => {
  it('includes the Euclidean range boundary and excludes monsters beyond it (AC-005)', () => {
    const state = createTargetingState([
      { id: 2, spawnIndex: 0, hp: 100, routeProgress: 0 },
      { id: 3, spawnIndex: 1, hp: 100, routeProgress: 0.01 },
    ]);
    state.towers[0]!.cell = { x: 0, y: 4 };

    expect(selectTarget(state, state.towers[0]!)).toMatchObject({ id: 2 });
  });

  it('selects furthest progress, then the lower spawn index on a tie', () => {
    const state = createTargetingState([
      { id: 2, spawnIndex: 2, hp: 100, routeProgress: 3 },
      { id: 3, spawnIndex: 1, hp: 100, routeProgress: 3 },
      { id: 4, spawnIndex: 0, hp: 100, routeProgress: 2 },
    ]);

    expect(selectTarget(state, state.towers[0]!)).toMatchObject({ id: 3 });
  });

  it('fires immediately and again on each exact one-second cooldown', () => {
    const runtime = createRuntimeWithTower({ x: 1, y: 3 });

    const events = runtime.advance(PREPARATION_DURATION + 2);
    const shots = events.filter(({ type }) => type === 'projectile-shot');

    expect(shots).toEqual([
      { type: 'projectile-shot', projectileId: 3, towerId: 1, targetId: 2 },
      { type: 'projectile-shot', projectileId: 4, towerId: 1, targetId: 2 },
      { type: 'projectile-shot', projectileId: 6, towerId: 1, targetId: 2 },
    ]);
    expect(runtime.getSnapshot().towers[0]?.nextShotAt).toBe(PREPARATION_DURATION + 2 + SHOT_COOLDOWN);
  });

  it('does not delay a ready tower when a target enters range later', () => {
    const runtime = createRuntimeWithTower({ x: 6, y: 3 });

    const events = runtime.advance(PREPARATION_DURATION + 4);
    const shot = events.find(({ type }) => type === 'projectile-shot');

    expect(shot).toMatchObject({ towerId: 1, targetId: 2 });
    expect(runtime.getSnapshot().towers[0]?.nextShotAt).toBeCloseTo(
      PREPARATION_DURATION + (6 - Math.sqrt(5)) + SHOT_COOLDOWN,
      10,
    );
  });

  it('produces equivalent targets and shots for coarse and fixed intervals', () => {
    const coarseRuntime = createRuntimeWithTower({ x: 6, y: 3 });
    const fixedRuntime = createRuntimeWithTower({ x: 6, y: 3 });
    const duration = PREPARATION_DURATION + 8;

    const coarseEvents = coarseRuntime.advance(duration);
    const fixedEvents = [];
    for (let tick = 0; tick < duration / FIXED_STEP; tick += 1) {
      fixedEvents.push(...fixedRuntime.advance(FIXED_STEP));
    }

    expect(fixedEvents.filter(({ type }) => type === 'projectile-shot')).toEqual(
      coarseEvents.filter(({ type }) => type === 'projectile-shot'),
    );
    expectSnapshotsEquivalent(fixedRuntime.getSnapshot(), coarseRuntime.getSnapshot());
  });

  it('fires a tower built during a wave immediately at the build boundary (AC-009)', () => {
    const runtime = new GameRuntime();
    runtime.dispatch({ type: 'StartGame' });
    runtime.advance(PREPARATION_DURATION);

    expect(runtime.dispatch({ type: 'BuildTower', cell: { x: 1, y: 3 } })).toEqual({ ok: true });
    expect(runtime.advance(0)).toEqual([
      {
        type: 'tower-built',
        towerId: 2,
        cell: { x: 1, y: 3 },
      },
      {
        type: 'projectile-shot',
        projectileId: 3,
        towerId: 2,
        targetId: 1,
      },
    ]);
    expect(runtime.getSnapshot().projectiles).toEqual([{ id: 3, targetId: 1, position: { x: 1, y: 3 } }]);
    expect(runtime.advance(FIXED_STEP)).not.toContainEqual(
      expect.objectContaining({ type: 'projectile-shot', towerId: 2 }),
    );
  });
});

function createTargetingState(monsters: GameState['monsters']): GameState {
  const state = createInitialState();
  state.status = 'WaveActive';
  state.towers = [{ id: 1, cell: { x: 2, y: 3 }, nextShotAt: state.simulationTime }];
  state.monsters = monsters;
  state.spawnedCount = monsters.length;
  return state;
}

function createRuntimeWithTower(cell: { x: number; y: number }): GameRuntime {
  const runtime = new GameRuntime();
  runtime.dispatch({ type: 'StartGame' });
  expect(runtime.dispatch({ type: 'BuildTower', cell })).toEqual({ ok: true });
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
