import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  // CI では1回だけ再試行する。コメントカードのボタンを押すところが時々30秒待ちで
  // 落ちるが（notification N-3 / comment C-3）、同じコミットでも通ったり落ちたりで
  // 原因を絞れていない。再試行で CI が止まらなくなり、下の trace 設定により
  // 1回目の失敗の記録（trace）が残るので、次に直すときの手がかりになる。
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL,
    trace: "on-first-retry",
    // サイトの既定の表示言語は英語だが、e2e は日本語の画面を前提に書いてある。
    // 日本語を選んだ状態（neon_lang=ja）からブラウザを始める。
    storageState: {
      cookies: [
        {
          name: "neon_lang",
          value: "ja",
          domain: new URL(baseURL).hostname,
          path: "/",
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
