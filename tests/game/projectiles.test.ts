import { describe, expect, it } from 'vitest';

import { KILL_REWARD, PREPARATION_DURATION, PROJECTILE_DAMAGE } from '../../src/config/gameConfig';
import { GameRuntime } from '../../src/game/GameRuntime';
import { createInitialState } from '../../src/game/state';
import type { GameSnapshot, GameState } from '../../src/game/types';

const FIXED_STEP = 1 / 60;

describe('projectiles, damage, and kill economy (FR-008, FR-009)', () => {
  it('homes onto a living target after it leaves tower range (AC-006)', () => {
    const state = createCombatState();
    state.monsters[0]!.routeProgress = 7;
    state.projectiles = [{ id: 3, targetId: 2, position: { x: 4, y: 1 } }];
    const runtime = new GameRuntime(state);

    const events = runtime.advance(1);

    expect(events).toContainEqual({
      type: 'projectile-hit',
      projectileId: 3,
      targetId: 2,
      damage: PROJECTILE_DAMAGE,
    });
    expect(runtime.getSnapshot().monsters[0]?.hp).toBe(75);
  });

  it('removes a projectile without effects when its target escapes', () => {
    const state = createCombatState();
    state.coins = 40;
    state.monsters[0]!.routeProgress = 25.5;
    state.projectiles = [{ id: 3, targetId: 2, position: { x: 7, y: 6 } }];
    const runtime = new GameRuntime(state);

    expect(runtime.advance(0.5)).toEqual([{ type: 'monster-escaped', monsterId: 2 }]);
    expect(runtime.getSnapshot()).toMatchObject({
      coins: 40,
      killedCount: 0,
      escapedCount: 1,
      projectiles: [],
    });
  });

  it('awards one atomic kill reward and invalidates sibling projectiles (AC-007)', () => {
    const state = createCombatState();
    state.coins = 40;
    state.monsters[0]!.hp = PROJECTILE_DAMAGE;
    state.projectiles = [
      { id: 3, targetId: 2, position: { x: 0, y: 1 } },
      { id: 4, targetId: 2, position: { x: 0, y: 1 } },
    ];
    const runtime = new GameRuntime(state);

    expect(runtime.advance(0.1)).toEqual([
      {
        type: 'projectile-hit',
        projectileId: 3,
        targetId: 2,
        damage: PROJECTILE_DAMAGE,
      },
      { type: 'monster-killed', monsterId: 2 },
    ]);
    expect(runtime.getSnapshot()).toMatchObject({
      coins: 40 + KILL_REWARD,
      killedCount: 1,
      monsters: [],
      projectiles: [],
    });
  });

  it('gives escape priority over a hit on the same boundary', () => {
    const state = createCombatState();
    state.monsters[0]!.routeProgress = 25;
    state.projectiles = [{ id: 3, targetId: 2, position: { x: 3, y: 6 } }];
    const runtime = new GameRuntime(state);

    expect(runtime.advance(1)).toEqual([{ type: 'monster-escaped', monsterId: 2 }]);
    expect(runtime.getSnapshot().projectiles).toEqual([]);
  });

  it('does not resolve a hit at an arbitrary advance endpoint', () => {
    const coarseState = createCombatState();
    coarseState.monsters[0]!.routeProgress = 25;
    coarseState.projectiles = [{ id: 3, targetId: 2, position: { x: 10.5, y: 6 } }];
    const splitState = structuredClone(coarseState);
    const coarseRuntime = new GameRuntime(coarseState);
    const splitRuntime = new GameRuntime(splitState);

    const coarseEvents = coarseRuntime.advance(1);
    const splitEvents = [...splitRuntime.advance(0.06), ...splitRuntime.advance(0.94)];

    expect(splitEvents).toEqual(coarseEvents);
    expectSnapshotsEquivalent(splitRuntime.getSnapshot(), coarseRuntime.getSnapshot());
  });

  it('produces equivalent hit and kill events for coarse and fixed intervals', () => {
    const coarseRuntime = createRuntimeWithTower();
    const fixedRuntime = createRuntimeWithTower();
    const duration = PREPARATION_DURATION + 8;

    const coarseEvents = coarseRuntime.advance(duration);
    const fixedEvents = [];
    for (let tick = 0; tick < duration / FIXED_STEP; tick += 1) {
      fixedEvents.push(...fixedRuntime.advance(FIXED_STEP));
    }

    expect(fixedEvents).toEqual(coarseEvents);
    expectSnapshotsEquivalent(fixedRuntime.getSnapshot(), coarseRuntime.getSnapshot());
  });
});

function createCombatState(): GameState {
  const state = createInitialState();
  state.status = 'WaveActive';
  state.spawnedCount = 1;
  state.monsters = [{ id: 2, spawnIndex: 0, hp: 100, routeProgress: 0 }];
  return state;
}

function createRuntimeWithTower(): GameRuntime {
  const runtime = new GameRuntime();
  runtime.dispatch({ type: 'StartGame' });
  runtime.dispatch({ type: 'BuildTower', cell: { x: 1, y: 3 } });
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
