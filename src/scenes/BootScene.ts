import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    const imageFiles: [string, string][] = [
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

    for (const [key, filename] of imageFiles) {
      this.load.image(key, `images/${filename}`);
    }

    const audioFiles: [string, string][] = [
      ["bgm", "bgm.wav"],
      ["jump", "jump.wav"],
      ["shoot", "shoot.wav"],
      ["missile", "missile.wav"],
      ["hit", "hit.wav"],
      ["enemy_spawn", "enemy_spawn.wav"],
      ["boss_spawn", "boss_spawn.wav"],
      ["gameover", "gameover.wav"],
    ];

    for (const [key, filename] of audioFiles) {
      this.load.audio(key, `audio/${filename}`);
    }
  }

  create() {
    this.scene.start("MenuScene");
  }
}
