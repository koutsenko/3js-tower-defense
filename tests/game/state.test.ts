import { describe, expect, it } from 'vitest';

import { WAVE_SIZE } from '../../src/config/gameConfig';
import { createEntityIdSequence, createInitialState, createSnapshot } from '../../src/game/state';
import { getPreparationCountdown, getRemainingCount } from '../../src/game/selectors';

describe('game state (FR-001, FR-004-FR-006, FR-010, FR-012, FR-015)', () => {
  it('creates the initial session required by AC-001 and AC-014', () => {
    const state = createInitialState();

    expect(state).toEqual({
      status: 'Ready',
      simulationTime: 0,
      phaseStartedAt: 0,
      coins: 100,
      baseHp: 3,
      spawnedCount: 0,
      killedCount: 0,
      escapedCount: 0,
      towers: [],
      monsters: [],
      projectiles: [],
    });
    expect(getRemainingCount(state)).toBe(WAVE_SIZE);
    expect(getPreparationCountdown(state)).toBeNull();
  });

  it('derives remaining monsters including those not spawned yet (FR-012)', () => {
    const state = createInitialState();
    state.spawnedCount = 7;
    state.killedCount = 2;
    state.escapedCount = 1;

    expect(getRemainingCount(state)).toBe(7);
  });

  it('derives a non-negative countdown only during preparation (FR-005)', () => {
    const state = createInitialState();
    state.status = 'Preparation';
    state.simulationTime = 12.5;
    state.phaseStartedAt = 2;

    expect(getPreparationCountdown(state)).toBe(9.5);

    state.simulationTime = 30;
    expect(getPreparationCountdown(state)).toBe(0);

    state.status = 'WaveActive';
    expect(getPreparationCountdown(state)).toBeNull();
  });

  it('uses monotonically increasing IDs local to each session', () => {
    const firstSession = createEntityIdSequence();
    const restartedSession = createEntityIdSequence();

    expect([firstSession.next(), firstSession.next(), firstSession.next()]).toEqual([1, 2, 3]);
    expect(restartedSession.next()).toBe(1);
  });

  it('does not expose mutable authoritative state through a snapshot', () => {
    const state = createInitialState();
    state.towers.push({
      id: 1,
      cell: { x: 6, y: 3 },
      nextShotAt: 0,
    });
    const snapshot = createSnapshot(state);

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.towers)).toBe(true);
    expect(Object.isFrozen(snapshot.towers[0])).toBe(true);
    expect(Object.isFrozen(snapshot.towers[0]?.cell)).toBe(true);
    expect(() => {
      (snapshot.towers as unknown as { id: number }[]).push({ id: 2 });
    }).toThrow(TypeError);

    state.coins = 50;
    state.towers[0]!.cell = { x: 5, y: 5 };
    expect(snapshot.coins).toBe(100);
    expect(snapshot.towers[0]?.cell).toEqual({ x: 6, y: 3 });
  });
});
