import { defineConfig } from "@playwright/test";

const PORT = 4321;

// e2e 真机测试：对 Vite dev 服务运行真实 Phaser 游戏，用真实键盘/鼠标操作并读取内部状态。
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  expect: { timeout: 8000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 1120, height: 620 },
    headless: true,
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `yarn dev --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: true,
    timeout: 60000,
  },
});
