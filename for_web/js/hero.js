class Hero {
  constructor(assets) {
    this.assets = assets;
    this.runFrames = ["hero1", "hero2", "hero3", "hero4", "hero5"];
    this.width = 90;
    this.height = 96;
    this.baseBottom = CONFIG.GROUND_Y;
    this.reset();
  }

  reset() {
    this.x = CONFIG.HERO_X;
    this.y = this.baseBottom - this.height;
    this.velocityY = 0;
    this.isJumping = false;
    this.isFlying = false;
    this.flightRemainingMs = 0;
    this.animationTick = 0;
    this.runFrameIndex = 0;

    this.maxLife = 3;
    this.life = 3;
    this.armor = 0;
    this.level = 1;
    this.exp = 0;
    this.nextLevelExp = 10;

    this.fireLevel = 1;
    this.bulletDamageBonus = 0;
    this.missileCount = 0;
    this.shootCooldownMs = CONFIG.SHOOT_COOLDOWN_MS;
    this.missileCooldownMs = CONFIG.MISSILE_COOLDOWN_MS;
    this.invulnerableMs = CONFIG.INVULNERABLE_MS;
    this.invulnerableUntil = 0;
    this.lastShootAt = -Infinity;
    this.lastMissileAt = -Infinity;

    this.jumpScaleCount = 0;
    this.jumpBoostCount = 0;
    this.jumpVelocityModifier = 1;
    this.flightDurationMs = CONFIG.DEFAULT_FLIGHT_MS;
    this.expBoostCount = 0;
    this.luckyCount = 0;
    this.bountyCount = 0;
    this.hasExplosiveMissiles = false;

    this.upgradeHistory = [];
  }

  update(deltaMs) {
    this.animationTick += deltaMs;
    if (this.animationTick >= 90) {
      this.animationTick = 0;
      this.runFrameIndex = (this.runFrameIndex + 1) % this.runFrames.length;
    }

    if (this.isFlying) {
      this.flightRemainingMs -= deltaMs;
      this.y = 180;
      if (this.flightRemainingMs <= 0) {
        this.isFlying = false;
        this.y = this.baseBottom - this.height;
      }
      return;
    }

    if (!this.isJumping && this.y >= this.baseBottom - this.height) {
      this.y = this.baseBottom - this.height;
      return;
    }

    this.isJumping = true;
    this.velocityY += CONFIG.GRAVITY;
    this.y += this.velocityY;

    if (this.y >= this.baseBottom - this.height) {
      this.y = this.baseBottom - this.height;
      this.velocityY = 0;
      this.isJumping = false;
    }
  }

  jump() {
    if (this.isJumping || this.isFlying) {
      return false;
    }

    this.isJumping = true;
    this.velocityY = CONFIG.JUMP_VELOCITY * this.jumpVelocityModifier;
    return true;
  }

  shoot(nowMs) {
    if (nowMs - this.lastShootAt < this.shootCooldownMs) {
      return [];
    }

    this.lastShootAt = nowMs;
    const bullets = [];
    const count = Math.min(this.fireLevel, 5);

    for (let index = 0; index < count; index += 1) {
      const offsetY = -12 + index * 8;
      bullets.push(
        new Bullet(
          this.x + this.width - 4,
          this.y + this.height * 0.35 + offsetY,
          this.assets,
          1 + this.bulletDamageBonus
        )
      );
    }

    return bullets;
  }

  fireMissile(nowMs) {
    if (this.missileCount <= 0 || nowMs - this.lastMissileAt < this.missileCooldownMs) {
      return null;
    }

    this.lastMissileAt = nowMs;
    this.missileCount -= 1;
    return new Missile(
      this.x + this.width - 4,
      this.y + this.height * 0.42,
      this.assets,
      this.hasExplosiveMissiles
    );
  }

  takeDamage(amount, nowMs) {
    if (nowMs < this.invulnerableUntil) {
      return false;
    }

    this.invulnerableUntil = nowMs + this.invulnerableMs;

    let pending = amount;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, pending);
      this.armor -= absorbed;
      pending -= absorbed;
    }

    if (pending > 0) {
      this.life = Math.max(0, this.life - pending);
    }

    return this.life <= 0;
  }

  gainExp(rawAmount) {
    const scaledAmount = Math.round(rawAmount * this.getExpMultiplier());
    this.exp += scaledAmount;

    let levelsGained = 0;
    while (this.exp >= this.nextLevelExp) {
      this.exp -= this.nextLevelExp;
      this.level += 1;
      this.nextLevelExp = this.level * 10;
      levelsGained += 1;
    }

    return levelsGained;
  }

  activateFlight() {
    this.isFlying = true;
    this.isJumping = false;
    this.velocityY = 0;
    this.flightRemainingMs = this.flightDurationMs;
    this.y = 180;
  }

  heal(amount) {
    this.life = clamp(this.life + amount, 0, this.maxLife);
  }

  addLifeUpgrade() {
    this.maxLife += 1;
    this.life = Math.min(this.maxLife, this.life + 1);
  }

  addArmor(amount) {
    this.armor = clamp(this.armor + amount, 0, 10);
  }

  getExpMultiplier() {
    return 1 + this.expBoostCount * 0.2;
  }

  getKillScoreMultiplier() {
    return 1 + this.bountyCount * 0.25;
  }

  getHitbox() {
    return {
      x: this.x + 18,
      y: this.y + 10,
      width: this.width - 28,
      height: this.height - 14,
    };
  }

  applyUpgrade(card) {
    switch (card.id) {
      case "fire-up":
        this.fireLevel = Math.min(5, this.fireLevel + 1);
        break;
      case "shoot-speed":
        this.shootCooldownMs = Math.max(100, this.shootCooldownMs - 20);
        break;
      case "bullet-boost":
        this.bulletDamageBonus = Math.min(4, this.bulletDamageBonus + 1);
        break;
      case "missile-supply":
        this.missileCount += 5;
        break;
      case "explosive-warhead":
        this.hasExplosiveMissiles = true;
        break;
      case "life-up":
        this.addLifeUpgrade();
        break;
      case "armor-up":
        this.addArmor(2);
        break;
      case "emergency-repair":
        this.heal(2);
        break;
      case "resilience":
        this.invulnerableMs = Math.min(800, this.invulnerableMs + 100);
        break;
      case "lightweight":
        this.jumpScaleCount += 1;
        this.jumpVelocityModifier *= 1.15;
        break;
      case "flight-module":
        this.activateFlight();
        break;
      case "flight-endurance":
        this.flightDurationMs = Math.min(CONFIG.MAX_FLIGHT_MS, this.flightDurationMs + 3000);
        break;
      case "jump-jet":
        this.jumpBoostCount += 1;
        this.jumpVelocityModifier *= 1.1;
        break;
      case "exp-boost":
        this.expBoostCount = Math.min(3, this.expBoostCount + 1);
        break;
      case "lucky-search":
        this.luckyCount = Math.min(2, this.luckyCount + 1);
        break;
      case "bounty-module":
        this.bountyCount = Math.min(3, this.bountyCount + 1);
        break;
      default:
        break;
    }

    this.upgradeHistory.push(card.name);
  }

  render(ctx, nowMs) {
    const image = this.isFlying ? this.assets.get("heroFly") : this.assets.get(this.runFrames[this.runFrameIndex]);
    const flashing = nowMs < this.invulnerableUntil && Math.floor(nowMs / 70) % 2 === 0;

    ctx.save();
    if (flashing) {
      ctx.globalAlpha = 0.55;
    }

    if (image) {
      ctx.drawImage(image, this.x, this.y, this.width, this.height);
    } else {
      ctx.fillStyle = "#e6f4ff";
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    if (this.armor > 0) {
      ctx.strokeStyle = "rgba(86, 182, 255, 0.75)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(this.x + this.width / 2, this.y + this.height / 2, this.width * 0.52, this.height * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
