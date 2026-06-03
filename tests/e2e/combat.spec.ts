import { test, expect, Page } from "@playwright/test";
import { bootToMenu, startGame, resetStage, tick, tap } from "./helpers";

// 受控生成：在指定位置放一个静止（speedScale=0）实体，便于确定性命中/碰撞
async function place(page: Page, type: string, x: number, hp?: number): Promise<void> {
  await page.evaluate(
    (a) => {
      const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene");
      const d = gs.encounterDirector;
      const m: Record<string, string> = { enemy: "spawnEnemy", elite: "spawnElite", boss: "spawnBoss", obstacle: "spawnObstacle" };
      const e = d[m[a.type]](a.x);
      e.setData("speedScale", 0);
      if (typeof a.hp === "number") { e.setData("hp", a.hp); e.setData("maxHp", a.hp); }
      gs.entities.push(e);
    },
    { type, x, hp }
  );
}
// 在 hero 处放一枚敌方弹（模拟 Boss 导弹命中）
async function placeEnemyMissile(page: Page): Promise<void> {
  await page.evaluate(() => {
    const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene");
    const hx = gs.heroSprite.x + 20, hy = gs.heroSprite.y + 40;
    const mi = gs.add.image(hx, hy, "missileBoss");
    mi.setOrigin(0, 0); mi.setDisplaySize(36, 16); mi.setDepth(15);
    mi.setData({ damage: 1, fromEnemy: true, explosive: false, penetrate: false, active: true });
    gs.enemyProjectiles.push(mi);
  });
}
const read = (page: Page, k: string) =>
  page.evaluate((key) => {
    const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene");
    const map: Record<string, any> = {
      kill: gs.killCount, boss: gs.bossKillCount, exp: gs.hero.exp, life: gs.hero.life,
      armor: gs.hero.armor, hitstop: gs.hitStopMs, entities: gs.entities.length,
      score: gs.getCurrentScore ? gs.getCurrentScore() : 0,
    };
    return map[key];
  }, k);

