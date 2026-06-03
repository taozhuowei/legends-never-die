import { test, expect, Page } from "@playwright/test";
import { bootToMenu, startGame, resetStage, tick, tap, snapshot, STATE } from "./helpers";

const errorsOf = (page: Page): string[] => ((page as unknown as { __e: string[] }).__e ??= []);

test.beforeEach(async ({ page }) => {
  const errs: string[] = [];
  (page as unknown as { __e: string[] }).__e = errs;
  page.on("pageerror", (e) => errs.push(e.message));
  await bootToMenu(page);
  await startGame(page);
});

test("TC-ST-002 快速连续输入不崩溃 (E2E-stress-input)", async ({ page }) => {
  await resetStage(page, { life: 999 });
  for (let i = 0; i < 25; i++) {
    await page.keyboard.down("Space");
    await page.keyboard.down("K");
    await page.keyboard.up("Space");
    await page.keyboard.up("K");
    await tick(page, 20);
  }
  const s = await snapshot(page);
  expect(errorsOf(page)).toEqual([]);
  expect(s.state).toBe(STATE.PLAYING);
  expect(s.bullets).toBeLessThan(400); // 受冷却约束，不爆量
});

test("TC-ST-003 多次暂停/恢复无叠加 (E2E-pause-cycle)", async ({ page }) => {
  await resetStage(page);
  for (let i = 0; i < 6; i++) {
    await tap(page, "P");
    await page.waitForFunction(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").state === 2, null, { timeout: 4000 });
    await tap(page, "P");
    await page.waitForFunction(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").state === 1, null, { timeout: 4000 });
  }
  const pauseScenes = await page.evaluate(() => (globalThis as Record<string, any>).__GAME__.scene.getScenes(true).filter((s: any) => s.scene.key === "PauseScene").length);
  expect(pauseScenes).toBe(0);
  expect(errorsOf(page)).toEqual([]);
});

test("TC-ST-004 多次重开循环干净 (E2E-restart-cycle)", async ({ page }) => {
  for (let i = 0; i < 3; i++) {
    await resetStage(page, { life: 1 });
    await page.evaluate(() => { const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene"); gs.hitStopMs = 0; gs.hero.armor = 0; gs.hero.invulnerableUntil = 0; gs.hero.life = 0; });
    await page.waitForFunction(() => {
      const g = (globalThis as Record<string, any>).__GAME__;
      return g.scene.getScene("GameScene").state === 3 && g.scene.isActive("GameOverScene");
    }, null, { timeout: 8000 });
    await tap(page, "Enter");
    await page.waitForFunction(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").state === 1, null, { timeout: 8000 });
    const s = await snapshot(page);
    expect(s.killCount).toBe(0);
    expect(s.meters).toBeLessThan(60);
  }
  expect(errorsOf(page)).toEqual([]);
});

test("TC-ST-006 极端距离封顶不溢出 (E2E-extreme-distance)", async ({ page }) => {
  await resetStage(page);
  await page.evaluate(() => { (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").meters = 999999; });
  await tick(page, 80);
  const r = await page.evaluate(() => {
    const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene");
    return { speed: gs.gameSpeed, score: gs.getCurrentScore() };
  });
  expect(r.speed).toBe(8);
  expect(Number.isFinite(r.score)).toBe(true);
});

test("TC-ST-009 飞行结束安全回到地面 (E2E-flight-land)", async ({ page }) => {
  await resetStage(page);
  await page.evaluate(() => {
    const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene");
    gs.applyUpgrade({ id: "flight-module", name: "飞行模块" });
    gs.hero.flightRemainingMs = 120; // 即将结束
  });
  await page.waitForFunction(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero.isFlying === false, null, { timeout: 4000 });
  await tick(page, 80);
  const s = await snapshot(page);
  expect(s.isFlying).toBe(false);
  expect(s.heroY).toBe(304); // GROUND_Y - 96
  expect(errorsOf(page)).toEqual([]);
});

test("TC-ST-009b 飞行落点有障碍时安全悬停, 清除后落地 (PRD 10.5)", async ({ page }) => {
  await resetStage(page, { life: 5 });
  await page.evaluate(() => {
    const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene");
    const o = gs.encounterDirector.spawnObstacle(100);
    o.setData("speedScale", 0);
    gs.entities.push(o);
    gs.applyUpgrade({ id: "flight-module", name: "飞行模块" });
    gs.hero.flightRemainingMs = 50;
    gs.hero.invulnerableUntil = 0;
  });
  await tick(page, 400); // 飞行已到期，但正下方有障碍 → 应持续悬停而非落入
  let s = await snapshot(page);
  expect(s.isFlying).toBe(true);
  expect(s.heroY).toBe(180);
  expect(s.life).toBe(5); // 未因落入障碍而受伤
  // 障碍移除 → 出现安全落点 → 落地
  await page.evaluate(() => {
    const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene");
    for (const e of gs.entities) if (e.getData("type") === "obstacle") e.setData("active", false);
  });
  await page.waitForFunction(() => (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene").hero.isFlying === false, null, { timeout: 3000 });
  s = await snapshot(page);
  expect(s.heroY).toBe(304);
  expect(s.life).toBe(5);
  expect(errorsOf(page)).toEqual([]);
});

test("TC-PF-005 / TC-ST-001 短时运行: 实体数有界、无崩溃 (E2E-smoke-run)", async ({ page }) => {
  await page.evaluate(() => { const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene"); gs.hero.life = 9999; gs.hero.nextLevelExp = 1e9; });
  // 真实游玩 ~4s，周期性射击；不冻结生成（抬高升级阈值以保持连续游玩不被选卡打断）
  for (let i = 0; i < 20; i++) {
    await tap(page, "K", 40);
    await tick(page, 160);
  }
  const s = await snapshot(page);
  expect(errorsOf(page)).toEqual([]);
  expect(s.state).toBe(STATE.PLAYING);
  expect(s.entities).toBeLessThan(80); // cleanup 生效，未无限增长
  expect(s.bullets).toBeLessThan(400);
});

test("TC-PF-001 帧率冒烟: 平均 FPS 合理 (E2E-smoke-fps)", async ({ page }) => {
  const fps = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let frames = 0;
        const t0 = performance.now();
        const loop = () => {
          frames++;
          if (performance.now() - t0 >= 1000) resolve(frames);
          else requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      })
  );
  // 阈值取 30：在 headless 多任务争用下仍能区分「健康循环」与「冻结/严重节流」（目标 60FPS）。
  expect(fps).toBeGreaterThan(30);
});
