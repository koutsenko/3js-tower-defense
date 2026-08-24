export const STARTING_COINS = 100;
export const TOWER_COST = 50;
export const PREPARATION_DURATION = 20;
export const STARTING_BASE_HP = 3;
export const WAVE_SIZE = 10;
export const SPAWN_INTERVAL = 2;
export const MONSTER_HP = 100;
export const MONSTER_SPEED = 1;
export const TOWER_RANGE = 3;
export const SHOT_COOLDOWN = 1;
export const PROJECTILE_DAMAGE = 25;
export const KILL_REWARD = 10;
export const PROJECTILE_SPEED = 8;

export interface GameConfig {
  readonly STARTING_COINS: number;
  readonly TOWER_COST: number;
  readonly PREPARATION_DURATION: number;
  readonly STARTING_BASE_HP: number;
  readonly WAVE_SIZE: number;
  readonly SPAWN_INTERVAL: number;
  readonly MONSTER_HP: number;
  readonly MONSTER_SPEED: number;
  readonly TOWER_RANGE: number;
  readonly SHOT_COOLDOWN: number;
  readonly PROJECTILE_DAMAGE: number;
  readonly KILL_REWARD: number;
  readonly PROJECTILE_SPEED: number;
}

export const gameConfig: Readonly<GameConfig> = Object.freeze({
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
});
