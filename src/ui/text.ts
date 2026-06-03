import Phaser from "phaser";

// 统一 UI 字体：替换 Phaser 默认的 Courier（打字机衬线体），改用清晰、契合游戏调性的无衬线栈，
// 并对中文有良好覆盖（PingFang / 思源黑体 / 微软雅黑等系统字体）。
export const UI_FONT =
  '"Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", system-ui, sans-serif';

// 标题字体（如需更强的游戏展示风格，可在此替换为打包的展示体）。
export const TITLE_FONT = UI_FONT;

// 文本分辨率：按设备像素比渲染文字纹理，避免在高 DPI / 缩放画布下发虚。
function textResolution(): number {
  const dpr = typeof globalThis !== "undefined" ? (globalThis.devicePixelRatio || 1) : 1;
  return Math.min(3, Math.max(2, Math.round(dpr)));
}

// 统一文本工厂：默认注入字体与分辨率；调用方 style 可覆盖（但通常不再指定 fontFamily）。
export function addText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string | string[],
  style: Phaser.Types.GameObjects.Text.TextStyle = {}
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: UI_FONT,
    resolution: textResolution(),
    ...style,
  });
}
