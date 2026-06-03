import { test, expect } from "@playwright/test";
import { bootToMenu, startGame, resetStage, snapshot, tick, tap, STATE } from "./helpers";

const heroY = (page: import("@playwright/test").Page) =>
  page.evaluate(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").heroSprite.y);
const bulletCount = (page: import("@playwright/test").Page) =>
  page.evaluate(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").playerProjectiles.length);

test.beforeEach(async ({ page }) => {
  await bootToMenu(page);
});

test("E2E-menu-start: 菜单按 Enter 进入 PLAYING (TC-OP-012)", async ({ page }) => {
  await startGame(page);
  const s = await snapshot(page);
  expect(s.state).toBe(STATE.PLAYING);
  expect(s.heroY).toBeGreaterThan(0);
});

test("E2E-jump-basic: 按 Space 角色离地并回落 (TC-OP-001)", async ({ page }) => {
  await startGame(page);
  await resetStage(page);
  const baseY = await heroY(page);

  await page.keyboard.down("Space");
  let minY = baseY;
  for (let i = 0; i < 20; i++) {
    await tick(page, 40);
    const y = await heroY(page);
    if (y < minY) minY = y;
  }
  await page.keyboard.up("Space");
  expect(baseY - minY).toBeGreaterThan(60);

  await tick(page, 800);
  const endY = await heroY(page);
  expect(Math.abs(endY - baseY)).toBeLessThan(4);
});

test("E2E-jump-lock: 空中再按 Space 不二段跳 (TC-OP-002)", async ({ page }) => {
  await startGame(page);
  await resetStage(page);
  const baseY = await heroY(page);

  await tap(page, "Space");
  await tick(page, 140); // 上升中
  const midY = await heroY(page);
  expect(midY).toBeLessThan(baseY);

  await tap(page, "Space"); // 空中再按
  let minY = midY;
  for (let i = 0; i < 14; i++) {
    await tick(page, 40);
    const y = await heroY(page);
    if (y < minY) minY = y;
  }
  // 锁定时不会被重新顶到接近初速顶点（单跳顶点约 170px）
  expect(baseY - minY).toBeLessThan(190);
});

test("E2E-shoot: 按 K 发射 fireLevel 颗子弹 (TC-OP-003)", async ({ page }) => {
  await startGame(page);
  await resetStage(page);
  await page.evaluate(() => {
    (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").lastShootAt = -1e9;
  });
  const before = await bulletCount(page);
  await tap(page, "K");
  await page.waitForFunction((b) => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").playerProjectiles.length > b, before, { timeout: 3000 });
  const after = await bulletCount(page);
  const fireLevel = await page.evaluate(
    () => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero.fireLevel
  );
  expect(after - before).toBe(Math.min(fireLevel, 5));
});

test("E2E-shoot-cd: 冷却内重复按 K 不再发射 (TC-OP-004)", async ({ page }) => {
  await startGame(page);
  await resetStage(page);
  await page.evaluate(() => {
    const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene");
    gs.hero.shootCooldownMs = 5000;
    gs.lastShootAt = -1e9;
  });
  await tap(page, "K");
  await tick(page, 60);
  const c1 = await bulletCount(page);
  expect(c1).toBeGreaterThan(0); // 首发成功
  await tap(page, "K");
  await tick(page, 60);
  const c2 = await bulletCount(page);
  expect(c2).toBe(c1); // 冷却内不再发射
});

test("E2E-missile-empty: 导弹为 0 时按 L 不发射 (TC-OP-006)", async ({ page }) => {
  await startGame(page);
  await resetStage(page);
  await page.evaluate(() => {
    (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero.missileCount = 0;
  });
  const before = await bulletCount(page);
  await tap(page, "L");
  await tick(page, 80);
  const s = await snapshot(page);
  const after = await bulletCount(page);
  expect(after).toBe(before);
  expect(s.missile).toBe(0);
});

test("E2E-missile: 有库存时按 L 发射并扣减 (TC-OP-005)", async ({ page }) => {
  await startGame(page);
  await resetStage(page);
  await page.evaluate(() => {
    const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene");
    gs.hero.missileCount = 5;
    gs.lastMissileAt = -1e9;
  });
  const penBefore = await page.evaluate(
    () => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").playerProjectiles.filter((p: any) => p.getData("penetrate")).length
  );
  await tap(page, "L");
  await tick(page, 80);
  const penAfter = await page.evaluate(
    () => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").playerProjectiles.filter((p: any) => p.getData("penetrate")).length
  );
  const s = await snapshot(page);
  expect(penAfter - penBefore).toBe(1);
  expect(s.missile).toBe(4);
});

test("E2E-pause / E2E-resume: P 暂停与继续 (TC-OP-007/008)", async ({ page }) => {
  await startGame(page);
  await resetStage(page);
  await tap(page, "P");
  await page.waitForFunction(
    () => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").state === 2,
    null,
    { timeout: 5000 }
  );
  const paused = await page.evaluate(() => {
    const g = (globalThis as Record<string, any>).__GAME__;
    return { state: g.scene.getScene("GameScene").state, pauseActive: g.scene.isActive("PauseScene") };
  });
  expect(paused.state).toBe(STATE.PAUSED);
  expect(paused.pauseActive).toBe(true);

  await tap(page, "P");
  await page.waitForFunction(
    () => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").state === 1,
    null,
    { timeout: 5000 }
  );
  const resumed = await page.evaluate(() => {
    const g = (globalThis as Record<string, any>).__GAME__;
    return { state: g.scene.getScene("GameScene").state, pauseActive: g.scene.isActive("PauseScene") };
  });
  expect(resumed.state).toBe(STATE.PLAYING);
  expect(resumed.pauseActive).toBe(false);
});

// 将 base(1024x560) 坐标映射到画布屏幕坐标并点击
async function clickBase(page: import("@playwright/test").Page, bx: number, by: number) {
  const box = await page.locator("canvas").boundingBox();
  if (!box) throw new Error("no canvas");
  await page.mouse.click(box.x + (bx / 1024) * box.width, box.y + (by / 560) * box.height);
}

test("E2E-touch-jump: 点击跳跃按钮触发跳跃 (TC-OP-010)", async ({ page }) => {
  await startGame(page);
  await resetStage(page);
  const baseY = await heroY(page);
  await clickBase(page, 80, 560 - 56); // 跳跃按钮
  await page.waitForFunction(
    (y) => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").heroSprite.y < y - 30,
    baseY,
    { timeout: 3000 }
  );
  expect(await heroY(page)).toBeLessThan(baseY - 30);
});

test("E2E-touch-shoot: 点击射击按钮发射子弹 (TC-OP-010)", async ({ page }) => {
  await startGame(page);
  await resetStage(page);
  await page.evaluate(() => { (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").lastShootAt = -1e9; });
  const before = await bulletCount(page);
  await clickBase(page, 1024 - 150, 560 - 56); // 射击按钮
  await page.waitForFunction((b) => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").playerProjectiles.length > b, before, { timeout: 3000 });
  expect(await bulletCount(page)).toBeGreaterThan(before);
});

test("E2E-touch-missile: 点击导弹按钮发射导弹 (TC-OP-010)", async ({ page }) => {
  await startGame(page);
  await resetStage(page);
  await page.evaluate(() => { const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene"); gs.hero.missileCount = 5; gs.lastMissileAt = -1e9; });
  await clickBase(page, 1024 - 60, 560 - 56); // 导弹按钮
  await page.waitForFunction(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero.missileCount === 4, null, { timeout: 3000 });
  expect((await snapshot(page)).missile).toBe(4);
});

test("E2E-input-guard: 暂停态按 Space 不跳跃 (TC-OP-014)", async ({ page }) => {
  await startGame(page);
  await resetStage(page);
  await tap(page, "P");
  await page.waitForFunction(
    () => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").state === 2,
    null,
    { timeout: 5000 }
  );
  const y0 = await heroY(page);
  await tap(page, "Space");
  await tick(page, 220);
  const s = await snapshot(page);
  expect(s.heroY).toBe(y0);
  expect(s.isJumping).toBe(false);
});
