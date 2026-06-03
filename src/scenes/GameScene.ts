import Phaser from "phaser";
import { CONFIG, GameState } from "../constants";
import { HeroStats, GameSummary, UpgradeCard } from "../types";
import { clamp, rectsOverlap } from "../utils";
import { AudioManager } from "../systems/AudioManager";
import { EncounterDirector } from "../systems/EncounterDirector";
import { buildUpgradeChoices } from "../systems/UpgradeSystem";
import { addText } from "../ui/text";
import {
  createDefaultHero,
  applyDamageToHero,
  gainExp,
  killScoreMultiplier,
  computeScore,
  applyUpgradeStats,
  stepJump,
} from "../systems/HeroLogic";

interface ProjectileData {
  damage: number;
  fromEnemy: boolean;
  explosive: boolean;
  penetrate: boolean;
  active: boolean;
}

export class GameScene extends Phaser.Scene {
  private state: GameState = GameState.START;
  private nowMs = 0;
  private elapsedMs = 0;
  private meters = 0;
  private gameSpeed = CONFIG.INITIAL_SPEED;
  private difficultyTier = 0;
  private bgOffset = 0;
  private bgTile1!: Phaser.GameObjects.Image;
  private bgTile2!: Phaser.GameObjects.Image;
  private ground!: Phaser.GameObjects.Rectangle;
  private groundLine!: Phaser.GameObjects.Rectangle;

  private heroSprite!: Phaser.GameObjects.Image;
  private heroShield!: Phaser.GameObjects.Ellipse;
  private hero: HeroStats = createDefaultHero();

  private entities: Phaser.GameObjects.Image[] = [];
  private playerProjectiles: Phaser.GameObjects.Image[] = [];
  private enemyProjectiles: Phaser.GameObjects.Image[] = [];
  private explosions: Phaser.GameObjects.Image[] = [];
  private eliteBorders: Phaser.GameObjects.Rectangle[] = [];
  private bossHpBars: { bg: Phaser.GameObjects.Rectangle; fill: Phaser.GameObjects.Rectangle; owner: Phaser.GameObjects.Image }[] = [];

  private encounterDirector!: EncounterDirector;
  private audioManager!: AudioManager;

  private pendingLevelUps = 0;
  private currentUpgradeChoices: UpgradeCard[] = [];
  private killScore = 0;
  private killCount = 0;
  private bossKillCount = 0;
  private announcementMs = 0;
  private hitStopMs = 0;

  private lastShootAt = -Infinity;
  private lastMissileAt = -Infinity;

  private hud!: Phaser.GameObjects.Container;
  private hudDistance!: Phaser.GameObjects.Text;
  private hudScore!: Phaser.GameObjects.Text;
  private hudLevel!: Phaser.GameObjects.Text;
  private hudKills!: Phaser.GameObjects.Text;
  private hudBoss!: Phaser.GameObjects.Text;
  private hudArmor!: Phaser.GameObjects.Text;
  private hudMissile!: Phaser.GameObjects.Text;
  private hudLifeBar!: Phaser.GameObjects.Rectangle[];
  private hudExpBg!: Phaser.GameObjects.Rectangle;
  private hudExpFill!: Phaser.GameObjects.Rectangle;
  private announcementText!: Phaser.GameObjects.Text;

  private keys!: {
    space: Phaser.Input.Keyboard.Key;
    k: Phaser.Input.Keyboard.Key;
    l: Phaser.Input.Keyboard.Key;
    p: Phaser.Input.Keyboard.Key;
    esc: Phaser.Input.Keyboard.Key;
    one: Phaser.Input.Keyboard.Key;
    two: Phaser.Input.Keyboard.Key;
    three: Phaser.Input.Keyboard.Key;
    enter: Phaser.Input.Keyboard.Key;
  };

  private runFrameIndex = 0;
  private runFrameTimer = 0;
  private runFrameKeys = ["hero1", "hero2", "hero3", "hero4", "hero5"];

  constructor() {
    super({ key: "GameScene" });
  }

