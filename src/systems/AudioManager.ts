import Phaser from "phaser";

export class AudioManager {
  private scene: Phaser.Scene;
  private bgm?: Phaser.Sound.BaseSound;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  init() {
    if (this.scene.sound instanceof Phaser.Sound.WebAudioSoundManager) {
      this.scene.sound.setVolume(0.5);
    }
  }

  playBgm() {
    if (this.bgm?.isPlaying) return;
    this.bgm = this.scene.sound.add("bgm", { volume: 0.12, loop: true });
    (this.bgm as Phaser.Sound.WebAudioSound).play();
  }

  stopBgm() {
    if (this.bgm) {
      (this.bgm as Phaser.Sound.WebAudioSound).stop();
    }
  }

  pauseBgm() {
    if (this.bgm && (this.bgm as Phaser.Sound.WebAudioSound).isPlaying) {
      (this.bgm as Phaser.Sound.WebAudioSound).pause();
    }
  }

  resumeBgm() {
    if (this.bgm && (this.bgm as Phaser.Sound.WebAudioSound).isPaused) {
      (this.bgm as Phaser.Sound.WebAudioSound).resume();
    }
  }

  playJump() {
    this.scene.sound.play("jump", { volume: 0.25 });
  }

  playShoot() {
    this.scene.sound.play("shoot", { volume: 0.22 });
  }

  playMissile() {
    this.scene.sound.play("missile", { volume: 0.22 });
  }

  playHit() {
    this.scene.sound.play("hit", { volume: 0.26 });
  }

  playEnemySpawn() {
    this.scene.sound.play("enemy_spawn", { volume: 0.18 });
  }

  playBossSpawn() {
    this.scene.sound.play("boss_spawn", { volume: 0.26 });
  }

  playGameOver() {
    this.scene.sound.play("gameover", { volume: 0.26 });
  }
}
