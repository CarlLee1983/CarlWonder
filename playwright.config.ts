import { defineConfig, devices } from "@playwright/test";

// 不在這裡建置：`pnpm test:e2e` 先以 tests/fixtures/chapters 建置到 dist，再由 astro preview 服務。
// 平行跑請換 E2E_PORT，並各用一個 worktree（dist 不共用）。
const port = Number(process.env.E2E_PORT ?? 4321);

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: `http://localhost:${port}`,
      },
    },
  ],
  webServer: {
    command: `pnpm exec astro preview --port ${port}`,
    url: `http://localhost:${port}/`,
    // 一律自己起 preview：沿用殘留的 server 會測到舊建置的內容；port 被占用時 Playwright 直接報錯。
    reuseExistingServer: false,
    env: {
      // Astro 7 在偵測到代理環境時會把 preview 丟到背景並立刻結束，Playwright 會誤判為啟動失敗；
      // 設定此變數可略過代理偵測，維持前景執行。
      ASTRO_PREVIEW_BACKGROUND: "1",
    },
  },
});
