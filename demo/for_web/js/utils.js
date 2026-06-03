const CONFIG = {
  BASE_WIDTH: 1024,
  BASE_HEIGHT: 560,
  GROUND_Y: 400,
  INITIAL_SPEED: 2.5,
  MAX_SPEED: 8,
  SPEED_MILESTONE_INTERVAL: 800,
  SPEED_STEP: 0.3,
  GRAVITY: 0.4,
  JUMP_VELOCITY: -12,
  SHOOT_COOLDOWN_MS: 200,
  MISSILE_COOLDOWN_MS: 1500,
  INVULNERABLE_MS: 300,
  DEFAULT_FLIGHT_MS: 10000,
  MAX_FLIGHT_MS: 19000,
  HERO_X: 96,
  ASSET_PATH: "/images/",
};

const GAME_STATE = {
  START: 0,
  PLAYING: 1,
  PAUSED: 2,
  GAMEOVER: 3,
  LEVELUP: 4,
};

class AssetLoader {
  constructor() {
    this.images = new Map();
    this.imageManifest = [
      ["background", "background.png"],
      ["hero1", "hero (1).png"],
      ["hero2", "hero (2).png"],
      ["hero3", "hero (3).png"],
      ["hero4", "hero (4).png"],
      ["hero5", "hero (5).png"],
      ["heroFly", "hero-fly.png"],
      ["enemy1", "enemy (1).png"],
      ["enemy2", "enemy (2).png"],
      ["enemy3", "enemy (3).png"],
      ["enemy4", "enemy (4).png"],
      ["enemy5", "enemy (5).png"],
      ["boss", "boss.png"],
      ["obstacle", "obstacle.png"],
      ["bullet", "bullet.png"],
      ["missileHero", "missIle-of-hero.png"],
      ["missileBoss", "missile-of-boss.png"],
      ["shield", "shield.png"],
      ["bang", "bang.png"],
      ["life", "life.png"],
    ];
  }

  loadImage(name, filename) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.images.set(name, img);
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = `${CONFIG.ASSET_PATH}${filename}`;
    });
  }

  async loadAll() {
    await Promise.all(this.imageManifest.map(([name, filename]) => this.loadImage(name, filename)));
  }

  get(name) {
    return this.images.get(name) ?? null;
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(items) {
  return items[randomInt(0, items.length - 1)];
}

function weightedChoice(entries) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = Math.random() * total;

  for (const entry of entries) {
    cursor -= entry.weight;
    if (cursor <= 0) {
      return entry.value;
    }
  }

  return entries[entries.length - 1]?.value ?? null;
}

function sampleWithoutReplacement(items, count) {
  const source = [...items];
  const result = [];

  while (source.length > 0 && result.length < count) {
    const index = randomInt(0, source.length - 1);
    result.push(source[index]);
    source.splice(index, 1);
  }

  return result;
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function checkHit(projectile, target) {
  return rectsOverlap(projectile.getHitbox ? projectile.getHitbox() : projectile, target.getHitbox ? target.getHitbox() : target);
}

function checkCollision(a, b) {
  return checkHit(a, b);
}

function formatMeters(meters) {
  return `${Math.floor(meters)}m`;
}

function createGameLoop(update, render) {
  let animationFrameId = 0;
  let running = false;
  let lastTime = performance.now();

  const step = (timestamp) => {
    if (!running) {
      return;
    }

    const deltaMs = Math.min(50, timestamp - lastTime || 16.67);
    lastTime = timestamp;
    update(deltaMs);
    render();
    animationFrameId = window.requestAnimationFrame(step);
  };

  return {
    start() {
      if (running) {
        return;
      }

      running = true;
      lastTime = performance.now();
      animationFrameId = window.requestAnimationFrame(step);
    },
    stop() {
      running = false;
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
    },
    isRunning() {
      return running;
    },
  };
}
