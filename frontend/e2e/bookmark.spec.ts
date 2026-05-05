import { test, expect } from "@playwright/test";
import { registerUser, loginWithUI } from "./helpers";

test("Bk-1: お気に入り登録 — ボタンが「解除」に変わる", async ({ page, request }) => {
  const { username, password } = await registerUser(request, "_bk1");
  await loginWithUI(page, username, password);
  await page.goto("/matthew/1");

  // 節を選択してブックマークボタンを表示
  await page.getByTestId("verse-item").first().click();

  // ブックマーク登録
  await page.getByRole("button", { name: "🔖 ブックマーク" }).click();

  // 「解除」ボタンに変わる
  await expect(page.getByRole("button", { name: "🔖 解除" })).toBeVisible();
});

test("Bk-3: お気に入り一覧 — ブックマーク後に一覧に表示される", async ({ page, request }) => {
  const { username, password } = await registerUser(request, "_bk3");
  await loginWithUI(page, username, password);
  await page.goto("/matthew/1");

  // 節を選択してブックマーク登録
  await page.getByTestId("verse-item").first().click();
  await page.getByRole("button", { name: "🔖 ブックマーク" }).click();
  await expect(page.getByRole("button", { name: "🔖 解除" })).toBeVisible();

  // ブックマーク一覧ページへ移動
  await page.goto("/bookmarks");
  await expect(page.getByRole("heading", { name: "ブックマーク" })).toBeVisible();

  // マタイのブックマークが表示される
  await expect(page.getByText(/マタイ/)).toBeVisible();
});