test.beforeEach(async ({ page }) => {
  await bootToMenu(page);
  await startGame(page);
  await resetStage(page, { life: 99 });
  await page.evaluate(() => { (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").lastShootAt = -1e9; });
});

test("TC-DM-001 子弹击杀普通敌, 经验+5 (E2E-dmg-bullet)", async ({ page }) => {
  const k0 = await read(page, "kill");
  const e0 = await read(page, "exp");
  await place(page, "enemy", 96 + 220, 1);
  await tap(page, "K");
  await page.waitForFunction((k) => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").killCount > k, k0, { timeout: 4000 });
  expect(await read(page, "kill")).toBe(k0 + 1);
  expect((await read(page, "exp")) - e0).toBe(5);
});

test("TC-DM-002 子弹强化一击秒精英 (E2E-dmg-bullet-elite)", async ({ page }) => {
  await page.evaluate(() => { const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene"); gs.hero.bulletDamageBonus = 3; gs.lastShootAt = -1e9; });
  const k0 = await read(page, "kill");
  await place(page, "elite", 96 + 220, 3);
  await tap(page, "K");
  await page.waitForFunction((k) => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").killCount > k, k0, { timeout: 4000 });
  expect(await read(page, "kill")).toBe(k0 + 1);
});

test("TC-DM-003 导弹穿透击杀两敌 (E2E-dmg-missile-pierce)", async ({ page }) => {
  await page.evaluate(() => { const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene"); gs.hero.missileCount = 3; gs.lastMissileAt = -1e9; });
  const k0 = await read(page, "kill");
  await place(page, "enemy", 96 + 200, 1);
  await place(page, "enemy", 96 + 320, 1);
  await tap(page, "L");
  await page.waitForFunction((k) => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").killCount >= k + 2, k0, { timeout: 4000 });
  expect(await read(page, "kill")).toBeGreaterThanOrEqual(k0 + 2);
});

test("TC-DM-004 爆裂弹头范围伤害 (E2E-dmg-explosive)", async ({ page }) => {
  await page.evaluate(() => { const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene"); gs.hero.missileCount = 3; gs.hero.hasExplosiveMissiles = true; gs.lastMissileAt = -1e9; gs.hero.nextLevelExp = 1e9; });
  const k0 = await read(page, "kill");
  // 三敌聚集在 74px 半径内
  await place(page, "enemy", 96 + 300, 1);
  await place(page, "enemy", 96 + 330, 1);
  await place(page, "enemy", 96 + 360, 1);
  await tap(page, "L");
  await page.waitForFunction((k) => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").killCount >= k + 3, k0, { timeout: 4000 });
  expect(await read(page, "kill")).toBeGreaterThanOrEqual(k0 + 3);
});

test("TC-DM-006 护甲优先抵扣 (E2E-dmg-armor)", async ({ page }) => {
  // 设超长无敌窗，确保只发生一次受击，断言与观测时序解耦
  await page.evaluate(() => { const h = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero; h.life = 3; h.armor = 2; h.invulnerableUntil = 0; h.invulnerableMs = 1e9; });
  await place(page, "enemy", 96, 1); // 与 hero 重叠
  await page.waitForFunction(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero.armor < 2, null, { timeout: 3000 });
  expect(await read(page, "armor")).toBe(1);
  expect(await read(page, "life")).toBe(3);
});

test("TC-DM-007 护甲耗尽后扣血 (E2E-dmg-armor-deplete)", async ({ page }) => {
  await page.evaluate(() => { const h = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero; h.life = 3; h.armor = 1; h.invulnerableUntil = 0; h.invulnerableMs = 300; });
  await place(page, "enemy", 96, 1);
  // 第一次受击：护甲先扣（armor 1→0，life 不变）
  await page.waitForFunction(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero.armor === 0, null, { timeout: 3000 });
  expect(await read(page, "life")).toBe(3);
  // 跨越无敌窗口后第二次受击：扣血
  await page.waitForFunction(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero.life < 3, null, { timeout: 3000 });
  expect(await read(page, "life")).toBe(2);
});

test("TC-DM-008 / TC-CO-010 受击无敌防叠加 (E2E-col-multi)", async ({ page }) => {
  // 超长无敌窗：首次受击后所有后续/同帧接触均被屏蔽，掉血恒为 1
  await page.evaluate(() => { const h = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero; h.life = 5; h.armor = 0; h.invulnerableUntil = 0; h.invulnerableMs = 1e9; });
  await place(page, "enemy", 92, 1);
  await place(page, "enemy", 100, 1); // 同帧两敌
  await page.waitForFunction(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero.life < 5, null, { timeout: 3000 });
  await tick(page, 200); // 持续接触下不再叠加
  expect(await read(page, "life")).toBe(4); // 仅掉 1
});

test("TC-DM-009 / TC-CO-008 Boss 导弹伤害 (E2E-dmg-bossmissile)", async ({ page }) => {
  await page.evaluate(() => { const h = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero; h.life = 5; h.armor = 0; h.invulnerableUntil = 0; });
  await placeEnemyMissile(page);
  await page.waitForFunction(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero.life < 5, null, { timeout: 3000 });
  expect(await read(page, "life")).toBe(4);
});

test("TC-DM-010 / TC-CO-001 障碍碰撞 + 停顿 (E2E-col-obstacle)", async ({ page }) => {
  await page.evaluate(() => { const h = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero; h.life = 5; h.armor = 0; h.invulnerableUntil = 0; h.isFlying = false; });
  await place(page, "obstacle", 96);
  await page.waitForFunction(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero.life < 5, null, { timeout: 3000 });
  expect(await read(page, "life")).toBe(4);
  expect(await read(page, "hitstop")).toBeGreaterThan(500);
});

test("TC-CO-002 跳跃顶点不被地面障碍碰撞 (E2E-col-jumpover)", async ({ page }) => {
  await page.evaluate(() => { const h = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero; h.life = 5; h.invulnerableUntil = 0; });
  await page.keyboard.down("Space");
  await page.waitForFunction(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").heroSprite.y < 200, null, { timeout: 2000 });
  await place(page, "obstacle", 96); // 角色在高空时放地面障碍
  await tick(page, 60);
  await page.keyboard.up("Space");
  expect(await read(page, "life")).toBe(5); // 未受伤
});

test("TC-CO-003 飞行无视地面障碍 (E2E-col-flyover)", async ({ page }) => {
  await page.evaluate(() => { const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene"); gs.hero.life = 5; gs.hero.invulnerableUntil = 0; gs.applyUpgrade({ id: "flight-module", name: "飞行模块" }); });
  await tick(page, 60);
  await place(page, "obstacle", 96);
  await tick(page, 200);
  expect(await read(page, "life")).toBe(5);
});

test("TC-CO-004 角色撞普通敌受伤, 敌不消失 (E2E-col-enemy)", async ({ page }) => {
  await page.evaluate(() => { const h = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero; h.life = 5; h.armor = 0; h.invulnerableUntil = 0; h.invulnerableMs = 1e9; });
  await place(page, "enemy", 96, 1);
  await page.waitForFunction(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero.life < 5, null, { timeout: 3000 });
  expect(await read(page, "life")).toBe(4);
  expect(await read(page, "entities")).toBeGreaterThan(0); // 敌仍在
});

test("TC-CO-007 / TC-GP-010 子弹不伤障碍 (E2E-col-bullet-obstacle)", async ({ page }) => {
  const k0 = await read(page, "kill");
  await place(page, "obstacle", 96 + 200);
  await tap(page, "K");
  await tick(page, 600);
  // 障碍不可摧毁、不计击杀；障碍仍在场
  expect(await read(page, "kill")).toBe(k0);
  expect(await read(page, "entities")).toBeGreaterThan(0);
});
