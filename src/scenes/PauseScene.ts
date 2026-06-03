import Phaser from "phaser";
import { addText } from "../ui/text";

export class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: "PauseScene" });
  }

  create() {
    const { width, height } = this.scale;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x070c14, 0.84);
    overlay.fillRect(0, 0, width, height);

    const panel = this.add.graphics();
    panel.fillStyle(0x080c18, 0.95);
    panel.fillRoundedRect(width * 0.2, height * 0.15, width * 0.6, height * 0.7, 28);
    panel.lineStyle(1, 0x84d0ff, 0.25);
    panel.strokeRoundedRect(width * 0.2, height * 0.15, width * 0.6, height * 0.7, 28);

    const eyebrow = addText(this,width / 2, height * 0.26, "PAUSED", {
      fontSize: "13px",
      color: "#ffb36b",
      letterSpacing: 4,
      align: "center",
    });
    eyebrow.setOrigin(0.5);

    const title = addText(this,width / 2, height * 0.36, "游戏暂停", {
      fontSize: "36px",
      fontStyle: "bold",
      color: "#f3f7fb",
      align: "center",
    });
    title.setOrigin(0.5);

    const desc = addText(this,width / 2, height * 0.48, "继续战斗，或者重新开一局。", {
      fontSize: "16px",
      color: "#b3c4d6",
      align: "center",
    });
    desc.setOrigin(0.5);

    const resumeBtnBg = this.add.graphics();
    resumeBtnBg.fillGradientStyle(0xff7147, 0xff7147, 0xffb36b, 0xffb36b, 1);
    resumeBtnBg.fillRoundedRect(width / 2 - 170, height * 0.6 - 22, 150, 44, 22);

    const resumeBtn = addText(this,width / 2 - 95, height * 0.6, "继续", {
      fontSize: "18px",
      fontStyle: "bold",
      color: "#f3f7fb",
      align: "center",
    });
    resumeBtn.setOrigin(0.5);
    resumeBtn.setInteractive({ useHandCursor: true });
    resumeBtn.on("pointerdown", () => this.resumeGame());
    resumeBtn.on("pointerover", () => resumeBtn.setScale(1.05));
    resumeBtn.on("pointerout", () => resumeBtn.setScale(1));

    const restartBtnBg = this.add.graphics();
    restartBtnBg.fillStyle(0xffffff, 0.08);
    restartBtnBg.fillRoundedRect(width / 2 + 20, height * 0.6 - 22, 150, 44, 22);
    restartBtnBg.lineStyle(1, 0xffffff, 0.1);
    restartBtnBg.strokeRoundedRect(width / 2 + 20, height * 0.6 - 22, 150, 44, 22);

    const restartBtn = addText(this,width / 2 + 95, height * 0.6, "重新开始", {
      fontSize: "18px",
      fontStyle: "bold",
      color: "#f3f7fb",
      align: "center",
    });
    restartBtn.setOrigin(0.5);
    restartBtn.setInteractive({ useHandCursor: true });
    restartBtn.on("pointerdown", () => this.restartGame());
    restartBtn.on("pointerover", () => restartBtn.setScale(1.05));
    restartBtn.on("pointerout", () => restartBtn.setScale(1));

    if (this.input.keyboard) {
      this.input.keyboard.on("keydown-P", () => this.resumeGame());
      this.input.keyboard.on("keydown-ESC", () => this.resumeGame());
    }
  }

  private resumeGame() {
    const gameScene = this.scene.get("GameScene") as import("./GameScene").GameScene;
    gameScene.resumeGame();
  }

  private restartGame() {
    const gameScene = this.scene.get("GameScene") as import("./GameScene").GameScene;
    gameScene.restartGame();
  }
}
