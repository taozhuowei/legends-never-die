class Projectile {
  constructor({
    x,
    y,
    width,
    height,
    speed,
    damage,
    assets,
    imageKey = null,
    penetrate = false,
    fromEnemy = false,
    explosive = false,
  }) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.speed = speed;
    this.damage = damage;
    this.assets = assets;
    this.imageKey = imageKey;
    this.penetrate = penetrate;
    this.fromEnemy = fromEnemy;
    this.explosive = explosive;
    this.active = true;
  }

  update(deltaMs) {
    const direction = this.fromEnemy ? -1 : 1;
    this.x += direction * this.speed * (deltaMs / 1000);

    if (this.x > CONFIG.BASE_WIDTH + 120 || this.x < -140) {
      this.active = false;
    }
  }

  getHitbox() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  render(ctx) {
    const image = this.imageKey ? this.assets.get(this.imageKey) : null;
    if (image) {
      ctx.drawImage(image, this.x, this.y, this.width, this.height);
      return;
    }

    ctx.fillStyle = this.fromEnemy ? "#ff8a65" : "#ffd54a";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

class Bullet extends Projectile {
  constructor(x, y, assets, damage = 1) {
    super({
      x,
      y,
      width: 30,
      height: 12,
      speed: 520,
      damage,
      assets,
      imageKey: "bullet",
    });
  }
}

class Missile extends Projectile {
  constructor(x, y, assets, explosive = false) {
    super({
      x,
      y,
      width: 42,
      height: 18,
      speed: 420,
      damage: 2,
      assets,
      imageKey: "missileHero",
      penetrate: true,
      explosive,
    });
  }
}

class BossMissile extends Projectile {
  constructor(x, y, assets) {
    super({
      x,
      y,
      width: 36,
      height: 16,
      speed: 480,
      damage: 1,
      assets,
      imageKey: "missileBoss",
      fromEnemy: true,
    });
  }
}

class Explosion {
  constructor(x, y, radius, assets, color = "rgba(255, 188, 96, 0.78)") {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.assets = assets;
    this.color = color;
    this.lifeMs = 240;
    this.active = true;
  }

  update(deltaMs) {
    this.lifeMs -= deltaMs;
    this.active = this.lifeMs > 0;
  }

  render(ctx) {
    const image = this.assets.get("bang");
    const alpha = clamp(this.lifeMs / 240, 0, 1);

    ctx.save();
    ctx.globalAlpha = alpha;

    if (image) {
      ctx.drawImage(image, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
    } else {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
