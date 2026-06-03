import Phaser from "phaser";
import { UpgradeCard } from "../types";
import { addText } from "../ui/text";

export class LevelUpScene extends Phaser.Scene {
  constructor() {
    super({ key: "LevelUpScene" });
  }

  create(data: { choices: UpgradeCard[]; pendingLevelUps: number }) {
    const { width, height } = this.scale;
    const { choices, pendingLevelUps } = data;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x070c14, 0.84);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(0);

    const panel = this.add.graphics();
    panel.fillStyle(0x080c18, 0.95);
    panel.fillRoundedRect(width * 0.06, height * 0.08, width * 0.88, height * 0.84, 28);
    panel.lineStyle(1, 0x84d0ff, 0.25);
    panel.strokeRoundedRect(width * 0.06, height * 0.08, width * 0.88, height * 0.84, 28);
    panel.setDepth(1);

    const eyebrow = addText(this,width / 2, height * 0.16, "LEVEL UP", {
      fontSize: "13px",
      color: "#ffb36b",
      letterSpacing: 4,
      align: "center",
    });
    eyebrow.setOrigin(0.5);
    eyebrow.setDepth(2);

    const title = addText(this,width / 2, height * 0.24, "选择 1 张升级卡", {
      fontSize: "32px",
      fontStyle: "bold",
      color: "#f3f7fb",
      align: "center",
    });
    title.setOrigin(0.5);
    title.setDepth(2);

    const copy = pendingLevelUps > 1
      ? `按 1 / 2 / 3 或点击卡片。剩余 ${pendingLevelUps} 次升级选择。`
      : "按 1 / 2 / 3 或直接点击卡片。";
    const subtitle = addText(this,width / 2, height * 0.33, copy, {
      fontSize: "16px",
      color: "#b3c4d6",
      align: "center",
    });
    subtitle.setOrigin(0.5);
    subtitle.setDepth(2);

    const cardWidth = Math.min(280, (width * 0.84 - 28) / 3);
    const startX = width / 2 - (choices.length * (cardWidth + 14)) / 2 + 7;

    const rarityColors: Record<string, number> = {
      common: 0xffffff,
      rare: 0x56b6ff,
      epic: 0xff8df1,
    };

    choices.forEach((card, index) => {
      const cx = startX + index * (cardWidth + 14);
      const cy = height * 0.42;
      const ch = height * 0.42;

      const cardBg = this.add.graphics();
      cardBg.fillStyle(0xffffff, 0.05);
      cardBg.fillRoundedRect(cx, cy, cardWidth, ch, 22);
      cardBg.lineStyle(1, rarityColors[card.rarity] ?? 0xffffff, 0.3);
      cardBg.strokeRoundedRect(cx, cy, cardWidth, ch, 22);
      cardBg.setDepth(2);

      const keyLabel = addText(this,cx + 16, cy + 16, `${index + 1}`, {
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffb36b",
      });
      keyLabel.setDepth(3);

      const cardName = addText(this,cx + cardWidth / 2, cy + ch * 0.3, card.name, {
        fontSize: "20px",
        fontStyle: "bold",
        color: "#f3f7fb",
        align: "center",
        wordWrap: { width: cardWidth - 32 },
      });
      cardName.setOrigin(0.5);
      cardName.setDepth(3);

      const cardDesc = addText(this,cx + cardWidth / 2, cy + ch * 0.52, card.description, {
        fontSize: "14px",
        color: "#b3c4d6",
        align: "center",
        wordWrap: { width: cardWidth - 32 },
      });
      cardDesc.setOrigin(0.5);
      cardDesc.setDepth(3);

      const rarityLabel = addText(this,cx + cardWidth / 2, cy + ch * 0.78, card.rarity.toUpperCase(), {
        fontSize: "12px",
        color: Phaser.Display.Color.IntegerToColor(rarityColors[card.rarity] ?? 0xffffff).rgba,
        align: "center",
      });
      rarityLabel.setOrigin(0.5);
      rarityLabel.setDepth(3);

      const hitArea = this.add.rectangle(cx, cy, cardWidth, ch, 0x000000, 0);
      hitArea.setOrigin(0, 0);
      hitArea.setDepth(4);
      hitArea.setInteractive({ useHandCursor: true });

      hitArea.on("pointerover", () => {
        cardBg.clear();
        cardBg.fillStyle(0xffffff, 0.08);
        cardBg.fillRoundedRect(cx, cy, cardWidth, ch, 22);
        cardBg.lineStyle(2, rarityColors[card.rarity] ?? 0xffffff, 0.6);
        cardBg.strokeRoundedRect(cx, cy, cardWidth, ch, 22);
      });
      hitArea.on("pointerout", () => {
        cardBg.clear();
        cardBg.fillStyle(0xffffff, 0.05);
        cardBg.fillRoundedRect(cx, cy, cardWidth, ch, 22);
        cardBg.lineStyle(1, rarityColors[card.rarity] ?? 0xffffff, 0.3);
        cardBg.strokeRoundedRect(cx, cy, cardWidth, ch, 22);
      });
      hitArea.on("pointerdown", () => {
        const gameScene = this.scene.get("GameScene") as import("./GameScene").GameScene;
        gameScene.chooseUpgrade(index);
      });
    });

    if (this.input.keyboard) {
      this.input.keyboard.on("keydown-ONE", () => {
        const gameScene = this.scene.get("GameScene") as import("./GameScene").GameScene;
        gameScene.chooseUpgrade(0);
      });
      this.input.keyboard.on("keydown-TWO", () => {
        const gameScene = this.scene.get("GameScene") as import("./GameScene").GameScene;
        gameScene.chooseUpgrade(1);
      });
      this.input.keyboard.on("keydown-THREE", () => {
        const gameScene = this.scene.get("GameScene") as import("./GameScene").GameScene;
        gameScene.chooseUpgrade(2);
      });
    }
  }
}
