import { describe, it, expect } from "vitest";
import { clamp, rectsOverlap } from "../src/utils";
import { CONFIG } from "../src/constants";
import { createDefaultHero, applyDamageToHero, gainExp, computeScore } from "../src/systems/HeroLogic";

// 边界用例，全部调用真实实现。

describe("utils.clamp（真实）", () => {
  it("夹取上下界", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(5, 0, 10)).toBe(5);
  });
});

describe("utils.rectsOverlap（真实）— 缩小受击盒边界", () => {
  // 敌人受击盒 = (x+6, y+4, w-12, h-8)，普通敌 72x76
  const enemyHitbox = (x: number, y: number) => ({
    x: x + 6,
    y: y + 4,
    width: Math.max(8, 72 - 12),
    height: Math.max(8, 76 - 8),
  });

  it("子弹贴边命中", () => {
    const hb = enemyHitbox(200, CONFIG.GROUND_Y - 76);
    const bullet = { x: hb.x - 29, y: hb.y, width: 30, height: 12 };
    expect(rectsOverlap(bullet, hb)).toBe(true);
  });

  it("子弹差 1px 不命中", () => {
    const hb = enemyHitbox(200, CONFIG.GROUND_Y - 76);
    const bullet = { x: hb.x - 30, y: hb.y, width: 30, height: 12 };
    expect(rectsOverlap(bullet, hb)).toBe(false);
  });

  it("飞行高度不与地面障碍重叠", () => {
    const heroBox = { x: 96, y: 180, width: 90, height: 96 };
    const obstacle = { x: 100, y: CONFIG.GROUND_Y - 64, width: 76, height: 64 };
    expect(rectsOverlap(heroBox, obstacle)).toBe(false);
  });
});

describe("HeroLogic 受击边界（真实）", () => {
  it("护甲连续消耗：2甲3血，逐次受击（跨无敌）→ 甲0 血扣", () => {
    const h = createDefaultHero();
    h.life = 3;
    h.armor = 2;
    h.invulnerableMs = 100;
    applyDamageToHero(h, 1, 0); // 甲2→1
    expect(h.armor).toBe(1);
    applyDamageToHero(h, 1, 200); // 甲1→0
    expect(h.armor).toBe(0);
    expect(h.life).toBe(3);
    applyDamageToHero(h, 1, 400); // 血3→2
    expect(h.life).toBe(2);
  });

  it("1 血 0 甲受 1 伤即死", () => {
    const h = createDefaultHero();
    h.life = 1;
    expect(applyDamageToHero(h, 1, 0)).toBe(true);
    expect(h.life).toBe(0);
  });
});

describe("HeroLogic 经验/得分边界（真实）", () => {
  it("满倍经验取整：count3 → ×1.6 → round(5*1.6)=8", () => {
    const h = createDefaultHero();
    h.expBoostCount = 3;
    h.nextLevelExp = 1e9;
    gainExp(h, 5);
    expect(h.exp).toBe(8);
  });

  it("0 距离 0 得分", () => {
    expect(computeScore(0, 0, 1)).toBe(100); // 等级分 1*100
  });

  it("组合得分", () => {
    expect(computeScore(3000, 1200, 8)).toBe(3000 * 10 + 1200 + 800);
  });
});

describe("速度档位（真实 CONFIG + clamp）", () => {
  const speedAt = (meters: number) =>
    clamp(
      CONFIG.INITIAL_SPEED + Math.floor(meters / CONFIG.SPEED_MILESTONE_INTERVAL) * CONFIG.SPEED_STEP,
      CONFIG.INITIAL_SPEED,
      CONFIG.MAX_SPEED
    );

  it("0m=2.5, 800m=2.8, 2400m=3.4", () => {
    expect(speedAt(0)).toBeCloseTo(2.5, 5);
    expect(speedAt(800)).toBeCloseTo(2.8, 5);
    expect(speedAt(2400)).toBeCloseTo(3.4, 5);
  });

  it("极远封顶 8.0", () => {
    expect(speedAt(999999)).toBe(8);
  });
});
