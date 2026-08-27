import { describe, expect, it } from 'vitest';

import { GameRuntime } from '../../src/game/GameRuntime';
import { createInitialState } from '../../src/game/state';
import type { GameState, SessionStatus } from '../../src/game/types';

function createRuntime(status: SessionStatus, overrides: Partial<GameState> = {}): GameRuntime {
  return new GameRuntime({ ...createInitialState(), status, ...overrides });
}

describe('tower building validation (FR-003, FR-004, FR-011)', () => {
  it.each([
    ['Victory', { x: -1, y: 1 }, 'SESSION_ENDED'],
    ['Defeat', { x: 0, y: 1 }, 'SESSION_ENDED'],
    ['Ready', { x: -1, y: 1 }, 'GAME_NOT_STARTED'],
    ['Preparation', { x: -1, y: 1 }, 'OUT_OF_BOUNDS'],
    ['Preparation', { x: 0, y: 1 }, 'PATH_CELL'],
  ] as const)('returns the prioritized rejection for %s at (%s, %s)', (status, cell, expectedCode) => {
    const runtime = createRuntime(status);

    expect(runtime.validateBuild(cell)).toEqual({
      ok: false,
      code: expectedCode,
    });
  });

  it('reports OCCUPIED before INSUFFICIENT_FUNDS (AC-003)', () => {
    const runtime = createRuntime('WaveActive', {
      coins: 0,
      towers: [{ id: 1, cell: { x: 6, y: 3 }, nextShotAt: 0 }],
    });

    expect(runtime.validateBuild({ x: 6, y: 3 })).toEqual({
      ok: false,
      code: 'OCCUPIED',
    });
  });

  it('reports INSUFFICIENT_FUNDS for an otherwise valid cell (AC-003)', () => {
    const runtime = createRuntime('Preparation', { coins: 49 });

    expect(runtime.validateBuild({ x: 6, y: 3 })).toEqual({
      ok: false,
      code: 'INSUFFICIENT_FUNDS',
    });
  });

  it('does not change gameplay state or create events after rejection (AC-003)', () => {
    const runtime = createRuntime('Preparation');
    const before = runtime.getSnapshot();

    expect(runtime.dispatch({ type: 'BuildTower', cell: { x: 0, y: 1 } })).toEqual({ ok: false, code: 'PATH_CELL' });
    expect(runtime.getSnapshot()).toEqual(before);
    expect(runtime.advance(0)).toEqual([]);
  });

  it.each(['Preparation', 'WaveActive'] as const)(
    'atomically builds one tower for 50 coins during %s (AC-002)',
    (status) => {
      const runtime = createRuntime(status);

      expect(runtime.dispatch({ type: 'BuildTower', cell: { x: 6, y: 3 } })).toEqual({ ok: true });
      expect(runtime.getSnapshot()).toMatchObject({
        coins: 50,
        towers: [{ id: 1, cell: { x: 6, y: 3 }, nextShotAt: 0 }],
      });
      expect(runtime.advance(0)).toEqual([{ type: 'tower-built', towerId: 1, cell: { x: 6, y: 3 } }]);
      expect(runtime.advance(0)).toEqual([]);
    },
  );

  it('allocates a tower ID above every entity in populated state', () => {
    const runtime = createRuntime('WaveActive', {
      coins: 100,
      towers: [{ id: 3, cell: { x: 6, y: 3 }, nextShotAt: 0 }],
      monsters: [{ id: 8, spawnIndex: 0, hp: 100, routeProgress: 0 }],
      projectiles: [{ id: 5, targetId: 8, position: { x: 0, y: 1 } }],
    });

    expect(runtime.dispatch({ type: 'BuildTower', cell: { x: 5, y: 5 } })).toEqual({ ok: true });
    expect(runtime.getSnapshot().towers.at(-1)?.id).toBe(9);
    expect(runtime.advance(0)).toEqual([{ type: 'tower-built', towerId: 9, cell: { x: 5, y: 5 } }]);
  });
});
