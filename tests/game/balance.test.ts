import { describe, expect, it } from 'vitest';

import { GameRuntime } from '../../src/game/GameRuntime';
import type { GameSnapshot } from '../../src/game/types';

const FIXED_STEP = 1 / 60;
const SESSION_BUDGET_SECONDS = 80;
const STARTING_TOWER_CELLS = [
  { x: 6, y: 3 },
  { x: 5, y: 5 },
] as const;

describe('two-tower balance fixture (FR-016)', () => {
  it('wins with the approved starting placement under different time partitions (AC-013)', () => {
    const fixedRuntime = createBalanceRuntime();
    const partitionedRuntime = createBalanceRuntime();

    advanceUntilTerminal(fixedRuntime, () => FIXED_STEP);
    advanceUntilTerminal(partitionedRuntime, alternatingStep());

    const fixedSnapshot = fixedRuntime.getSnapshot();
    const partitionedSnapshot = partitionedRuntime.getSnapshot();

    expect(fixedSnapshot.status).toBe('Victory');
    expect(partitionedSnapshot.status).toBe('Victory');
    expectBalanceResultsEquivalent(partitionedSnapshot, fixedSnapshot);
  });
});

function createBalanceRuntime(): GameRuntime {
  const runtime = new GameRuntime();

  expect(runtime.dispatch({ type: 'StartGame' })).toEqual({ ok: true });
  for (const cell of STARTING_TOWER_CELLS) {
    expect(runtime.dispatch({ type: 'BuildTower', cell })).toEqual({
      ok: true,
    });
  }

  return runtime;
}

function advanceUntilTerminal(
  runtime: GameRuntime,
  nextStep: () => number,
): void {
  let elapsed = 0;

  while (
    !isTerminal(runtime.getSnapshot()) &&
    elapsed < SESSION_BUDGET_SECONDS
  ) {
    const step = Math.min(nextStep(), SESSION_BUDGET_SECONDS - elapsed);
    runtime.advance(step);
    elapsed += step;
  }

  expect(isTerminal(runtime.getSnapshot())).toBe(true);
}

function alternatingStep(): () => number {
  const steps = [0.1, 0.37, 0.53];
  let index = 0;

  return () => {
    const step = steps[index % steps.length];
    index += 1;
    return step;
  };
}

function isTerminal(snapshot: GameSnapshot): boolean {
  return snapshot.status === 'Victory' || snapshot.status === 'Defeat';
}

function expectBalanceResultsEquivalent(
  actual: GameSnapshot,
  expected: GameSnapshot,
): void {
  expect(actual).toMatchObject({
    status: expected.status,
    coins: expected.coins,
    baseHp: expected.baseHp,
    killedCount: expected.killedCount,
    escapedCount: expected.escapedCount,
  });
}
