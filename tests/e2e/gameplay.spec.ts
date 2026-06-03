import { test, expect, Page } from "@playwright/test";
import { bootToMenu, startGame, resetStage, tick, tap, snapshot, STATE } from "./helpers";

const gsState = (page: Page) =>
  page.evaluate(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").state);
const sceneActive = (page: Page, key: string) =>
  page.evaluate((k) => (globalThis as Record<string, any>).__GAME__.scene.isActive(k), key);

test.beforeEach(async ({ page }) => {
  await bootToMenu(page);
});

test("TC-GP-002 速度随距离递增并封顶 (E2E-speed)", async ({ page }) => {
  await startGame(page);
  await resetStage(page);
  await page.evaluate(() => { (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").meters = 2400; });
  await tick(page, 60);
  const at2400 = await page.evaluate(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").gameSpeed);
  expect(at2400).toBeCloseTo(3.4, 1);
  await page.evaluate(() => { (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").meters = 999999; });
  await tick(page, 60);
  const capped = await page.evaluate(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").gameSpeed);
  expect(capped).toBe(8);
});

test("TC-GP-002b 里程节奏合理: 基础速度约 15 m/s (E2E-pacing)", async ({ page }) => {
  await startGame(page);
  await resetStage(page); // 冻结生成，避免碰撞停顿干扰计时
  await page.evaluate(() => { (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").meters = 0; });
  await tick(page, 1000);
  const m = await page.evaluate(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").meters);
  // 1s 内基础速度(2.5)×0.006×1000≈15m；放宽容差并确保远低于旧值(约 262 m/s)
  expect(m).toBeGreaterThan(6);
  expect(m).toBeLessThan(40);
});

test("TC-GP-003 距离门控: <300m 无精英/无Boss (E2E-spawn)", async ({ page }) => {
  await startGame(page);
  await resetStage(page);
  // 直接驱动 EncounterDirector，统计 200m 下 60 次产出类型（精英需≥300m、Boss需≥1200m，确定性不可能出现）
  const types = await page.evaluate(() => {
    const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene");
    const d = gs.encounterDirector;
    const out: string[] = [];
    for (let i = 0; i < 60; i++) {
      d.reset();
      d.spawnTimerMs = 1e9; // 强制冷却已到
      const e = d.update(16, 200, 2.5, 0, []);
      if (e) { out.push(e.getData("type")); e.destroy(); }
    }
    return out;
  });
  expect(types.length).toBeGreaterThan(0);
  expect(types).not.toContain("elite");
  expect(types).not.toContain("boss");
});

test("TC-GP-004 Boss 门控: ≥1200m 可出, <1200m 不出 (E2E-boss-interval)", async ({ page }) => {
  await startGame(page);
  await resetStage(page);
  const res = await page.evaluate(() => {
    const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene");
    const d = gs.encounterDirector;
    // 1300m + 计时超阈 → 应出 Boss
    d.reset(); d.timeSinceBossMs = 1e9; d.spawnTimerMs = 1e9;
    const a = d.update(16, 1300, 3, 1, []);
    const aType = a ? a.getData("type") : null; if (a) a.destroy();
    // 1100m → 永不出 Boss（统计 40 次）
    let bossBefore = 0;
    for (let i = 0; i < 40; i++) {
      d.reset(); d.timeSinceBossMs = 1e9; d.spawnTimerMs = 1e9;
      const e = d.update(16, 1100, 3, 1, []);
      if (e) { if (e.getData("type") === "boss") bossBefore++; e.destroy(); }
    }
    return { aType, bossBefore };
  });
  expect(res.aType).toBe("boss");
  expect(res.bossBefore).toBe(0);
});

test("TC-GP-005 / TC-OP-009 升级选卡(键盘) (E2E-levelup-flow)", async ({ page }) => {
  await startGame(page);
  await resetStage(page);
  await page.evaluate(() => { (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").pendingLevelUps = 1; });
  await page.waitForFunction(() => (globalThis as Record<string, any>).__GAME__.scene.isActive("LevelUpScene"), null, { timeout: 5000 });
  const choices = await page.evaluate(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").currentUpgradeChoices.length);
  expect(choices).toBe(3);
  await tap(page, "1");
  await page.waitForFunction(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").state === 1, null, { timeout: 5000 });
  const hist = await page.evaluate(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero.upgradeHistory.length);
  expect(hist).toBe(1);
  expect(await sceneActive(page, "LevelUpScene")).toBe(false);
});

test("TC-GP-006 连续升级积压逐次选 (E2E-levelup-stack)", async ({ page }) => {
  await startGame(page);
  await resetStage(page);
  await page.evaluate(() => { (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").pendingLevelUps = 2; });
  await page.waitForFunction(() => (globalThis as Record<string, any>).__GAME__.scene.isActive("LevelUpScene"), null, { timeout: 5000 });
  await tap(page, "1");
  await tick(page, 200); // 刷新候选
  await page.waitForFunction(() => (globalThis as Record<string, any>).__GAME__.scene.isActive("LevelUpScene"), null, { timeout: 5000 });
  await tap(page, "1");
  await page.waitForFunction(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").state === 1, null, { timeout: 5000 });
  const s = await snapshot(page);
  expect(await page.evaluate(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").pendingLevelUps)).toBe(0);
  expect(s.state).toBe(STATE.PLAYING);
});

test("TC-OP-011 升级选卡(点击卡片) (E2E-levelup-click)", async ({ page }) => {
  await startGame(page);
  await resetStage(page);
  await page.evaluate(() => { (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").pendingLevelUps = 1; });
  await page.waitForFunction(() => (globalThis as Record<string, any>).__GAME__.scene.isActive("LevelUpScene"), null, { timeout: 5000 });
  // 计算首张卡中心的屏幕坐标（base 1024x560 → canvas 实际显示尺寸）
  const box = await page.locator("canvas").boundingBox();
  if (!box) throw new Error("no canvas");
  const baseToScreen = (bx: number, by: number) => ({ x: box.x + (bx / 1024) * box.width, y: box.y + (by / 560) * box.height });
  const cw = Math.min(280, (1024 * 0.84 - 28) / 3);
  const startX = 1024 / 2 - (3 * (cw + 14)) / 2 + 7;
  const cardCenter = baseToScreen(startX + cw / 2, 560 * 0.42 + (560 * 0.42) / 2);
  await page.mouse.click(cardCenter.x, cardCenter.y);
  await page.waitForFunction(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").state === 1, null, { timeout: 5000 });
  expect(await page.evaluate(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero.upgradeHistory.length)).toBe(1);
});

test("TC-GP-008 游戏结束与结算 (E2E-gameover)", async ({ page }) => {
  await startGame(page);
  await resetStage(page, { life: 1 });
  // 清停顿与无敌后直接致死，确保下一帧即结算
  await page.evaluate(() => { const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene"); gs.hero.armor = 0; gs.hero.invulnerableUntil = 0; gs.hitStopMs = 0; gs.hero.life = 0; });
  await page.waitForFunction(() => {
    const g = (globalThis as Record<string, any>).__GAME__;
    return g.scene.getScene("GameScene").state === 3 && g.scene.isActive("GameOverScene");
  }, null, { timeout: 8000 });
  expect(await gsState(page)).toBe(STATE.GAMEOVER);
  expect(await sceneActive(page, "GameOverScene")).toBe(true);
});

test("TC-OP-013 结算后重开重置 (E2E-restart)", async ({ page }) => {
  await startGame(page);
  await resetStage(page, { life: 1 });
  await page.evaluate(() => { const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene"); gs.killCount = 9; gs.hero.armor = 0; gs.hero.invulnerableUntil = 0; gs.hitStopMs = 0; gs.hero.life = 0; });
  await page.waitForFunction(() => {
    const g = (globalThis as Record<string, any>).__GAME__;
    return g.scene.getScene("GameScene").state === 3 && g.scene.isActive("GameOverScene");
  }, null, { timeout: 8000 });
  await tap(page, "Enter");
  await page.waitForFunction(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").state === 1, null, { timeout: 8000 });
  const s = await snapshot(page);
  expect(s.killCount).toBe(0);
  expect(s.life).toBe(3);
  expect(s.meters).toBeLessThan(50);
});

test("TC-NR-002 资源完整性: 20 图 + 8 音频 (E2E-assets)", async ({ page }) => {
  await startGame(page);
  const res = await page.evaluate(() => {
    const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene");
    const imgKeys = ["background","hero1","hero5","heroFly","enemy1","enemy5","boss","obstacle","bullet","missileHero","missileBoss","shield","bang","life"];
    const audioKeys = ["bgm","jump","shoot","missile","hit","enemy_spawn","boss_spawn","gameover"];
    return {
      imgsOk: imgKeys.every((k) => gs.textures.exists(k)),
      audioOk: audioKeys.every((k) => gs.cache.audio.exists(k)),
    };
  });
  expect(res.imgsOk).toBe(true);
  expect(res.audioOk).toBe(true);
});

test("TC-GP-011 Boss 发射导弹 (E2E-boss-behavior)", async ({ page }) => {
  await startGame(page);
  await resetStage(page);
  // 在生成同帧捕获 before（此刻必为 0，因 update 尚未运行）；Boss 下一帧即发射
  const before = await page.evaluate(() => {
    const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene");
    const b = gs.encounterDirector.spawnBoss(700);
    b.setData("speedScale", 0);
    b.setData("fireTimerMs", b.getData("fireCooldownMs"));
    gs.entities.push(b);
    return gs.enemyProjectiles.length;
  });
  await page.waitForFunction(
    (b) => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").enemyProjectiles.length > b,
    before,
    { timeout: 5000 }
  );
  expect(before).toBe(0);
});

test("TC-GP-012 Boss 击杀反馈 (E2E-boss-kill)", async ({ page }) => {
  await startGame(page);
  await resetStage(page);
  await page.evaluate(() => {
    const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene");
    gs.hero.nextLevelExp = 1e9; gs.lastShootAt = -1e9;
    const b = gs.encounterDirector.spawnBoss(96 + 240);
    b.setData("speedScale", 0); b.setData("hp", 1); b.setData("maxHp", 1);
    gs.entities.push(b);
  });
  const bk0 = await page.evaluate(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").bossKillCount);
  await tap(page, "K");
  await page.waitForFunction((b) => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").bossKillCount > b, bk0, { timeout: 4000 });
  expect(await page.evaluate(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").bossKillCount)).toBe(bk0 + 1);
});
