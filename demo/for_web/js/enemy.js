class WorldEntity {
  constructor({
    x,
    y,
    width,
    height,
    hp,
    damage,
    expReward,
    scoreReward,
    type,
    assets,
    imageKey = null,
    speedScale = 1,
  }) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.hp = hp;
    this.damage = damage;
    this.expReward = expReward;
    this.scoreReward = scoreReward;
    this.type = type;
    this.assets = assets;
    this.imageKey = imageKey;
    this.speedScale = speedScale;
    this.active = true;
  }

  update(deltaMs, worldSpeedPx) {
    this.x -= worldSpeedPx * this.speedScale * (deltaMs / 1000);
    this.active = this.x + this.width > -120;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.active = false;
      return true;
    }
    return false;
  }

  getHitbox() {
    return {
      x: this.x + 6,
      y: this.y + 4,
      width: Math.max(8, this.width - 12),
      height: Math.max(8, this.height - 8),
    };
  }

  render(ctx) {
    const image = this.imageKey ? this.assets.get(this.imageKey) : null;

    if (image) {
      ctx.drawImage(image, this.x, this.y, this.width, this.height);
    } else {
      ctx.fillStyle = "#ef5350";
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
  }
}

class Enemy extends WorldEntity {
  constructor(x, assets) {
    super({
      x,
      y: CONFIG.GROUND_Y - 76,
      width: 72,
      height: 76,
      hp: 1,
      damage: 1,
      expReward: 5,
      scoreReward: 20,
      type: "enemy",
      assets,
      imageKey: randomChoice(["enemy1", "enemy2", "enemy3", "enemy4", "enemy5"]),
      speedScale: 1,
    });
  }
}

class EliteEnemy extends WorldEntity {
  constructor(x, assets) {
    super({
      x,
      y: CONFIG.GROUND_Y - 104,
      width: 92,
      height: 104,
      hp: 3,
      damage: 1,
      expReward: 15,
      scoreReward: 80,
      type: "elite",
      assets,
      imageKey: randomChoice(["enemy1", "enemy2", "enemy3", "enemy4", "enemy5"]),
      speedScale: 1.18,
    });
  }

  render(ctx) {
    super.render(ctx);
    ctx.save();
    ctx.strokeStyle = "rgba(86, 182, 255, 0.85)";
    ctx.lineWidth = 3;
    ctx.strokeRect(this.x + 3, this.y + 3, this.width - 6, this.height - 6);
    ctx.restore();
  }
}

class Boss extends WorldEntity {
  constructor(x, assets) {
    super({
      x,
      y: CONFIG.GROUND_Y - 140,
      width: 154,
      height: 140,
      hp: 8,
      damage: 1,
      expReward: 30,
      scoreReward: 200,
      type: "boss",
      assets,
      imageKey: "boss",
      speedScale: 0.82,
    });
    this.fireCooldownMs = 1200;
    this.fireTimerMs = 0;
  }

  update(deltaMs, worldSpeedPx) {
    super.update(deltaMs, worldSpeedPx);
    this.fireTimerMs += deltaMs;
  }

  shouldFire() {
    return this.fireTimerMs >= this.fireCooldownMs;
  }

  fireMissile() {
    this.fireTimerMs = 0;
    return new BossMissile(this.x + 16, this.y + this.height * 0.45, this.assets);
  }

  render(ctx) {
    super.render(ctx);
    const ratio = clamp(this.hp / 8, 0, 1);
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(this.x + 14, this.y - 14, this.width - 28, 8);
    ctx.fillStyle = "#ff7043";
    ctx.fillRect(this.x + 14, this.y - 14, (this.width - 28) * ratio, 8);
  }
}

class Obstacle extends WorldEntity {
  constructor(x, assets) {
    super({
      x,
      y: CONFIG.GROUND_Y - 64,
      width: 76,
      height: 64,
      hp: Number.POSITIVE_INFINITY,
      damage: 1,
      expReward: 0,
      scoreReward: 0,
      type: "obstacle",
      assets,
      imageKey: "obstacle",
      speedScale: 1,
    });
  }

  takeDamage() {
    return false;
  }
}

class EncounterDirector {
  constructor(assets) {
    this.assets = assets;
    this.spawnCooldownMs = 900;
    this.spawnTimerMs = 0;
    this.nextBossDistance = 1200;
    this.nextBossTimeMs = 90000;
    this.timeSinceBossMs = 0;
  }

  reset() {
    this.spawnCooldownMs = 900;
    this.spawnTimerMs = 0;
    this.nextBossDistance = 1200;
    this.nextBossTimeMs = 90000;
    this.timeSinceBossMs = 0;
  }

  update(deltaMs, snapshot) {
    this.spawnTimerMs += deltaMs;
    this.timeSinceBossMs += deltaMs;

    const activeBoss = snapshot.entities.some((entity) => entity.type === "boss");
    const canSpawnBoss = !activeBoss && snapshot.meters >= 1200;
    const bossDue = canSpawnBoss && (
      snapshot.meters >= this.nextBossDistance ||
      this.timeSinceBossMs >= this.nextBossTimeMs
    );

    if (bossDue && this._hasSpace(snapshot.entities, 260)) {
      this.nextBossDistance += 1200;
      this.timeSinceBossMs = 0;
      return new Boss(CONFIG.BASE_WIDTH + 120, this.assets);
    }

    if (this.spawnTimerMs < this.spawnCooldownMs || !this._hasSpace(snapshot.entities, 160)) {
      return null;
    }

    this.spawnTimerMs = 0;
    this.spawnCooldownMs = clamp(1800 - snapshot.gameSpeed * 120 - snapshot.difficultyTier * 80, 800, 1800);

    const table = [{ value: "obstacle", weight: 36 }, { value: "enemy", weight: 64 }];
    if (snapshot.meters >= 300) {
      table.push({ value: "elite", weight: 22 + snapshot.difficultyTier * 2 });
    }

    const result = weightedChoice(table);
    const spawnX = CONFIG.BASE_WIDTH + randomInt(70, 160);

    if (result === "obstacle") {
      return new Obstacle(spawnX, this.assets);
    }
    if (result === "elite") {
      return new EliteEnemy(spawnX, this.assets);
    }
    return new Enemy(spawnX, this.assets);
  }

  _hasSpace(entities, minDistance) {
    return entities.every((entity) => entity.x < CONFIG.BASE_WIDTH - minDistance);
  }
}
