import { describe, it, expect } from "vitest";
import {
  createDefaultHero,
  applyDamageToHero,
  gainExp,
  expMultiplier,
  killScoreMultiplier,
  computeScore,
  applyUpgradeStats,
} from "../src/systems/HeroLogic";

// 直接测试真实实现（HeroLogic），不重写逻辑。

describe("createDefaultHero", () => {
  it("符合 PRD 初始属性", () => {
    const h = createDefaultHero();
    expect(h.life).toBe(3);
    expect(h.maxLife).toBe(3);
    expect(h.fireLevel).toBe(1);
    expect(h.missileCount).toBe(0);
    expect(h.shootCooldownMs).toBe(200);
    expect(h.invulnerableMs).toBe(300);
    expect(h.nextLevelExp).toBe(10);
    expect(h.jumpVelocityModifier).toBe(1);
  });
});

describe("applyDamageToHero（真实受击结算）", () => {
  it("护甲优先抵扣：armor 2 受 1 伤 → armor1 life3", () => {
    const h = createDefaultHero();
    h.armor = 2;
    const dead = applyDamageToHero(h, 1, 1000);
    expect(h.armor).toBe(1);
    expect(h.life).toBe(3);
    expect(dead).toBe(false);
  });

  it("部分抵扣：armor1 受 3 伤 → armor0 life1（旧测此处模型错误）", () => {
    const h = createDefaultHero();
    h.armor = 1;
    applyDamageToHero(h, 3, 1000);
    expect(h.armor).toBe(0);
    expect(h.life).toBe(1);
  });

  it("无护甲扣血", () => {
    const h = createDefaultHero();
    applyDamageToHero(h, 1, 1000);
    expect(h.life).toBe(2);
  });

  it("致死返回 true 且 life 夹到 0", () => {
    const h = createDefaultHero();
    h.life = 1;
    const dead = applyDamageToHero(h, 5, 1000);
    expect(dead).toBe(true);
    expect(h.life).toBe(0);
  });

  it("无敌窗口内不受伤", () => {
    const h = createDefaultHero();
    applyDamageToHero(h, 1, 1000); // 触发无敌至 1300
    expect(h.life).toBe(2);
    const dead = applyDamageToHero(h, 1, 1100); // 仍在无敌
    expect(dead).toBe(false);
    expect(h.life).toBe(2);
  });

  it("无敌结束后可再次受伤", () => {
    const h = createDefaultHero();
    applyDamageToHero(h, 1, 1000);
    applyDamageToHero(h, 1, 1400); // 超出 300ms 无敌
    expect(h.life).toBe(1);
  });
});

describe("gainExp / 倍率（真实经验逻辑）", () => {
  it("基础经验入账", () => {
    const h = createDefaultHero();
    h.nextLevelExp = 1e9;
    gainExp(h, 5);
    expect(h.exp).toBe(5);
  });

  it("经验增幅取整：count2 → ×1.4 → round(5*1.4)=7", () => {
    const h = createDefaultHero();
    h.expBoostCount = 2;
    h.nextLevelExp = 1e9;
    expect(expMultiplier(h)).toBeCloseTo(1.4, 5);
    gainExp(h, 5);
    expect(h.exp).toBe(7);
  });

  it("精确达阈升一级", () => {
    const h = createDefaultHero(); // nextLevelExp 10
    const levels = gainExp(h, 10);
    expect(levels).toBe(1);
    expect(h.level).toBe(2);
    expect(h.exp).toBe(0);
    expect(h.nextLevelExp).toBe(20);
  });

  it("大额经验连升多级", () => {
    const h = createDefaultHero();
    const levels = gainExp(h, 60); // 10+20+30=60
    expect(levels).toBe(3);
    expect(h.level).toBe(4);
    expect(h.exp).toBe(0);
  });

  it("差 1 点不升级", () => {
    const h = createDefaultHero();
    const levels = gainExp(h, 9);
    expect(levels).toBe(0);
    expect(h.level).toBe(1);
  });
});

