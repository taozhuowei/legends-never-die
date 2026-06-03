import Phaser from "phaser";
import { CONFIG } from "./constants";
import { BootScene } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { GameScene } from "./scenes/GameScene";
import { LevelUpScene } from "./scenes/LevelUpScene";
import { GameOverScene } from "./scenes/GameOverScene";
import { PauseScene } from "./scenes/PauseScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: CONFIG.BASE_WIDTH,
  height: CONFIG.BASE_HEIGHT,
  parent: "game-container",
  backgroundColor: "#081420",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, GameScene, LevelUpScene, GameOverScene, PauseScene],
};

const game = new Phaser.Game(config);

// 开发/测试钩子：仅在 Vite dev 模式下把 game 实例挂到 window，供 e2e 自动化读取内部状态。
if (import.meta.env.DEV) {
  (globalThis as unknown as { __GAME__: Phaser.Game }).__GAME__ = game;
}
