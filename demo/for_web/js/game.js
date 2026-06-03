const UPGRADE_DEFINITIONS = [
  {
    id: "fire-up",
    name: "火力升级",
    rarity: "common",
    description: "单次发射子弹数 +1，最高到 Lv5。",
    eligible: (hero) => hero.fireLevel < 5,
  },
  {
    id: "shoot-speed",
    name: "射速升级",
    rarity: "common",
    description: "普通射击冷却 -0.02 秒，最低 0.10 秒。",
    eligible: (hero) => hero.shootCooldownMs > 100,
  },
  {
    id: "bullet-boost",
    name: "子弹强化",
    rarity: "rare",
    description: "普通子弹伤害 +1，最多叠加 4 次。",
    eligible: (hero) => hero.bulletDamageBonus < 4,
  },
  {
    id: "missile-supply",
    name: "导弹补给",
    rarity: "common",
    description: "导弹 +5。",
    eligible: () => true,
  },
  {
    id: "explosive-warhead",
    name: "爆裂弹头",
    rarity: "epic",
    description: "导弹命中时会触发范围爆炸伤害。",
    eligible: (hero) => !hero.hasExplosiveMissiles,
  },
  {
    id: "life-up",
    name: "生命提升",
    rarity: "common",
    description: "最大生命 +1，当前生命同时 +1。",
    eligible: (hero) => hero.maxLife < 8,
  },
  {
    id: "armor-up",
    name: "护甲装置",
    rarity: "common",
    description: "护甲 +2，最高 10。",
    eligible: (hero) => hero.armor < 10,
  },
  {
    id: "emergency-repair",
    name: "紧急修复",
    rarity: "rare",
    description: "恢复 2 点生命，不超过最大生命。",
    eligible: (hero) => hero.life < hero.maxLife,
  },
  {
    id: "resilience",
    name: "韧性提升",
    rarity: "rare",
    description: "受击无敌时间 +0.1 秒，最高 0.8 秒。",
    eligible: (hero) => hero.invulnerableMs < 800,
  },
  {
    id: "lightweight",
    name: "轻量化",
    rarity: "common",
    description: "跳跃高度提升 15%，最多 3 次。",
    eligible: (hero) => hero.jumpScaleCount < 3,
  },
  {
    id: "flight-module",
    name: "飞行模块",
    rarity: "epic",
    description: "立即进入 10 秒飞行状态。",
    eligible: () => true,
  },
  {
    id: "flight-endurance",
    name: "飞行续航",
    rarity: "rare",
    description: "飞行持续时间 +3 秒，最高 19 秒。",
    eligible: (hero) => hero.flightDurationMs < CONFIG.MAX_FLIGHT_MS,
  },
  {
    id: "jump-jet",
    name: "起跳喷射",
    rarity: "rare",
    description: "起跳速度再提升 10%，最多 3 次。",
    eligible: (hero) => hero.jumpBoostCount < 3,
  },
  {
    id: "exp-boost",
    name: "经验增幅",
    rarity: "rare",
    description: "击杀经验获取 +20%，最多 3 次。",
    eligible: (hero) => hero.expBoostCount < 3,
  },
  {
    id: "lucky-search",
    name: "幸运检索",
    rarity: "epic",
    description: "后续升级时更容易刷出稀有和史诗卡。",
    eligible: (hero) => hero.luckyCount < 2,
  },
  {
    id: "bounty-module",
    name: "赏金模块",
    rarity: "rare",
    description: "击杀得分 +25%，最多 3 次。",
    eligible: (hero) => hero.bountyCount < 3,
  },
];

