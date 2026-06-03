import Phaser from "phaser";
import { GameSummary } from "../types";
import { addText } from "../ui/text";

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameOverScene" });
  }

  create(data: { summary: GameSummary }) {
    const { width, height } = this.scale;
    const summary = data.summary;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x070c14, 0.84);
    overlay.fillRect(0, 0, width, height);

    const panel = this.add.graphics();
    panel.fillStyle(0x080c18, 0.95);
    panel.fillRoundedRect(width * 0.15, height * 0.08, width * 0.7, height * 0.84, 28);
    panel.lineStyle(1, 0x84d0ff, 0.25);
    panel.strokeRoundedRect(width * 0.15, height * 0.08, width * 0.7, height * 0.84, 28);

    const eyebrow = addText(this,width / 2, height * 0.16, "RUN COMPLETE", {
      fontSize: "13px",
      color: "#ffb36b",
      letterSpacing: 4,
      align: "center",
    });
    eyebrow.setOrigin(0.5);

    const title = addText(this,width / 2, height * 0.24, "本局结束", {
      fontSize: "36px",
      fontStyle: "bold",
      color: "#f3f7fb",
      align: "center",
    });
    title.setOrigin(0.5);

    const items = [
      `最终得分  ${summary.score}`,
      `跑酷距离  ${summary.distance}m`,
      `击杀总数  ${summary.kills}`,
      `Boss 击杀  ${summary.bossKills}`,
      `最终等级  Lv.${summary.level}`,
      `本局构筑  ${summary.build}`,
    ];

    items.forEach((text, i) => {
      const line = addText(this,width / 2, height * 0.36 + i * 36, text, {
        fontSize: "18px",
        color: "#b3c4d6",
        align: "center",
      });
      line.setOrigin(0.5);
    });

    const btnBg = this.add.graphics();
    const btnX = width / 2 - 100;
    const btnY = height * 0.78 - 22;
    btnBg.fillGradientStyle(0xff7147, 0xff7147, 0xffb36b, 0xffb36b, 1);
    btnBg.fillRoundedRect(btnX, btnY, 200, 44, 22);

    const restartBtn = addText(this,width / 2, height * 0.78, "再来一局", {
      fontSize: "18px",
      fontStyle: "bold",
      color: "#f3f7fb",
      align: "center",
    });
    restartBtn.setOrigin(0.5);
    restartBtn.setInteractive({ useHandCursor: true });

    restartBtn.on("pointerover", () => restartBtn.setScale(1.05));
    restartBtn.on("pointerout", () => restartBtn.setScale(1));
    restartBtn.on("pointerdown", () => {
      const gameScene = this.scene.get("GameScene") as import("./GameScene").GameScene;
      gameScene.restartGame();
    });

    if (this.input.keyboard) {
      this.input.keyboard.on("keydown-ENTER", () => {
        const gameScene = this.scene.get("GameScene") as import("./GameScene").GameScene;
        gameScene.restartGame();
      });
      this.input.keyboard.on("keydown-SPACE", () => {
        const gameScene = this.scene.get("GameScene") as import("./GameScene").GameScene;
        gameScene.restartGame();
      });
    }
  }
}