  init() {
    this.state = GameState.PLAYING;
    this.nowMs = 0;
    this.elapsedMs = 0;
    this.meters = 0;
    this.gameSpeed = CONFIG.INITIAL_SPEED;
    this.difficultyTier = 0;
    this.bgOffset = 0;
    this.pendingLevelUps = 0;
    this.currentUpgradeChoices = [];
    this.killScore = 0;
    this.killCount = 0;
    this.bossKillCount = 0;
    this.announcementMs = 0;
    this.hitStopMs = 0;
    this.lastShootAt = -Infinity;
    this.lastMissileAt = -Infinity;
    this.runFrameIndex = 0;
    this.runFrameTimer = 0;
    this.hero = createDefaultHero();
  }

  create() {
    this.init();
    this.createBackground();
    this.createHero();
    this.createHud();
    this.setupInput();
    this.createTouchControls();

    this.encounterDirector = new EncounterDirector(this);
    this.audioManager = new AudioManager(this);
    this.audioManager.init();
    this.audioManager.playBgm();

    this.physics.world.setBounds(0, 0, CONFIG.BASE_WIDTH, CONFIG.BASE_HEIGHT);
  }

  update(_time: number, delta: number) {
    const deltaMs = Math.min(delta, 50);
    this.nowMs += deltaMs;

    if (this.announcementMs > 0) {
      this.announcementMs = Math.max(0, this.announcementMs - deltaMs);
      if (this.announcementMs === 0) {
        this.announcementText.setVisible(false);
      }
    }

    this.handleInput();

    if (this.state !== GameState.PLAYING) return;

    if (this.hitStopMs > 0) {
      this.hitStopMs = Math.max(0, this.hitStopMs - deltaMs);
      return;
    }

    this.elapsedMs += deltaMs;
    this.difficultyTier = Math.floor(this.meters / CONFIG.SPEED_MILESTONE_INTERVAL);
    this.gameSpeed = clamp(
      CONFIG.INITIAL_SPEED + this.difficultyTier * CONFIG.SPEED_STEP,
      CONFIG.INITIAL_SPEED,
      CONFIG.MAX_SPEED
    );

    const worldSpeedPx = 230 + this.gameSpeed * 38;
    this.bgOffset = (this.bgOffset + worldSpeedPx * (deltaMs / 1000)) % CONFIG.BASE_WIDTH;
    this.meters += this.gameSpeed * deltaMs * CONFIG.DISTANCE_FACTOR;

    this.updateHero(deltaMs);
    this.spawnEntities(deltaMs);
    this.updateEntities(deltaMs, worldSpeedPx);
    this.updateProjectiles(deltaMs);
    this.handleProjectileCollisions();
    this.handleHeroCollisions();
    this.updateExplosions(deltaMs);
    this.cleanup();
    this.updateHud();

    if (this.hero.life <= 0) {
      this.gameOver();
      return;
    }

    if (this.pendingLevelUps > 0) {
      this.enterLevelUp();
    }
  }

