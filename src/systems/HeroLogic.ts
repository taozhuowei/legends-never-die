import { CONFIG } from "../constants";
import { HeroStats } from "../types";
import { clamp } from "../utils";

// 英雄核心数值逻辑（纯函数）：从 GameScene 抽出，供 GameScene 与单测共用，避免测试重写实现。
// 仅涉及数据计算；精灵/场景副作用仍由 GameScene 负责。

export function createDefaultHero(): HeroStats {
  return {
    fireLevel: 1,
    shootCooldownMs: CONFIG.SHOOT_COOLDOWN_MS,
    bulletDamageBonus: 0,
    missileCount: 0,
    hasExplosiveMissiles: false,
    maxLife: 3,
    life: 3,
    armor: 0,
    invulnerableMs: CONFIG.INVULNERABLE_MS,
    invulnerableUntil: 0,
    velocityY: 0,
    flightRemainingMs: CONFIG.DEFAULT_FLIGHT_MS,
    jumpScaleCount: 0,
    jumpBoostCount: 0,
    jumpVelocityModifier: 1,
    flightDurationMs: CONFIG.DEFAULT_FLIGHT_MS,
    expBoostCount: 0,
    luckyCount: 0,
    bountyCount: 0,
    isFlying: false,
    isJumping: false,
    level: 1,
    exp: 0,
    nextLevelExp: 10,
    upgradeHistory: [],
  };
}

export function expMultiplier(hero: HeroStats): number {
  return 1 + hero.expBoostCount * 0.2;
}

export function killScoreMultiplier(hero: HeroStats): number {
  return 1 + hero.bountyCount * 0.25;
}

// 受击结算：护甲优先抵扣，受击后进入无敌窗口；无敌期内返回 false 且不掉血。返回是否致死。
export function applyDamageToHero(hero: HeroStats, amount: number, nowMs: number): boolean {
  if (nowMs < hero.invulnerableUntil) return false;
  hero.invulnerableUntil = nowMs + hero.invulnerableMs;

  let pending = amount;
  if (hero.armor > 0) {
    const absorbed = Math.min(hero.armor, pending);
    hero.armor -= absorbed;
    pending -= absorbed;
  }
  if (pending > 0) {
    hero.life = Math.max(0, hero.life - pending);
  }
  return hero.life <= 0;
}

// 获得经验（含倍率取整），处理连续升级，返回本次升级次数。
export function gainExp(hero: HeroStats, rawAmount: number): number {
  hero.exp += Math.round(rawAmount * expMultiplier(hero));
  let levels = 0;
  while (hero.exp >= hero.nextLevelExp) {
    hero.exp -= hero.nextLevelExp;
    hero.level += 1;
    hero.nextLevelExp = hero.level * 10;
    levels += 1;
  }
  return levels;
}

// 最终得分公式：距离分 + 击杀分 + 等级分（Boss 分已并入 killScore）。
export function computeScore(meters: number, killScore: number, level: number): number {
  return Math.floor(meters) * 10 + Math.round(killScore) + level * 100;
}

// 升级的纯属性变更（按卡片 id）。飞行的精灵落位、构筑历史由 GameScene 另行处理。
export function applyUpgradeStats(hero: HeroStats, id: string): void {
  switch (id) {
    case "fire-up":
      hero.fireLevel = Math.min(5, hero.fireLevel + 1);
      break;
    case "shoot-speed":
      hero.shootCooldownMs = Math.max(100, hero.shootCooldownMs - 20);
      break;
    case "bullet-boost":
      hero.bulletDamageBonus = Math.min(4, hero.bulletDamageBonus + 1);
      break;
    case "missile-supply":
      hero.missileCount += 5;
      break;
    case "explosive-warhead":
      hero.hasExplosiveMissiles = true;
      break;
    case "life-up":
      hero.maxLife += 1;
      hero.life = Math.min(hero.maxLife, hero.life + 1);
      break;
    case "armor-up":
      hero.armor = clamp(hero.armor + 2, 0, 10);
      break;
    case "emergency-repair":
      hero.life = clamp(hero.life + 2, 0, hero.maxLife);
      break;
    case "resilience":
      hero.invulnerableMs = Math.min(800, hero.invulnerableMs + 100);
      break;
    case "lightweight":
      hero.jumpScaleCount += 1;
      hero.jumpVelocityModifier *= 1.15;
      break;
    case "flight-module":
      hero.isFlying = true;
      hero.isJumping = false;
      hero.velocityY = 0;
      hero.flightRemainingMs = hero.flightDurationMs;
      break;
    case "flight-endurance":
      hero.flightDurationMs = Math.min(CONFIG.MAX_FLIGHT_MS, hero.flightDurationMs + 3000);
      break;
    case "jump-jet":
      hero.jumpBoostCount += 1;
      hero.jumpVelocityModifier *= 1.1;
      break;
    case "exp-boost":
      hero.expBoostCount = Math.min(3, hero.expBoostCount + 1);
      break;
    case "lucky-search":
      hero.luckyCount = Math.min(2, hero.luckyCount + 1);
      break;
    case "bounty-module":
      hero.bountyCount = Math.min(3, hero.bountyCount + 1);
      break;
  }
}
