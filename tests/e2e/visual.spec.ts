import { test, expect } from "@playwright/test";
import { bootToMenu, startGame, resetStage } from "./helpers";

test("E2E-font-menu: 菜单文字使用统一 UI 字体且非默认 Courier", async ({ page }) => {
  await bootToMenu(page);
  await page.waitForTimeout(400);
  // 菜单标题为 addText 创建，字体应为我们的无衬线栈
  const font = await page.evaluate(() => {
    const menu = (globalThis as Record<string, any>).__GAME__.scene.getScene("MenuScene");
    const texts = menu.children.list.filter((o: any) => o.type === "Text");
    return texts.length ? texts[0].style.fontFamily : "";
  });
  expect(font.toLowerCase()).not.toContain("courier");
  expect(font).toContain("Segoe UI");
});

test("E2E-font-hud: HUD 文字字体与分辨率正确", async ({ page }) => {
  await bootToMenu(page);
  await startGame(page);
  await resetStage(page);
  await page.waitForTimeout(300);
  const info = await page.evaluate(() => {
    const gs = (globalThis as Record<string, any>).__GAME__.scene.getScene("GameScene");
    return { font: gs.hudDistance.style.fontFamily, res: gs.hudDistance.style.resolution };
  });
  expect(info.font.toLowerCase()).not.toContain("courier");
  expect(info.font).toContain("Segoe UI");
  expect(info.res).toBeGreaterThanOrEqual(2);
});
