import { test, expect, Page } from "@playwright/test";
import { bootToMenu, startGame, resetStage, tick, tap } from "./helpers";

// 调用真实 applyUpgrade（私有方法，运行期可访问），驱动技能效果
async function applyUpgrade(page: Page, id: string, name = id): Promise<void> {
  await page.evaluate(
    (c) => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").applyUpgrade(c),
    { id, name }
  );
}
test.beforeEach(async ({ page }) => {
  await bootToMenu(page);
  await startGame(page);
  await resetStage(page);
});

test("TC-SK-001 火力升级: fireLevel+1 且射击数随之 (E2E-skill-fireup)", async ({ page }) => {
  await applyUpgrade(page, "fire-up", "火力升级");
  const fl = await page.evaluate(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero.fireLevel);
  expect(fl).toBe(2);
  await page.evaluate(() => { (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").lastShootAt = -1e9; });
  const b0 = await page.evaluate(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").playerProjectiles.length);
  await tap(page, "K");
  await tick(page, 80);
  const b1 = await page.evaluate(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").playerProjectiles.length);
  expect(b1 - b0).toBe(2);
});

test("TC-SK-002 射速升级: 冷却 -20ms (E2E-skill-shootspeed)", async ({ page }) => {
  await applyUpgrade(page, "shoot-speed", "射速升级");
  const cd = await page.evaluate(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero.shootCooldownMs);
  expect(cd).toBe(180);
});

test("TC-SK-003 子弹强化: 伤害 +1 (E2E-skill-bulletboost)", async ({ page }) => {
  await applyUpgrade(page, "bullet-boost", "子弹强化");
  const bonus = await page.evaluate(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero.bulletDamageBonus);
  expect(bonus).toBe(1);
  await page.evaluate(() => { (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").lastShootAt = -1e9; });
  await tap(page, "K");
  await tick(page, 60);
  const dmg = await page.evaluate(() => {
    const ps = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").playerProjectiles;
    return ps.length ? ps[ps.length - 1].getData("damage") : null;
  });
  expect(dmg).toBe(2);
});

test("TC-SK-004 导弹补给: +5 (E2E-skill-missile)", async ({ page }) => {
  const m0 = await page.evaluate(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero.missileCount);
  await applyUpgrade(page, "missile-supply", "导弹补给");
  const m1 = await page.evaluate(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero.missileCount);
  expect(m1 - m0).toBe(5);
});

test("TC-SK-006 生命提升: maxLife+1, life+1 (E2E-skill-lifeup)", async ({ page }) => {
  await page.evaluate(() => { const h = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero; h.maxLife = 3; h.life = 3; });
  await applyUpgrade(page, "life-up", "生命提升");
  const s = await page.evaluate(() => { const h = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero; return { maxLife: h.maxLife, life: h.life }; });
  expect(s.maxLife).toBe(4);
  expect(s.life).toBe(4);
});

test("TC-SK-007 护甲装置: +2 且护盾可见 (E2E-skill-armor)", async ({ page }) => {
  await applyUpgrade(page, "armor-up", "护甲装置");
  await tick(page, 50);
  const s = await page.evaluate(() => {
    const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene");
    return { armor: gs.hero.armor, shield: gs.heroShield.visible };
  });
  expect(s.armor).toBe(2);
  expect(s.shield).toBe(true);
});

test("TC-SK-008 紧急修复: 回 2 血不超上限 (E2E-skill-repair)", async ({ page }) => {
  await page.evaluate(() => { const h = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero; h.maxLife = 5; h.life = 1; });
  await applyUpgrade(page, "emergency-repair", "紧急修复");
  const life = await page.evaluate(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero.life);
  expect(life).toBe(3);
});

test("TC-SK-009 韧性提升: 无敌 +100ms (E2E-skill-resilience)", async ({ page }) => {
  await applyUpgrade(page, "resilience", "韧性提升");
  const inv = await page.evaluate(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero.invulnerableMs);
  expect(inv).toBe(400);
});

test("TC-SK-010 轻量化: 跳跃系数 *1.15 (E2E-skill-lightweight)", async ({ page }) => {
  await applyUpgrade(page, "lightweight", "轻量化");
  const s = await page.evaluate(() => { const h = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero; return { c: h.jumpScaleCount, m: h.jumpVelocityModifier }; });
  expect(s.c).toBe(1);
  expect(s.m).toBeCloseTo(1.15, 5);
});

test("TC-SK-011 飞行模块: 进入飞行态 (E2E-skill-flight)", async ({ page }) => {
  await applyUpgrade(page, "flight-module", "飞行模块");
  await tick(page, 60);
  const s = await page.evaluate(() => {
    const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene");
    return { flying: gs.hero.isFlying, y: gs.heroSprite.y, tex: gs.heroSprite.texture.key };
  });
  expect(s.flying).toBe(true);
  expect(s.y).toBe(180);
  expect(s.tex).toBe("heroFly");
});

test("TC-SK-012 飞行续航: +3s (E2E-skill-flightendurance)", async ({ page }) => {
  await applyUpgrade(page, "flight-endurance", "飞行续航");
  const d = await page.evaluate(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero.flightDurationMs);
  expect(d).toBe(13000);
});

test("TC-SK-013 起跳喷射: 系数 *1.1 (E2E-skill-jumpjet)", async ({ page }) => {
  await applyUpgrade(page, "jump-jet", "起跳喷射");
  const s = await page.evaluate(() => { const h = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero; return { c: h.jumpBoostCount, m: h.jumpVelocityModifier }; });
  expect(s.c).toBe(1);
  expect(s.m).toBeCloseTo(1.1, 5);
});

test("TC-SK-014 经验增幅: 倍率提升 (E2E-skill-expboost)", async ({ page }) => {
  await applyUpgrade(page, "exp-boost", "经验增幅");
  const c = await page.evaluate(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero.expBoostCount);
  expect(c).toBe(1);
  // 真实经验获取走 heroGainExp（含倍率 round(5*1.2)=6）
  const gained = await page.evaluate(() => {
    const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene");
    gs.hero.exp = 0; gs.hero.level = 99; gs.hero.nextLevelExp = 1e9;
    gs.heroGainExp(5);
    return gs.hero.exp;
  });
  expect(gained).toBe(6);
});

test("TC-SK-016 赏金模块: 计数提升 (E2E-skill-bounty)", async ({ page }) => {
  await applyUpgrade(page, "bounty-module", "赏金模块");
  const c = await page.evaluate(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero.bountyCount);
  expect(c).toBe(1);
});