describe("computeScore / killScoreMultiplier", () => {
  it("得分公式：1500m,500,5 → 16000", () => {
    expect(computeScore(1500, 500, 5)).toBe(16000);
  });

  it("赏金倍率：count2 → ×1.5", () => {
    const h = createDefaultHero();
    h.bountyCount = 2;
    expect(killScoreMultiplier(h)).toBeCloseTo(1.5, 5);
  });
});

describe("applyUpgradeStats（真实升级应用 + 上限）", () => {
  it("火力升级递增并封顶 5", () => {
    const h = createDefaultHero();
    for (let i = 0; i < 10; i++) applyUpgradeStats(h, "fire-up");
    expect(h.fireLevel).toBe(5);
  });

  it("射速 -20ms 且不低于 100", () => {
    const h = createDefaultHero();
    applyUpgradeStats(h, "shoot-speed");
    expect(h.shootCooldownMs).toBe(180);
    for (let i = 0; i < 20; i++) applyUpgradeStats(h, "shoot-speed");
    expect(h.shootCooldownMs).toBe(100);
  });

  it("子弹强化封顶 +4", () => {
    const h = createDefaultHero();
    for (let i = 0; i < 10; i++) applyUpgradeStats(h, "bullet-boost");
    expect(h.bulletDamageBonus).toBe(4);
  });

  it("导弹补给 +5 无上限", () => {
    const h = createDefaultHero();
    applyUpgradeStats(h, "missile-supply");
    applyUpgradeStats(h, "missile-supply");
    expect(h.missileCount).toBe(10);
  });

  it("生命提升 maxLife/life 同增", () => {
    const h = createDefaultHero();
    applyUpgradeStats(h, "life-up");
    expect(h.maxLife).toBe(4);
    expect(h.life).toBe(4);
  });

  it("护甲 +2 封顶 10", () => {
    const h = createDefaultHero();
    for (let i = 0; i < 10; i++) applyUpgradeStats(h, "armor-up");
    expect(h.armor).toBe(10);
  });

  it("紧急修复回 2 不超上限", () => {
    const h = createDefaultHero();
    h.life = 1;
    applyUpgradeStats(h, "emergency-repair");
    expect(h.life).toBe(3); // maxLife 3
  });

  it("韧性 +100ms 封顶 800", () => {
    const h = createDefaultHero();
    for (let i = 0; i < 10; i++) applyUpgradeStats(h, "resilience");
    expect(h.invulnerableMs).toBe(800);
  });

  it("轻量化/起跳喷射乘法叠加", () => {
    const h = createDefaultHero();
    applyUpgradeStats(h, "lightweight"); // ×1.15
    applyUpgradeStats(h, "jump-jet"); // ×1.1
    expect(h.jumpVelocityModifier).toBeCloseTo(1.15 * 1.1, 5);
    expect(h.jumpScaleCount).toBe(1);
    expect(h.jumpBoostCount).toBe(1);
  });

  it("飞行模块进入飞行态", () => {
    const h = createDefaultHero();
    applyUpgradeStats(h, "flight-module");
    expect(h.isFlying).toBe(true);
    expect(h.isJumping).toBe(false);
    expect(h.flightRemainingMs).toBe(h.flightDurationMs);
  });

  it("飞行续航 +3s 封顶 19s", () => {
    const h = createDefaultHero();
    for (let i = 0; i < 10; i++) applyUpgradeStats(h, "flight-endurance");
    expect(h.flightDurationMs).toBe(19000);
  });

  it("经验/幸运/赏金计数封顶", () => {
    const h = createDefaultHero();
    for (let i = 0; i < 10; i++) {
      applyUpgradeStats(h, "exp-boost");
      applyUpgradeStats(h, "lucky-search");
      applyUpgradeStats(h, "bounty-module");
    }
    expect(h.expBoostCount).toBe(3);
    expect(h.luckyCount).toBe(2);
    expect(h.bountyCount).toBe(3);
  });

  it("爆裂弹头置位", () => {
    const h = createDefaultHero();
    applyUpgradeStats(h, "explosive-warhead");
    expect(h.hasExplosiveMissiles).toBe(true);
  });
});
