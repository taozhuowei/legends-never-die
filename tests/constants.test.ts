import { describe, it, expect } from "vitest";
import { CONFIG, GameState } from "../src/constants";

describe("CONFIG constants", () => {
  it("has correct base resolution", () => {
    expect(CONFIG.BASE_WIDTH).toBe(1024);
    expect(CONFIG.BASE_HEIGHT).toBe(560);
  });

  it("has correct ground Y", () => {
    expect(CONFIG.GROUND_Y).toBe(400);
  });

  it("has correct speed parameters", () => {
    expect(CONFIG.INITIAL_SPEED).toBe(2.5);
    expect(CONFIG.MAX_SPEED).toBe(8);
    expect(CONFIG.SPEED_MILESTONE_INTERVAL).toBe(800);
    expect(CONFIG.SPEED_STEP).toBe(0.3);
  });

  it("max speed is greater than initial speed", () => {
    expect(CONFIG.MAX_SPEED).toBeGreaterThan(CONFIG.INITIAL_SPEED);
  });

  it("speed step is positive", () => {
    expect(CONFIG.SPEED_STEP).toBeGreaterThan(0);
  });

  it("has correct physics parameters", () => {
    expect(CONFIG.GRAVITY).toBe(0.4);
    expect(CONFIG.JUMP_VELOCITY).toBe(-12);
  });

  it("jump velocity is negative (upward)", () => {
    expect(CONFIG.JUMP_VELOCITY).toBeLessThan(0);
  });

  it("gravity is positive (downward)", () => {
    expect(CONFIG.GRAVITY).toBeGreaterThan(0);
  });

  it("has correct cooldown values", () => {
    expect(CONFIG.SHOOT_COOLDOWN_MS).toBe(200);
    expect(CONFIG.MISSILE_COOLDOWN_MS).toBe(1500);
  });

  it("missile cooldown is longer than shoot cooldown", () => {
    expect(CONFIG.MISSILE_COOLDOWN_MS).toBeGreaterThan(CONFIG.SHOOT_COOLDOWN_MS);
  });

  it("has correct invulnerability time", () => {
    expect(CONFIG.INVULNERABLE_MS).toBe(300);
  });

  it("has correct flight durations", () => {
    expect(CONFIG.DEFAULT_FLIGHT_MS).toBe(10000);
    expect(CONFIG.MAX_FLIGHT_MS).toBe(19000);
  });

  it("max flight is greater than default flight", () => {
    expect(CONFIG.MAX_FLIGHT_MS).toBeGreaterThan(CONFIG.DEFAULT_FLIGHT_MS);
  });

  it("has correct hero X position", () => {
    expect(CONFIG.HERO_X).toBe(96);
  });

  it("jump height is sufficient to clear obstacles", () => {
    const jumpHeight = (CONFIG.JUMP_VELOCITY * CONFIG.JUMP_VELOCITY) / (2 * CONFIG.GRAVITY);
    expect(jumpHeight).toBeGreaterThan(80);
  });

  it("jump duration is reasonable", () => {
    const jumpFrames = (-2 * CONFIG.JUMP_VELOCITY) / CONFIG.GRAVITY;
    expect(jumpFrames).toBeGreaterThan(20);
    expect(jumpFrames).toBeLessThan(120);
  });
});

describe("GameState enum", () => {
  it("has all expected states", () => {
    expect(GameState.START).toBe(0);
    expect(GameState.PLAYING).toBe(1);
    expect(GameState.PAUSED).toBe(2);
    expect(GameState.GAMEOVER).toBe(3);
    expect(GameState.LEVELUP).toBe(4);
  });

  it("each state has a unique value", () => {
    const values = Object.values(GameState).filter((v) => typeof v === "number");
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});
