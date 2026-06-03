export const CONFIG = {
  BASE_WIDTH: 1024,
  BASE_HEIGHT: 560,
  GROUND_Y: 400,
  INITIAL_SPEED: 2.5,
  MAX_SPEED: 8,
  SPEED_MILESTONE_INTERVAL: 800,
  SPEED_STEP: 0.3,
  // 里程换算：meters += gameSpeed * deltaMs * DISTANCE_FACTOR。
  // 取 0.006 使基础速度(2.5)约 15 m/s，1200m≈80s，契合 PRD「Boss 1200m 或 90s」的节奏锚点，
  // 让 300m 精英 / 800m 提速 / 1200m Boss 等里程碑成为有意义的阶段节点（原 0.105 约 262 m/s 过快）。
  DISTANCE_FACTOR: 0.006,
  GRAVITY: 0.4,
  JUMP_VELOCITY: -12,
  SHOOT_COOLDOWN_MS: 200,
  MISSILE_COOLDOWN_MS: 1500,
  INVULNERABLE_MS: 300,
  DEFAULT_FLIGHT_MS: 10000,
  MAX_FLIGHT_MS: 19000,
  HERO_X: 96,
};

export enum GameState {
  START = 0,
  PLAYING = 1,
  PAUSED = 2,
  GAMEOVER = 3,
  LEVELUP = 4,
}
