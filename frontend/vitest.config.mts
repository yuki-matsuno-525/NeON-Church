import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // e2e ディレクトリは Playwright が担当するため除外
    exclude: ["**/node_modules/**", "**/e2e/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // "server-only" は Next.js が用意する目印で、npm の package としては存在しない。
      // 「ブラウザから読んだら失敗させる」という意味しか持たないので、テストでは空にする。
      "server-only": path.resolve(__dirname, "./src/test/serverOnlyStub.ts"),
    },
  },
});