  private createBackground() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x193456, 0x193456, 0x0e1724, 0x0e1724, 1);
    bg.fillRect(0, 0, CONFIG.BASE_WIDTH, CONFIG.BASE_HEIGHT);
    bg.setDepth(0);

    this.bgTile1 = this.add.image(0, 12, "background");
    this.bgTile1.setOrigin(0, 0);
    this.bgTile1.setDisplaySize(CONFIG.BASE_WIDTH, 320);
    this.bgTile1.setAlpha(0.22);
    this.bgTile1.setDepth(1);

    this.bgTile2 = this.add.image(CONFIG.BASE_WIDTH, 12, "background");
    this.bgTile2.setOrigin(0, 0);
    this.bgTile2.setDisplaySize(CONFIG.BASE_WIDTH, 320);
    this.bgTile2.setAlpha(0.22);
    this.bgTile2.setDepth(1);

    const groundBg = this.add.rectangle(0, CONFIG.GROUND_Y + 22, CONFIG.BASE_WIDTH, CONFIG.BASE_HEIGHT - CONFIG.GROUND_Y - 22, 0x1b3146);
    groundBg.setOrigin(0, 0);
    groundBg.setDepth(2);

    this.ground = this.add.rectangle(0, CONFIG.GROUND_Y + 10, CONFIG.BASE_WIDTH, 24, 0x325b35);
    this.ground.setOrigin(0, 0);
    this.ground.setDepth(3);

    this.groundLine = this.add.rectangle(0, CONFIG.GROUND_Y + 4, CONFIG.BASE_WIDTH, 1, 0xffffff, 0.08);
    this.groundLine.setOrigin(0, 0);
    this.groundLine.setDepth(3);
  }

  private createHero() {
    const heroY = this.hero.isFlying ? 180 : CONFIG.GROUND_Y - 96;
    this.heroSprite = this.add.image(CONFIG.HERO_X, heroY, "hero1");
    this.heroSprite.setOrigin(0, 0);
    this.heroSprite.setDisplaySize(90, 96);
    this.heroSprite.setDepth(10);

    this.heroShield = this.add.ellipse(CONFIG.HERO_X + 45, heroY + 48, 90 * 0.52 * 2, 96 * 0.6 * 2);
    this.heroShield.setStrokeStyle(3, 0x56b6ff, 0.75);
    this.heroShield.setFillStyle(0x000000, 0);
    this.heroShield.setDepth(11);
    this.heroShield.setVisible(false);
  }

  private createHud() {
    this.hud = this.add.container(0, 0);
    this.hud.setDepth(50);
    this.hud.setScrollFactor(0);

    const leftBg = this.add.rectangle(18, 18, 302, 116, 0x070e16, 0.54);
    leftBg.setOrigin(0, 0);
    this.hud.add(leftBg);

    const rightBg = this.add.rectangle(758, 18, 248, 128, 0x070e16, 0.54);
    rightBg.setOrigin(0, 0);
    this.hud.add(rightBg);

    this.hudDistance = addText(this,32, 32, "距离 0m", { fontSize: "20px", fontStyle: "bold", color: "#f5f8fc" });
    this.hud.add(this.hudDistance);

    this.hudScore = addText(this,32, 58, "得分 0", { fontSize: "20px", fontStyle: "bold", color: "#f5f8fc" });
    this.hud.add(this.hudScore);

    this.hudLevel = addText(this,32, 84, "等级 Lv.1", { fontSize: "20px", fontStyle: "bold", color: "#f5f8fc" });
    this.hud.add(this.hudLevel);

    this.hudKills = addText(this,772, 32, "击杀 0", { fontSize: "16px", fontStyle: "bold", color: "#b2c5d9" });
    this.hud.add(this.hudKills);

    this.hudBoss = addText(this,772, 54, "Boss 0", { fontSize: "16px", fontStyle: "bold", color: "#b2c5d9" });
    this.hud.add(this.hudBoss);

    this.hudArmor = addText(this,772, 76, "护甲 0", { fontSize: "16px", fontStyle: "bold", color: "#b2c5d9" });
    this.hud.add(this.hudArmor);

    this.hudMissile = addText(this,772, 98, "导弹 0", { fontSize: "16px", fontStyle: "bold", color: "#b2c5d9" });
    this.hud.add(this.hudMissile);

    this.hudLifeBar = [];
    for (let i = 0; i < 8; i++) {
      const lifeRect = this.add.rectangle(772 + i * 22, 132, 16, 10, 0xff8f6a, i < 3 ? 1 : 0.18);
      lifeRect.setOrigin(0, 0);
      this.hud.add(lifeRect);
      this.hudLifeBar.push(lifeRect);
    }

    this.hudExpBg = this.add.rectangle(32, 118, 270, 10, 0xffffff, 0.15);
    this.hudExpBg.setOrigin(0, 0);
    this.hud.add(this.hudExpBg);

    this.hudExpFill = this.add.rectangle(32, 118, 0, 10, 0x56b6ff);
    this.hudExpFill.setOrigin(0, 0);
    this.hud.add(this.hudExpFill);

    this.announcementText = addText(this,CONFIG.BASE_WIDTH / 2, 74, "", {
      fontSize: "28px",
      fontStyle: "bold",
      color: "#fff7e8",
      align: "center",
    });
    this.announcementText.setOrigin(0.5);
    this.announcementText.setDepth(55);
    this.announcementText.setVisible(false);
  }

  private setupInput() {
    if (!this.input.keyboard) return;
    this.keys = {
      space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      k: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K),
      l: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L),
      p: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P),
      esc: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
      one: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      two: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      three: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      enter: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
    };
  }

  // 移动端触屏按钮（PRD 3.2）：跳跃 / 射击 / 导弹。鼠标点击同样可用，便于桌面与测试。
  // 各按钮调用与键盘一致的行动方法（其内部已按 state 守卫）。
  private createTouchControls() {
    const y = CONFIG.BASE_HEIGHT - 56;
    const make = (x: number, label: string, color: number, onPress: () => void) => {
      const r = 38;
      const circle = this.add.circle(x, y, r, color, 0.28);
      circle.setStrokeStyle(2, 0xffffff, 0.5);
      circle.setScrollFactor(0);
      circle.setDepth(60);
      circle.setInteractive({ useHandCursor: true });
      const text = addText(this, x, y, label, { fontSize: "22px", fontStyle: "bold", color: "#ffffff" });
      text.setOrigin(0.5);
      text.setScrollFactor(0);
      text.setDepth(61);
      circle.setData("touchButton", true);
      circle.on("pointerdown", (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        onPress();
        circle.setScale(0.92);
      });
      circle.on("pointerup", () => circle.setScale(1));
      circle.on("pointerout", () => circle.setScale(1));
    };

    make(80, "跳", 0x56b6ff, () => this.heroJump());
    make(CONFIG.BASE_WIDTH - 150, "射", 0xff8f6a, () => this.heroShoot());
    make(CONFIG.BASE_WIDTH - 60, "弹", 0xffd166, () => this.heroFireMissile());
  }

  private handleInput() {
    if (!this.keys) return;

    if (Phaser.Input.Keyboard.JustDown(this.keys.space)) {
      this.heroJump();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.k)) {
      this.heroShoot();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.l)) {
      this.heroFireMissile();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.p) || Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
      if (this.state === GameState.PLAYING) {
        this.pauseGame();
      } else if (this.state === GameState.PAUSED) {
        this.resumeGame();
      }
    }
  }

  private heroJump() {
    if (this.state !== GameState.PLAYING) return;
    if (this.hero.isJumping || this.hero.isFlying) return;

    this.hero.isJumping = true;
    this.hero.velocityY = CONFIG.JUMP_VELOCITY * this.hero.jumpVelocityModifier;
    this.audioManager.playJump();
  }

  private heroShoot() {
    if (this.state !== GameState.PLAYING) return;
    if (this.nowMs - this.lastShootAt < this.hero.shootCooldownMs) return;

    this.lastShootAt = this.nowMs;
    const count = Math.min(this.hero.fireLevel, 5);
    const damage = 1 + this.hero.bulletDamageBonus;

    for (let i = 0; i < count; i++) {
      const offsetY = -12 + i * 8;
      const bullet = this.add.image(
        this.heroSprite.x + 86,
        this.heroSprite.y + 96 * 0.35 + offsetY,
        "bullet"
      );
      bullet.setOrigin(0, 0);
      bullet.setDisplaySize(30, 12);
      bullet.setDepth(15);
      bullet.setData({
        damage,
        fromEnemy: false,
        explosive: false,
        penetrate: false,
        active: true,
      } satisfies ProjectileData);
      this.playerProjectiles.push(bullet);
    }
    this.audioManager.playShoot();
  }

  private heroFireMissile() {
    if (this.state !== GameState.PLAYING) return;
    if (this.hero.missileCount <= 0 || this.nowMs - this.lastMissileAt < CONFIG.MISSILE_COOLDOWN_MS) return;

    this.lastMissileAt = this.nowMs;
    this.hero.missileCount -= 1;

    const missile = this.add.image(
      this.heroSprite.x + 86,
      this.heroSprite.y + 96 * 0.42,
      "missileHero"
    );
    missile.setOrigin(0, 0);
    missile.setDisplaySize(42, 18);
    missile.setDepth(15);
    missile.setData({
      damage: 2,
      fromEnemy: false,
      explosive: this.hero.hasExplosiveMissiles,
      penetrate: true,
      active: true,
    } satisfies ProjectileData);
    this.playerProjectiles.push(missile);
    this.audioManager.playMissile();
  }

  private updateHero(deltaMs: number) {
    this.runFrameTimer += deltaMs;
    if (this.runFrameTimer >= 90) {
      this.runFrameTimer = 0;
      this.runFrameIndex = (this.runFrameIndex + 1) % this.runFrameKeys.length;
    }

    if (this.hero.isFlying) {
      this.hero.flightRemainingMs -= deltaMs;
      this.heroSprite.y = 180;
      // PRD 10.5：飞行结束若落点正下方有障碍，则保持悬停直到最近安全落点出现，避免卡入障碍。
      if (this.hero.flightRemainingMs <= 0 && this.isGroundLandingSafe()) {
        this.hero.isFlying = false;
        this.heroSprite.y = CONFIG.GROUND_Y - 96;
      }
    } else if (this.hero.isJumping) {
      // 帧率无关积分：滞空时间与世界滚动同按 deltaMs 推进，高刷屏下才能跳过移动敌人。
      const step = stepJump(this.hero.velocityY, this.heroSprite.y, deltaMs, CONFIG.GROUND_Y - 96);
      this.hero.velocityY = step.velocityY;
      this.heroSprite.y = step.y;
      if (step.landed) this.hero.isJumping = false;
    }

    const textureKey = this.hero.isFlying ? "heroFly" : this.runFrameKeys[this.runFrameIndex];
    this.heroSprite.setTexture(textureKey);

    const flashing = this.nowMs < this.hero.invulnerableUntil && Math.floor(this.nowMs / 70) % 2 === 0;
    this.heroSprite.setAlpha(flashing ? 0.55 : 1);

    this.heroShield.setPosition(this.heroSprite.x + 45, this.heroSprite.y + 48);
    this.heroShield.setVisible(this.hero.armor > 0);
  }

  // 落点是否安全：地面站位（GROUND_Y-96）处无活跃障碍与角色受击盒重叠。
  private isGroundLandingSafe(): boolean {
    const groundY = CONFIG.GROUND_Y - 96;
    const heroBox = { x: CONFIG.HERO_X + 18, y: groundY + 10, width: 90 - 28, height: 96 - 14 };
    for (const entity of this.entities) {
      if (!entity.getData("active") || entity.getData("type") !== "obstacle") continue;
      const eBox = {
        x: entity.x + 6,
        y: entity.y + 4,
        width: Math.max(8, (entity.getData("width") as number) - 12),
        height: Math.max(8, (entity.getData("height") as number) - 8),
      };
      if (rectsOverlap(heroBox, eBox)) return false;
    }
    return true;
  }

  private spawnEntities(deltaMs: number) {
    const spawned = this.encounterDirector.update(
      deltaMs,
      this.meters,
      this.gameSpeed,
      this.difficultyTier,
      this.entities as unknown as Phaser.GameObjects.Rectangle[]
    );

    if (!spawned) return;

    const entity = spawned as unknown as Phaser.GameObjects.Image;
    this.entities.push(entity);

    const type = entity.getData("type");
    if (type === "boss") {
      this.announce("Boss Incoming");
      this.audioManager.playBossSpawn();
    } else if (type === "enemy" || type === "elite") {
      this.audioManager.playEnemySpawn();
    }

    if (type === "elite") {
      const border = this.add.rectangle(entity.x + 3, entity.y + 3, (entity.getData("width") as number) - 6, (entity.getData("height") as number) - 6);
      border.setOrigin(0, 0);
      border.setStrokeStyle(3, 0x56b6ff, 0.85);
      border.setFillStyle(0x000000, 0);
      border.setDepth(8);
      border.setData("ownerEntity", entity); // 关联宿主，使 updateEntities 跟随、cleanup 正确销毁
      this.eliteBorders.push(border);
    }

    if (type === "boss") {
      const hpBg = this.add.rectangle(entity.x + 14, entity.y - 14, (entity.getData("width") as number) - 28, 8, 0x000000, 0.55);
      hpBg.setOrigin(0, 0);
      hpBg.setDepth(9);
      const hpFill = this.add.rectangle(entity.x + 14, entity.y - 14, (entity.getData("width") as number) - 28, 8, 0xff7043);
      hpFill.setOrigin(0, 0);
      hpFill.setDepth(9);
      this.bossHpBars.push({ bg: hpBg, fill: hpFill, owner: entity });
    }
  }

  private updateEntities(deltaMs: number, worldSpeedPx: number) {
    for (const entity of this.entities) {
      const data = entity.getData("type") as string;
      const speedScale = entity.getData("speedScale") as number;
      entity.x -= worldSpeedPx * speedScale * (deltaMs / 1000);

      const w = entity.getData("width") as number;
      if (entity.x + w < -120) {
        entity.setData("active", false);
      }

      if (data === "boss") {
        let fireTimer = entity.getData("fireTimerMs") as number;
        const fireCooldown = entity.getData("fireCooldownMs") as number;
        fireTimer += deltaMs;
        entity.setData("fireTimerMs", fireTimer);

        if (fireTimer >= fireCooldown) {
          entity.setData("fireTimerMs", 0);
          const missile = this.add.image(entity.x + 16, entity.y + (entity.getData("height") as number) * 0.45, "missileBoss");
          missile.setOrigin(0, 0);
          missile.setDisplaySize(36, 16);
          missile.setDepth(15);
          missile.setData({
            damage: 1,
            fromEnemy: true,
            explosive: false,
            penetrate: false,
            active: true,
          } satisfies ProjectileData);
          this.enemyProjectiles.push(missile);
        }
      }
    }

    for (const border of this.eliteBorders) {
      const owner = border.getData("ownerEntity") as Phaser.GameObjects.Image | undefined;
      if (owner) {
        border.setPosition(owner.x + 3, owner.y + 3);
      }
    }

    for (const hpBar of this.bossHpBars) {
      hpBar.bg.setPosition(hpBar.owner.x + 14, hpBar.owner.y - 14);
      hpBar.fill.setPosition(hpBar.owner.x + 14, hpBar.owner.y - 14);
      const hp = hpBar.owner.getData("hp") as number;
      const maxHp = hpBar.owner.getData("maxHp") as number;
      const ratio = clamp(hp / maxHp, 0, 1);
      hpBar.fill.setDisplaySize(((hpBar.owner.getData("width") as number) - 28) * ratio, 8);
    }
  }

  private updateProjectiles(deltaMs: number) {
    for (const p of this.playerProjectiles) {
      p.x += 520 * (deltaMs / 1000);
      if (p.x > CONFIG.BASE_WIDTH + 120) {
        p.setData("active", false);
      }
    }

    for (const p of this.enemyProjectiles) {
      p.x -= 480 * (deltaMs / 1000);
      if (p.x < -140) {
        p.setData("active", false);
      }
    }
  }

  private handleProjectileCollisions() {
    for (const projectile of this.playerProjectiles) {
      if (!projectile.getData("active")) continue;

      for (const entity of this.entities) {
        if (!entity.getData("active") || entity.getData("type") === "obstacle") continue;

        const pBox = { x: projectile.x, y: projectile.y, width: projectile.displayWidth, height: projectile.displayHeight };
        const eBox = { x: entity.x + 6, y: entity.y + 4, width: Math.max(8, (entity.getData("width") as number) - 12), height: Math.max(8, (entity.getData("height") as number) - 8) };

        if (!rectsOverlap(pBox, eBox)) continue;

        if (projectile.getData("explosive")) {
          this.explodeMissile(projectile);
        }

        // 爆炸可能已击杀该敌；仅在其仍存活时再结算直接伤害，避免重复计入击杀/经验/得分
        if (entity.getData("active")) {
          const hp = (entity.getData("hp") as number) - (projectile.getData("damage") as number);
          entity.setData("hp", hp);
          if (hp <= 0) {
            entity.setData("active", false);
            this.handleEnemyKilled(entity);
          }
        }

        if (!projectile.getData("penetrate")) {
          projectile.setData("active", false);
          break;
        }
      }
    }
  }

  private explodeMissile(projectile: Phaser.GameObjects.Image) {
    const cx = projectile.x + projectile.displayWidth / 2;
    const cy = projectile.y + projectile.displayHeight / 2;
    const radius = 74;

    const explosion = this.add.image(cx, cy, "bang");
    explosion.setDisplaySize(radius * 2, radius * 2);
    explosion.setDepth(20);
    explosion.setData({ lifeMs: 240, active: true });
    this.explosions.push(explosion);

    for (const entity of this.entities) {
      if (!entity.getData("active") || entity.getData("type") === "obstacle") continue;

      const ecx = entity.x + (entity.getData("width") as number) / 2;
      const ecy = entity.y + (entity.getData("height") as number) / 2;
      const distance = Math.hypot(ecx - cx, ecy - cy);

      if (distance > radius) continue;

      let hp = entity.getData("hp") as number;
      hp -= 2;
      entity.setData("hp", hp);
      if (hp <= 0) {
        entity.setData("active", false);
        this.handleEnemyKilled(entity);
      }
    }
  }

  private handleHeroCollisions() {
    const heroHitbox = {
      x: this.heroSprite.x + 18,
      y: this.heroSprite.y + 10,
      width: 90 - 28,
      height: 96 - 14,
    };

    for (const entity of this.entities) {
      if (!entity.getData("active")) continue;
      if (entity.getData("type") === "obstacle" && this.hero.isFlying) continue;

      const eBox = {
        x: entity.x + 6,
        y: entity.y + 4,
        width: Math.max(8, (entity.getData("width") as number) - 12),
        height: Math.max(8, (entity.getData("height") as number) - 8),
      };

      if (!rectsOverlap(heroHitbox, eBox)) continue;

      this.audioManager.playHit();
      const dead = this.heroTakeDamage(entity.getData("damage") as number);
      this.hitStopMs = entity.getData("type") === "obstacle" ? 1000 : 220;
      if (dead) return;
      break;
    }

    for (const p of this.enemyProjectiles) {
      if (!p.getData("active")) continue;

      const pBox = { x: p.x, y: p.y, width: p.displayWidth, height: p.displayHeight };
      if (!rectsOverlap(heroHitbox, pBox)) continue;

      p.setData("active", false);
      this.audioManager.playHit();
      const dead = this.heroTakeDamage(p.getData("damage") as number);
      this.hitStopMs = 180;
      if (dead) return;
    }
  }

  private heroTakeDamage(amount: number): boolean {
    return applyDamageToHero(this.hero, amount, this.nowMs);
  }

  private handleEnemyKilled(entity: Phaser.GameObjects.Image) {
    const cx = entity.x + (entity.getData("width") as number) / 2;
    const cy = entity.y + (entity.getData("height") as number) / 2;
    const radius = entity.getData("type") === "boss" ? 96 : 54;

    const explosion = this.add.image(cx, cy, "bang");
    explosion.setDisplaySize(radius * 2, radius * 2);
    explosion.setDepth(20);
    explosion.setData({ lifeMs: 240, active: true });
    this.explosions.push(explosion);

    const expReward = entity.getData("expReward") as number;
    const levelsGained = this.heroGainExp(expReward);
    this.pendingLevelUps += levelsGained;

    this.killCount += 1;
    if (entity.getData("type") === "boss") {
      this.bossKillCount += 1;
      this.hitStopMs = 320;
      this.announce("Boss Down");
    }

    const scoreReward = entity.getData("scoreReward") as number;
    this.killScore += scoreReward * killScoreMultiplier(this.hero);
  }

  private heroGainExp(rawAmount: number): number {
    return gainExp(this.hero, rawAmount);
  }

  private updateExplosions(deltaMs: number) {
    for (const explosion of this.explosions) {
      let lifeMs = explosion.getData("lifeMs") as number;
      lifeMs -= deltaMs;
      explosion.setData("lifeMs", lifeMs);
      explosion.setAlpha(clamp(lifeMs / 240, 0, 1));
      if (lifeMs <= 0) {
        explosion.setData("active", false);
      }
    }
  }

  private cleanup() {
    this.entities = this.entities.filter((e) => {
      if (!e.getData("active")) {
        e.destroy();
        return false;
      }
      return true;
    });

    this.playerProjectiles = this.playerProjectiles.filter((p) => {
      if (!p.getData("active")) {
        p.destroy();
        return false;
      }
      return true;
    });

    this.enemyProjectiles = this.enemyProjectiles.filter((p) => {
      if (!p.getData("active")) {
        p.destroy();
        return false;
      }
      return true;
    });

    this.explosions = this.explosions.filter((e) => {
      if (!e.getData("active")) {
        e.destroy();
        return false;
      }
      return true;
    });

    this.eliteBorders = this.eliteBorders.filter((b) => {
      const owner = b.getData("ownerEntity") as Phaser.GameObjects.Image | undefined;
      if (!owner || !owner.getData("active")) {
        b.destroy();
        return false;
      }
      return true;
    });

    this.bossHpBars = this.bossHpBars.filter((hpBar) => {
      if (!hpBar.owner.getData("active")) {
        hpBar.bg.destroy();
        hpBar.fill.destroy();
        return false;
      }
      return true;
    });
  }

  private updateHud() {
    this.hudDistance.setText(`距离 ${Math.floor(this.meters)}m`);
    this.hudScore.setText(`得分 ${this.getCurrentScore()}`);
    this.hudLevel.setText(`等级 Lv.${this.hero.level}`);
    this.hudKills.setText(`击杀 ${this.killCount}`);
    this.hudBoss.setText(`Boss ${this.bossKillCount}`);
    this.hudArmor.setText(`护甲 ${this.hero.armor}`);
    this.hudMissile.setText(`导弹 ${this.hero.missileCount}`);

    for (let i = 0; i < this.hudLifeBar.length; i++) {
      this.hudLifeBar[i].setAlpha(i < this.hero.life ? 1 : 0.18);
    }

    const expRatio = this.hero.exp / this.hero.nextLevelExp;
    this.hudExpFill.setDisplaySize(270 * expRatio, 10);

    this.bgTile1.x = -this.bgOffset * 0.28;
    this.bgTile2.x = CONFIG.BASE_WIDTH - this.bgOffset * 0.28;
  }

  private getCurrentScore(): number {
    return computeScore(this.meters, this.killScore, this.hero.level);
  }

  private announce(text: string) {
    this.announcementMs = 1600;
    this.announcementText.setText(text);
    this.announcementText.setVisible(true);
  }

  private enterLevelUp() {
    this.state = GameState.LEVELUP;
    this.currentUpgradeChoices = buildUpgradeChoices(this.hero);
    this.scene.launch("LevelUpScene", {
      choices: this.currentUpgradeChoices,
      pendingLevelUps: this.pendingLevelUps,
    });
    this.scene.pause("GameScene");
  }

  chooseUpgrade(index: number) {
    const card = this.currentUpgradeChoices[index];
    if (!card) return;

    this.applyUpgrade(card);
    this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1);
    this.currentUpgradeChoices = [];

    if (card.id === "flight-module") {
      this.announce("Flight Online");
    } else {
      this.announce(card.name);
    }

    if (this.pendingLevelUps > 0) {
      this.currentUpgradeChoices = buildUpgradeChoices(this.hero);
      this.scene.stop("LevelUpScene");
      this.scene.launch("LevelUpScene", {
        choices: this.currentUpgradeChoices,
        pendingLevelUps: this.pendingLevelUps,
      });
      return;
    }

    this.scene.stop("LevelUpScene");
    this.state = GameState.PLAYING;
    this.scene.resume("GameScene");
  }

  private applyUpgrade(card: UpgradeCard) {
    applyUpgradeStats(this.hero, card.id);
    if (card.id === "flight-module") {
      this.heroSprite.y = 180; // 飞行落位（精灵副作用）
    }
    this.hero.upgradeHistory.push(card.name);
  }

  private pauseGame() {
    this.state = GameState.PAUSED;
    this.audioManager.pauseBgm();
    this.scene.launch("PauseScene");
    this.scene.pause("GameScene");
  }

  resumeGame() {
    this.state = GameState.PLAYING;
    this.audioManager.resumeBgm();
    this.scene.stop("PauseScene");
    this.scene.resume("GameScene");
  }

  private gameOver() {
    if (this.state === GameState.GAMEOVER) return;
    this.state = GameState.GAMEOVER;
    this.audioManager.stopBgm();
    this.audioManager.playGameOver();

    const summary: GameSummary = {
      score: this.getCurrentScore(),
      distance: Math.floor(this.meters),
      kills: this.killCount,
      bossKills: this.bossKillCount,
      level: this.hero.level,
      build: this.hero.upgradeHistory.length > 0 ? this.hero.upgradeHistory.join(" / ") : "未成型构筑",
    };

    this.scene.launch("GameOverScene", { summary });
    this.scene.pause("GameScene");
  }

  restartGame() {
    this.scene.stop("GameOverScene");
    this.scene.stop("PauseScene");
    this.scene.stop("LevelUpScene");

    for (const e of this.entities) e.destroy();
    for (const p of this.playerProjectiles) p.destroy();
    for (const p of this.enemyProjectiles) p.destroy();
    for (const e of this.explosions) e.destroy();
    for (const b of this.eliteBorders) b.destroy();
    for (const hp of this.bossHpBars) {
      hp.bg.destroy();
      hp.fill.destroy();
    }

    this.entities = [];
    this.playerProjectiles = [];
    this.enemyProjectiles = [];
    this.explosions = [];
    this.eliteBorders = [];
    this.bossHpBars = [];

    this.encounterDirector.reset();
    this.hero = createDefaultHero();
    this.init();
    this.heroSprite.setTexture("hero1");
    this.heroSprite.y = CONFIG.GROUND_Y - 96;
    this.heroSprite.setAlpha(1);
    this.heroShield.setVisible(false);
    this.announcementText.setVisible(false);

    this.audioManager.playBgm();
    this.scene.resume("GameScene");
  }
}
