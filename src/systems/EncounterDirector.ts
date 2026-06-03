import Phaser from "phaser";
import { CONFIG } from "../constants";
import { clamp, randomInt, weightedChoice } from "../utils";

export class EncounterDirector {
  private scene: Phaser.Scene;
  private spawnCooldownMs = 900;
  private spawnTimerMs = 0;
  private nextBossDistance = 1200;
  private nextBossTimeMs = 90000;
  private timeSinceBossMs = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  reset() {
    this.spawnCooldownMs = 900;
    this.spawnTimerMs = 0;
    this.nextBossDistance = 1200;
    this.nextBossTimeMs = 90000;
    this.timeSinceBossMs = 0;
  }

  update(
    deltaMs: number,
    meters: number,
    gameSpeed: number,
    difficultyTier: number,
    entities: Phaser.GameObjects.Rectangle[]
  ): Phaser.GameObjects.Rectangle | null {
    this.spawnTimerMs += deltaMs;
    this.timeSinceBossMs += deltaMs;

    const activeBoss = entities.some((e) => e.getData("type") === "boss");
    const canSpawnBoss = !activeBoss && meters >= 1200;
    const bossDue = canSpawnBoss && (meters >= this.nextBossDistance || this.timeSinceBossMs >= this.nextBossTimeMs);

    if (bossDue && this.hasSpace(entities, 260)) {
      this.nextBossDistance += 1200;
      this.timeSinceBossMs = 0;
      return this.spawnBoss();
    }

    if (this.spawnTimerMs < this.spawnCooldownMs || !this.hasSpace(entities, 160)) {
      return null;
    }

    this.spawnTimerMs = 0;
    this.spawnCooldownMs = clamp(1800 - gameSpeed * 120 - difficultyTier * 80, 800, 1800);

    const table: { value: string; weight: number }[] = [
      { value: "obstacle", weight: 36 },
      { value: "enemy", weight: 64 },
    ];
    if (meters >= 300) {
      table.push({ value: "elite", weight: 22 + difficultyTier * 2 });
    }

    const result = weightedChoice(table);
    const spawnX = CONFIG.BASE_WIDTH + randomInt(70, 160);

    if (result === "obstacle") return this.spawnObstacle(spawnX);
    if (result === "elite") return this.spawnElite(spawnX);
    return this.spawnEnemy(spawnX);
  }

  private hasSpace(entities: Phaser.GameObjects.Rectangle[], minDistance: number): boolean {
    return entities.every((e) => e.x < CONFIG.BASE_WIDTH - minDistance);
  }

  private spawnEnemy(x: number): Phaser.GameObjects.Rectangle {
    const w = 72,
      h = 76;
    const y = CONFIG.GROUND_Y - h;
    const keys = ["enemy1", "enemy2", "enemy3", "enemy4", "enemy5"];
    const sprite = this.scene.add.image(x, y, keys[randomInt(0, keys.length - 1)]);
    sprite.setOrigin(0, 0);
    sprite.setDisplaySize(w, h);
    sprite.setData({
      type: "enemy",
      hp: 1,
      damage: 1,
      expReward: 5,
      scoreReward: 20,
      speedScale: 1,
      width: w,
      height: h,
      active: true,
    });
    return sprite as unknown as Phaser.GameObjects.Rectangle;
  }

  private spawnElite(x: number): Phaser.GameObjects.Rectangle {
    const w = 92,
      h = 104;
    const y = CONFIG.GROUND_Y - h;
    const keys = ["enemy1", "enemy2", "enemy3", "enemy4", "enemy5"];
    const sprite = this.scene.add.image(x, y, keys[randomInt(0, keys.length - 1)]);
    sprite.setOrigin(0, 0);
    sprite.setDisplaySize(w, h);
    sprite.setData({
      type: "elite",
      hp: 3,
      damage: 1,
      expReward: 15,
      scoreReward: 80,
      speedScale: 1.18,
      width: w,
      height: h,
      active: true,
    });

    // 精英边框由 GameScene.spawnEntities 统一创建并跟踪（此处不再生成孤儿矩形）。
    return sprite as unknown as Phaser.GameObjects.Rectangle;
  }

  private spawnBoss(x?: number): Phaser.GameObjects.Rectangle {
    const spawnX = x ?? CONFIG.BASE_WIDTH + 120;
    const w = 154,
      h = 140;
    const y = CONFIG.GROUND_Y - h;
    const sprite = this.scene.add.image(spawnX, y, "boss");
    sprite.setOrigin(0, 0);
    sprite.setDisplaySize(w, h);
    sprite.setData({
      type: "boss",
      hp: 8,
      maxHp: 8,
      damage: 1,
      expReward: 30,
      scoreReward: 200,
      speedScale: 0.82,
      width: w,
      height: h,
      active: true,
      fireCooldownMs: 1200,
      fireTimerMs: 0,
    });
    return sprite as unknown as Phaser.GameObjects.Rectangle;
  }

  private spawnObstacle(x: number): Phaser.GameObjects.Rectangle {
    const w = 76,
      h = 64;
    const y = CONFIG.GROUND_Y - h;
    const sprite = this.scene.add.image(x, y, "obstacle");
    sprite.setOrigin(0, 0);
    sprite.setDisplaySize(w, h);
    sprite.setData({
      type: "obstacle",
      hp: Infinity,
      damage: 1,
      expReward: 0,
      scoreReward: 0,
      speedScale: 1,
      width: w,
      height: h,
      active: true,
    });
    return sprite as unknown as Phaser.GameObjects.Rectangle;
  }
}
