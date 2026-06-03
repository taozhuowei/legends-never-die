import Phaser from "phaser";
import { CONFIG } from "../constants";
import { addText } from "../ui/text";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }

  create() {
    const { width, height } = this.scale;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x193456, 0x193456, 0x0e1724, 0x0e1724, 1);
    bg.fillRect(0, 0, width, height);

    const bgImage = this.add.image(width / 2, height * 0.35, "background");
    bgImage.setAlpha(0.22);
    bgImage.setDisplaySize(width, height * 0.6);

    const panel = this.add.graphics();
    panel.fillStyle(0x080c18, 0.82);
    panel.fillRoundedRect(width * 0.08, height * 0.1, width * 0.84, height * 0.8, 28);
    panel.lineStyle(1, 0x84d0ff, 0.25);
    panel.strokeRoundedRect(width * 0.08, height * 0.1, width * 0.84, height * 0.8, 28);

    const eyebrow = addText(this,width / 2, height * 0.18, "ROGUELIKE RUNNER SHOOTER", {
      fontSize: "13px",
      color: "#ffb36b",
      letterSpacing: 4,
      align: "center",
    });
    eyebrow.setOrigin(0.5);

    const title = addText(this,width / 2, height * 0.28, "Legends Never Die", {
      fontSize: "52px",
      fontStyle: "bold",
      color: "#f3f7fb",
      align: "center",
    });
    title.setOrigin(0.5);

    const desc = addText(this,width / 2, height * 0.42, "自动前进，跳跃规避，射击清场，升级时从三张卡里做一次构筑选择。", {
      fontSize: "16px",
      color: "#b3c4d6",
      align: "center",
      wordWrap: { width: width * 0.6 },
    });
    desc.setOrigin(0.5);

    const controls = addText(this,width / 2, height * 0.56, [
      "键盘操作",
      "",
      "开始  Enter / Space",
      "跳跃  Space",
      "射击  K",
      "导弹  L",
      "暂停  P / Esc",
      "选卡  1 / 2 / 3",
    ].join("\n"), {
      fontSize: "14px",
      color: "#b3c4d6",
      align: "center",
      lineSpacing: 4,
    });
    controls.setOrigin(0.5);

    const btnBg = this.add.graphics();
    const btnX = width / 2 - 100;
    const btnY = height * 0.78 - 22;
    btnBg.fillGradientStyle(0xff7147, 0xff7147, 0xffb36b, 0xffb36b, 1);
    btnBg.fillRoundedRect(btnX, btnY, 200, 44, 22);

    const startBtn = addText(this,width / 2, height * 0.78, "开始游戏", {
      fontSize: "18px",
      fontStyle: "bold",
      color: "#f3f7fb",
      align: "center",
    });
    startBtn.setOrigin(0.5);
    startBtn.setInteractive({ useHandCursor: true });

    startBtn.on("pointerover", () => startBtn.setScale(1.05));
    startBtn.on("pointerout", () => startBtn.setScale(1));
    startBtn.on("pointerdown", () => this.startGame());

    this.input.keyboard!.on("keydown-ENTER", () => this.startGame());
    this.input.keyboard!.on("keydown-SPACE", () => this.startGame());
  }

  private startGame() {
    this.scene.start("GameScene");
  }
}
