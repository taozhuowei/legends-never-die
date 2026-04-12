class AudioManager {
  constructor() {
    this.enabled = true;
    this.initialized = false;
    this.bgm = null;
    this.sounds = new Map();
    this.soundConfig = {
      bgm: { src: "/audio/bgm.wav", volume: 0.12, loop: true },
      jump: { src: "/audio/jump.wav", volume: 0.25 },
      shoot: { src: "/audio/shoot.wav", volume: 0.22 },
      missile: { src: "/audio/missile.wav", volume: 0.22 },
      hit: { src: "/audio/hit.wav", volume: 0.26 },
      enemy_spawn: { src: "/audio/enemy_spawn.wav", volume: 0.18 },
      boss_spawn: { src: "/audio/boss_spawn.wav", volume: 0.26 },
      gameover: { src: "/audio/gameover.wav", volume: 0.26 },
    };
  }

  async init() {
    if (this.initialized) {
      return;
    }

    const entries = Object.entries(this.soundConfig);
    await Promise.all(entries.map(([name, config]) => this._load(name, config)));
    this.initialized = true;
  }

  _load(name, config) {
    return new Promise((resolve) => {
      const audio = new Audio(config.src);
      audio.preload = "auto";
      audio.loop = Boolean(config.loop);
      audio.volume = config.volume;
      audio.addEventListener("canplaythrough", () => resolve(), { once: true });
      audio.addEventListener("error", () => resolve(), { once: true });

      if (name === "bgm") {
        this.bgm = audio;
      } else {
        this.sounds.set(name, audio);
      }
    });
  }

  _playSound(name) {
    if (!this.enabled) {
      return;
    }

    const sound = this.sounds.get(name);
    if (!sound) {
      return;
    }

    const clone = sound.cloneNode();
    clone.volume = sound.volume;
    clone.play().catch(() => {});
  }

  playBackgroundMusic() {
    if (!this.enabled || !this.bgm) {
      return;
    }

    this.bgm.currentTime = 0;
    this.bgm.play().catch(() => {});
  }

  pauseBackgroundMusic() {
    this.bgm?.pause();
  }

  stopBackgroundMusic() {
    if (!this.bgm) {
      return;
    }

    this.bgm.pause();
    this.bgm.currentTime = 0;
  }

  resume() {
    if (!this.enabled) {
      return;
    }

    this.bgm?.play().catch(() => {});
  }

  playJumpSound() {
    this._playSound("jump");
  }

  playShootSound() {
    this._playSound("shoot");
  }

  playMissileSound() {
    this._playSound("missile");
  }

  playHitSound() {
    this._playSound("hit");
  }

  playEnemyAppearSound() {
    this._playSound("enemy_spawn");
  }

  playBossAppearSound() {
    this._playSound("boss_spawn");
  }

  playGameOverSound() {
    this._playSound("gameover");
  }
}

const audioManager = new AudioManager();
