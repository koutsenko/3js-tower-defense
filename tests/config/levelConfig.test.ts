import { describe, expect, it } from 'vitest';

import {
  KILL_REWARD,
  MONSTER_HP,
  MONSTER_SPEED,
  PREPARATION_DURATION,
  PROJECTILE_DAMAGE,
  PROJECTILE_SPEED,
  SHOT_COOLDOWN,
  SPAWN_INTERVAL,
  STARTING_BASE_HP,
  STARTING_COINS,
  TOWER_COST,
  TOWER_RANGE,
  WAVE_SIZE,
  gameConfig,
} from '../../src/config/gameConfig';
import { levelConfig } from '../../src/config/levelConfig';
import { getCellKey, isCellWithinGrid } from '../../src/game/grid';

describe('level configuration (FR-002, FR-003, AC-015)', () => {
  it('matches the approved grid, route, entrance, and exit', () => {
    expect({
      width: levelConfig.width,
      height: levelConfig.height,
      cellSize: levelConfig.cellSize,
      entrance: levelConfig.entrance,
      exit: levelConfig.exit,
      routeWaypoints: levelConfig.routeWaypoints,
    }).toEqual({
      width: 12,
      height: 8,
      cellSize: 1,
      entrance: { x: 0, y: 1 },
      exit: { x: 11, y: 6 },
      routeWaypoints: [
        { x: 0, y: 1 },
        { x: 8, y: 1 },
        { x: 8, y: 4 },
        { x: 3, y: 4 },
        { x: 3, y: 6 },
        { x: 11, y: 6 },
      ],
    });
  });

  it('produces a continuous 26-cell centerline with 27 unique route cells', () => {
    expect(levelConfig.routeLength).toBe(26);
    expect(levelConfig.routeCells).toHaveLength(27);
    expect(new Set(levelConfig.routeCells.map(getCellKey)).size).toBe(27);

    for (let index = 1; index < levelConfig.routeCells.length; index += 1) {
      const previous = levelConfig.routeCells[index - 1]!;
      const current = levelConfig.routeCells[index]!;
      const distance =
        Math.abs(current.x - previous.x) + Math.abs(current.y - previous.y);

      expect(distance).toBe(1);
    }
  });

  it('partitions all grid cells into disjoint route and buildable sets', () => {
    const routeKeys = new Set(levelConfig.routeCells.map(getCellKey));
    const buildableKeys = new Set(levelConfig.buildableCells.map(getCellKey));

    expect(levelConfig.buildableCells).toHaveLength(69);
    expect(buildableKeys.size).toBe(69);
    expect([...routeKeys].some((key) => buildableKeys.has(key))).toBe(false);
    expect(routeKeys.size + buildableKeys.size).toBe(12 * 8);
    expect(
      [...levelConfig.routeCells, ...levelConfig.buildableCells].every((cell) =>
        isCellWithinGrid(cell, levelConfig.width, levelConfig.height),
      ),
    ).toBe(true);
  });
});

describe('balance configuration (FR-004–FR-010, FR-016)', () => {
  it('matches every approved balance value', () => {
    expect(gameConfig).toEqual({
      STARTING_COINS: 100,
      TOWER_COST: 50,
      PREPARATION_DURATION: 20,
      STARTING_BASE_HP: 3,
      WAVE_SIZE: 10,
      SPAWN_INTERVAL: 2,
      MONSTER_HP: 100,
      MONSTER_SPEED: 1,
      TOWER_RANGE: 3,
      SHOT_COOLDOWN: 1,
      PROJECTILE_DAMAGE: 25,
      KILL_REWARD: 10,
      PROJECTILE_SPEED: 8,
    });

    expect([
      STARTING_COINS,
      TOWER_COST,
      PREPARATION_DURATION,
      STARTING_BASE_HP,
      WAVE_SIZE,
      SPAWN_INTERVAL,
      MONSTER_HP,
      MONSTER_SPEED,
      TOWER_RANGE,
      SHOT_COOLDOWN,
      PROJECTILE_DAMAGE,
      KILL_REWARD,
      PROJECTILE_SPEED,
    ]).toEqual([100, 50, 20, 3, 10, 2, 100, 1, 3, 1, 25, 10, 8]);
  });
});