class Game {
  constructor(canvas, assets) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.assets = assets;
    this.hooks = {};
    this.hero = new Hero(assets);
    this.encounterDirector = new EncounterDirector(assets);
    this.reset();
  }

  setHooks(hooks) {
    this.hooks = hooks ?? {};
  }

  reset() {
    this.state = GAME_STATE.START;
    this.nowMs = 0;
    this.elapsedMs = 0;
    this.meters = 0;
    this.gameSpeed = CONFIG.INITIAL_SPEED;
    this.difficultyTier = 0;
    this.bgOffset = 0;
    this.entities = [];
    this.playerProjectiles = [];
    this.enemyProjectiles = [];
    this.explosions = [];
    this.pendingLevelUps = 0;
    this.currentUpgradeChoices = [];
    this.killScore = 0;
    this.killCount = 0;
    this.bossKillCount = 0;
    this.announcement = "";
    this.announcementMs = 0;
    this.hitStopMs = 0;
    this.hero.reset();
    this.encounterDirector.reset();
    this._notifyState();
  }

  start() {
    this.reset();
    this.state = GAME_STATE.PLAYING;
    this._notifyState();
    audioManager.init().then(() => {
      audioManager.playBackgroundMusic();
    }).catch(() => {});
  }

  restart() {
    this.start();
  }

  pause() {
    if (this.state !== GAME_STATE.PLAYING) {
      return;
    }

    this.state = GAME_STATE.PAUSED;
    audioManager.pauseBackgroundMusic();
    this._notifyState();
  }

  resume() {
    if (this.state !== GAME_STATE.PAUSED) {
      return;
    }

    this.state = GAME_STATE.PLAYING;
    audioManager.resume();
    this._notifyState();
  }

  update(deltaMs) {
    this.nowMs += deltaMs;

    if (this.announcementMs > 0) {
      this.announcementMs = Math.max(0, this.announcementMs - deltaMs);
      if (this.announcementMs === 0) {
        this.announcement = "";
      }
    }

    if (this.state !== GAME_STATE.PLAYING) {
      this._updateEffects(deltaMs);
      return;
    }

    if (this.hitStopMs > 0) {
      this.hitStopMs = Math.max(0, this.hitStopMs - deltaMs);
      this._updateEffects(deltaMs);
      return;
    }

    this.elapsedMs += deltaMs;
    this.difficultyTier = Math.floor(this.meters / CONFIG.SPEED_MILESTONE_INTERVAL);
    this.gameSpeed = clamp(
      CONFIG.INITIAL_SPEED + this.difficultyTier * CONFIG.SPEED_STEP,
      CONFIG.INITIAL_SPEED,
      CONFIG.MAX_SPEED
    );

    const worldSpeedPx = this._getWorldSpeedPx();
    this.bgOffset = (this.bgOffset + worldSpeedPx * (deltaMs / 1000)) % CONFIG.BASE_WIDTH;
    this.meters += this.gameSpeed * deltaMs * 0.105;

    this.hero.update(deltaMs);
    this._spawnEntities(deltaMs);
    this._updateEntities(deltaMs, worldSpeedPx);
    this._handleProjectileCollisions();
    this._handleHeroCollisions();
    this._cleanup();
    this._updateEffects(deltaMs);

    if (this.hero.life <= 0) {
      this.gameOver();
      return;
    }

    if (this.pendingLevelUps > 0) {
      this._enterLevelUp();
    }
  }

  advanceTime(ms) {
    const stepMs = 1000 / 60;
    let remaining = ms;

    while (remaining > 0) {
      const slice = Math.min(stepMs, remaining);
      this.update(slice);
      remaining -= slice;
    }

    this.render();
    return Promise.resolve();
  }

  jump() {
    if (this.state !== GAME_STATE.PLAYING) {
      return;
    }

    if (this.hero.jump()) {
      audioManager.playJumpSound();
    }
  }

  shoot() {
    if (this.state !== GAME_STATE.PLAYING) {
      return;
    }

    const bullets = this.hero.shoot(this.nowMs);
    if (bullets.length > 0) {
      this.playerProjectiles.push(...bullets);
      audioManager.playShootSound();
    }
  }

  fireMissile() {
    if (this.state !== GAME_STATE.PLAYING) {
      return;
    }

    const missile = this.hero.fireMissile(this.nowMs);
    if (missile) {
      this.playerProjectiles.push(missile);
      audioManager.playMissileSound();
    }
  }

  chooseUpgrade(index) {
    if (this.state !== GAME_STATE.LEVELUP) {
      return;
    }

    const card = this.currentUpgradeChoices[index];
    if (!card) {
      return;
    }

    this.hero.applyUpgrade(card);
    this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1);
    this.currentUpgradeChoices = [];

    if (card.id === "flight-module") {
      this._announce("Flight Online");
    } else {
      this._announce(card.name);
    }

    if (this.pendingLevelUps > 0) {
      this.currentUpgradeChoices = this._buildUpgradeChoices();
      this._emitUpgradeChoices();
      return;
    }

    this.state = GAME_STATE.PLAYING;
    this._emitUpgradeChoices();
    this._notifyState();
  }

  gameOver() {
    if (this.state === GAME_STATE.GAMEOVER) {
      return;
    }

    this.state = GAME_STATE.GAMEOVER;
    audioManager.stopBackgroundMusic();
    audioManager.playGameOverSound();
    this._notifyState();
    this.hooks.onGameOver?.(this.getFinalSummary());
  }

  getCurrentScore() {
    return Math.floor(this.meters) * 10 + Math.round(this.killScore) + this.hero.level * 100;
  }

  getFinalSummary() {
    return {
      score: this.getCurrentScore(),
      distance: Math.floor(this.meters),
      kills: this.killCount,
      bossKills: this.bossKillCount,
      level: this.hero.level,
      build: this.hero.upgradeHistory.length > 0 ? this.hero.upgradeHistory.join(" / ") : "未成型构筑",
    };
  }

  getTextSnapshot() {
    const payload = {
      coordinateSystem: {
        origin: "top-left",
        x: "right",
        y: "down",
      },
      mode: this._stateName(),
      meters: Math.floor(this.meters),
      score: this.getCurrentScore(),
      gameSpeed: Number(this.gameSpeed.toFixed(2)),
      hero: {
        x: Math.round(this.hero.x),
        y: Math.round(this.hero.y),
        width: this.hero.width,
        height: this.hero.height,
        velocityY: Number(this.hero.velocityY.toFixed(2)),
        life: this.hero.life,
        maxLife: this.hero.maxLife,
        armor: this.hero.armor,
        level: this.hero.level,
        exp: this.hero.exp,
        nextLevelExp: this.hero.nextLevelExp,
        fireLevel: this.hero.fireLevel,
        missileCount: this.hero.missileCount,
        isFlying: this.hero.isFlying,
        isJumping: this.hero.isJumping,
      },
      entities: this.entities.map((entity) => ({
        type: entity.type,
        x: Math.round(entity.x),
        y: Math.round(entity.y),
        width: entity.width,
        height: entity.height,
        hp: Number.isFinite(entity.hp) ? entity.hp : null,
      })),
      playerProjectiles: this.playerProjectiles.map((projectile) => ({
        x: Math.round(projectile.x),
        y: Math.round(projectile.y),
        damage: projectile.damage,
        explosive: projectile.explosive,
      })),
      enemyProjectiles: this.enemyProjectiles.map((projectile) => ({
        x: Math.round(projectile.x),
        y: Math.round(projectile.y),
        damage: projectile.damage,
      })),
      levelUpChoices: this.currentUpgradeChoices.map((card) => ({
        name: card.name,
        rarity: card.rarity,
      })),
      runSummary: {
        kills: this.killCount,
        bossKills: this.bossKillCount,
        build: this.hero.upgradeHistory,
      },
    };

    return JSON.stringify(payload, null, 2);
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CONFIG.BASE_WIDTH, CONFIG.BASE_HEIGHT);
    this._renderBackground(ctx);

    for (const entity of this.entities) {
      entity.render(ctx);
    }

    for (const projectile of this.playerProjectiles) {
      projectile.render(ctx);
    }

    for (const projectile of this.enemyProjectiles) {
      projectile.render(ctx);
    }

    this.hero.render(ctx, this.nowMs);

    for (const explosion of this.explosions) {
      explosion.render(ctx);
    }

    this._renderHud(ctx);
    this._renderAnnouncement(ctx);
  }

  _spawnEntities(deltaMs) {
    const spawn = this.encounterDirector.update(deltaMs, {
      meters: this.meters,
      gameSpeed: this.gameSpeed,
      difficultyTier: this.difficultyTier,
      entities: this.entities,
    });

    if (!spawn) {
      return;
    }

    this.entities.push(spawn);

    if (spawn.type === "boss") {
      this._announce("Boss Incoming");
      audioManager.playBossAppearSound();
    } else if (spawn.type === "enemy" || spawn.type === "elite") {
      audioManager.playEnemyAppearSound();
    }
  }

  _updateEntities(deltaMs, worldSpeedPx) {
    for (const entity of this.entities) {
      entity.update(deltaMs, worldSpeedPx);
      if (entity.type === "boss" && entity.shouldFire()) {
        this.enemyProjectiles.push(entity.fireMissile());
      }
    }

    for (const projectile of this.playerProjectiles) {
      projectile.update(deltaMs);
    }

    for (const projectile of this.enemyProjectiles) {
      projectile.update(deltaMs);
    }
  }

  _handleProjectileCollisions() {
    for (const projectile of this.playerProjectiles) {
      if (!projectile.active) {
        continue;
      }

      for (const entity of this.entities) {
        if (!entity.active || entity.type === "obstacle") {
          continue;
        }

        if (!checkHit(projectile, entity)) {
          continue;
        }

        if (projectile.explosive) {
          this._explodeMissile(projectile, entity);
        }

        const killed = entity.takeDamage(projectile.damage);
        if (killed) {
          this._handleEnemyKilled(entity);
        }

        if (!projectile.penetrate) {
          projectile.active = false;
          break;
        }
      }
    }
  }

  _explodeMissile(projectile, primaryTarget) {
    const centerX = projectile.x + projectile.width / 2;
    const centerY = projectile.y + projectile.height / 2;
    const radius = 74;
    this.explosions.push(new Explosion(centerX, centerY, radius, this.assets));

    for (const entity of this.entities) {
      if (!entity.active || entity.type === "obstacle" || entity === primaryTarget) {
        continue;
      }

      const targetCenterX = entity.x + entity.width / 2;
      const targetCenterY = entity.y + entity.height / 2;
      const distance = Math.hypot(targetCenterX - centerX, targetCenterY - centerY);

      if (distance > radius) {
        continue;
      }

      const killed = entity.takeDamage(2);
      if (killed) {
        this._handleEnemyKilled(entity);
      }
    }
  }

  _handleHeroCollisions() {
    const heroHitbox = this.hero.getHitbox();

    for (const entity of this.entities) {
      if (!entity.active) {
        continue;
      }

      if (entity.type === "obstacle" && this.hero.isFlying) {
        continue;
      }

      if (!rectsOverlap(heroHitbox, entity.getHitbox())) {
        continue;
      }

      audioManager.playHitSound();
      const dead = this.hero.takeDamage(entity.damage, this.nowMs);
      this.hitStopMs = entity.type === "obstacle" ? 1000 : 220;
      if (dead) {
        return;
      }
      break;
    }

    for (const projectile of this.enemyProjectiles) {
      if (!projectile.active || !rectsOverlap(heroHitbox, projectile.getHitbox())) {
        continue;
      }

      projectile.active = false;
      audioManager.playHitSound();
      const dead = this.hero.takeDamage(projectile.damage, this.nowMs);
      this.hitStopMs = 180;
      if (dead) {
        return;
      }
    }
  }

  _handleEnemyKilled(entity) {
    if (!entity.active && entity.type !== "obstacle") {
      const centerX = entity.x + entity.width / 2;
      const centerY = entity.y + entity.height / 2;
      this.explosions.push(new Explosion(centerX, centerY, entity.type === "boss" ? 96 : 54, this.assets));
    }

    const levelsGained = this.hero.gainExp(entity.expReward);
    this.pendingLevelUps += levelsGained;
    this.killCount += 1;
    if (entity.type === "boss") {
      this.bossKillCount += 1;
      this.hitStopMs = 320;
      this._announce("Boss Down");
    }
    this.killScore += entity.scoreReward * this.hero.getKillScoreMultiplier();
  }

  _enterLevelUp() {
    this.state = GAME_STATE.LEVELUP;
    this.currentUpgradeChoices = this._buildUpgradeChoices();
    this._emitUpgradeChoices();
    this._notifyState();
  }

  _buildUpgradeChoices() {
    const eligible = UPGRADE_DEFINITIONS.filter((card) => card.eligible(this.hero));
    if (eligible.length <= 3) {
      return eligible;
    }

    const rarityWeights = {
      common: 60,
      rare: 30 + this.hero.luckyCount * 10,
      epic: 10 + this.hero.luckyCount * 5,
    };

    const choices = [];
    const pool = [...eligible];
    while (choices.length < 3 && pool.length > 0) {
      const selected = weightedChoice(
        pool.map((card) => ({
          value: card,
          weight: rarityWeights[card.rarity] ?? 10,
        }))
      );
      choices.push(selected);
      const index = pool.findIndex((item) => item.id === selected.id);
      pool.splice(index, 1);
    }

    return choices;
  }

  _updateEffects(deltaMs) {
    for (const explosion of this.explosions) {
      explosion.update(deltaMs);
    }
  }

  _cleanup() {
    this.entities = this.entities.filter((entity) => entity.active);
    this.playerProjectiles = this.playerProjectiles.filter((projectile) => projectile.active);
    this.enemyProjectiles = this.enemyProjectiles.filter((projectile) => projectile.active);
    this.explosions = this.explosions.filter((explosion) => explosion.active);
  }

  _renderBackground(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, CONFIG.BASE_HEIGHT);
    gradient.addColorStop(0, "#193456");
    gradient.addColorStop(0.55, "#2b5575");
    gradient.addColorStop(1, "#0e1724");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CONFIG.BASE_WIDTH, CONFIG.BASE_HEIGHT);

    const background = this.assets.get("background");
    if (background) {
      const drawWidth = CONFIG.BASE_WIDTH;
      ctx.globalAlpha = 0.22;
      ctx.drawImage(background, -this.bgOffset * 0.28, 12, drawWidth, 320);
      ctx.drawImage(background, drawWidth - this.bgOffset * 0.28, 12, drawWidth, 320);
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = "#1b3146";
    ctx.fillRect(0, CONFIG.GROUND_Y + 22, CONFIG.BASE_WIDTH, CONFIG.BASE_HEIGHT - CONFIG.GROUND_Y - 22);

    ctx.fillStyle = "#325b35";
    ctx.fillRect(0, CONFIG.GROUND_Y + 10, CONFIG.BASE_WIDTH, 24);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.setLineDash([18, 18]);
    ctx.beginPath();
    ctx.moveTo(0, CONFIG.GROUND_Y + 4);
    ctx.lineTo(CONFIG.BASE_WIDTH, CONFIG.GROUND_Y + 4);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  _renderHud(ctx) {
    ctx.save();
    ctx.fillStyle = "rgba(7, 14, 22, 0.54)";
    ctx.fillRect(18, 18, 302, 116);
    ctx.fillRect(758, 18, 248, 128);

    ctx.fillStyle = "#f5f8fc";
    ctx.font = "600 20px Segoe UI";
    ctx.fillText(`距离 ${formatMeters(this.meters)}`, 32, 46);
    ctx.fillText(`得分 ${this.getCurrentScore()}`, 32, 74);
    ctx.fillText(`等级 Lv.${this.hero.level}`, 32, 102);

    ctx.font = "600 16px Segoe UI";
    ctx.fillStyle = "#b2c5d9";
    ctx.fillText(`击杀 ${this.killCount}`, 772, 44);
    ctx.fillText(`Boss ${this.bossKillCount}`, 772, 68);
    ctx.fillText(`护甲 ${this.hero.armor}`, 772, 92);
    ctx.fillText(`导弹 ${this.hero.missileCount}`, 772, 116);

    ctx.fillStyle = "#ff8f6a";
    for (let index = 0; index < this.hero.maxLife; index += 1) {
      const filled = index < this.hero.life;
      ctx.globalAlpha = filled ? 1 : 0.18;
      ctx.fillRect(772 + index * 22, 132, 16, 10);
    }
    ctx.globalAlpha = 1;

    const expRatio = this.hero.exp / this.hero.nextLevelExp;
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.fillRect(32, 118, 270, 10);
    ctx.fillStyle = "#56b6ff";
    ctx.fillRect(32, 118, 270 * expRatio, 10);
    ctx.restore();
  }

  _renderAnnouncement(ctx) {
    if (!this.announcement) {
      return;
    }

    ctx.save();
    ctx.font = "700 28px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff7e8";
    ctx.fillText(this.announcement, CONFIG.BASE_WIDTH / 2, 74);
    ctx.restore();
  }

  _announce(text) {
    this.announcement = text;
    this.announcementMs = 1600;
  }

  _getWorldSpeedPx() {
    return 230 + this.gameSpeed * 38;
  }

  _stateName() {
    switch (this.state) {
      case GAME_STATE.START:
        return "start";
      case GAME_STATE.PLAYING:
        return "playing";
      case GAME_STATE.PAUSED:
        return "paused";
      case GAME_STATE.GAMEOVER:
        return "gameover";
      case GAME_STATE.LEVELUP:
        return "levelup";
      default:
        return "unknown";
    }
  }

  _emitUpgradeChoices() {
    this.hooks.onUpgradeChoices?.(this.currentUpgradeChoices, this.pendingLevelUps);
  }

  _notifyState() {
    this.hooks.onStateChange?.(this.state);
  }
}
