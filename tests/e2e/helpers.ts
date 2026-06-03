import { Page } from "@playwright/test";

// GameState 枚举值（与 src/constants.ts 对齐）
export const STATE = { START: 0, PLAYING: 1, PAUSED: 2, GAMEOVER: 3, LEVELUP: 4 } as const;

// 加载页面 → 等待 __GAME__ 与 MenuScene 就绪；同时收集页面 JS 错误
export async function bootToMenu(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.waitForFunction(() => !!(globalThis as Record<string, any>).__GAME__, null, { timeout: 15000 });
  await page.waitForFunction(
    () => (globalThis as Record<string, any>).__GAME__.scene.getScenes(true).some((s: any) => s.scene.key === "MenuScene"),
    null,
    { timeout: 15000 }
  );
  return errors;
}

// 真实按键开始游戏并进入 PLAYING
export async function startGame(page: Page): Promise<void> {
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    () => {
      const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene");
      return gs && gs.state === 1 && gs.scene.isActive("GameScene");
    },
    null,
    { timeout: 10000 }
  );
}

// 清场：清空实体/弹幕、冻结自动生成、可选拉高生命，得到可控舞台
export async function resetStage(
  page: Page,
  opts: { life?: number; freezeSpawn?: boolean } = {}
): Promise<void> {
  await page.evaluate(
    (o) => {
      const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene");
      for (const e of gs.entities) e.setData("active", false);
      for (const p of gs.playerProjectiles) p.setData("active", false);
      for (const p of gs.enemyProjectiles) p.setData("active", false);
      gs.cleanup();
      gs.hitStopMs = 0; // 清残留停顿，避免冻结 update 导致测试假超时
      gs.announcementMs = 0;
      if (o.freezeSpawn !== false && gs.encounterDirector) {
        const d = gs.encounterDirector;
        d.spawnTimerMs = -1e9;
        d.spawnCooldownMs = 1e9;
        d.nextBossDistance = 1e12;
        d.nextBossTimeMs = 1e12;
      }
      if (typeof o.life === "number") {
        gs.hero.maxLife = Math.max(gs.hero.maxLife, o.life);
        gs.hero.life = o.life;
      }
    },
    opts
  );
}

// 在前方生成一个实体（复用 EncounterDirector 私有 spawn，并登记进 GameScene.entities）
export async function spawnEntity(
  page: Page,
  type: "enemy" | "elite" | "boss" | "obstacle",
  x: number
): Promise<void> {
  await page.evaluate(
    (arg) => {
      const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene");
      const d = gs.encounterDirector;
      const map: Record<string, string> = {
        enemy: "spawnEnemy",
        elite: "spawnElite",
        boss: "spawnBoss",
        obstacle: "spawnObstacle",
      };
      const e = d[map[arg.type]](arg.x);
      gs.entities.push(e);
    },
    { type, x }
  );
}

// 等待若干毫秒（让游戏主循环推进）
export async function tick(page: Page, ms: number): Promise<void> {
  await page.waitForTimeout(ms);
}

// 真实按键：keydown 与 keyup 之间保持 holdMs，跨多帧，确保 Phaser 的 JustDown 轮询能在某帧捕获。
// （裸 press 过快会让 keydown/keyup 落在同一帧被 onUp 清掉 just-down 状态，造成假阴性。）
export async function tap(page: Page, key: string, holdMs = 110): Promise<void> {
  await page.keyboard.press(key, { delay: holdMs });
}

// 读取常用状态快照
export function snapshot(page: Page): Promise<{
  state: number; meters: number; heroY: number; life: number; armor: number;
  exp: number; level: number; missile: number; killCount: number; bossKillCount: number;
  entities: number; bullets: number; isFlying: boolean; isJumping: boolean;
}> {
  return page.evaluate(() => {
    const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene");
    return {
      state: gs.state,
      meters: gs.meters,
      heroY: gs.heroSprite?.y,
      life: gs.hero.life,
      armor: gs.hero.armor,
      exp: gs.hero.exp,
      level: gs.hero.level,
      missile: gs.hero.missileCount,
      killCount: gs.killCount,
      bossKillCount: gs.bossKillCount,
      entities: gs.entities.length,
      bullets: gs.playerProjectiles.length,
      isFlying: gs.hero.isFlying,
      isJumping: gs.hero.isJumping,
    };
  });
}
