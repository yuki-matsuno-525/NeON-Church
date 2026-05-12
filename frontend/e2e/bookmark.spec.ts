import { test, expect } from "@playwright/test";
import { registerUser, loginWithUI } from "./helpers";

test("Bk-1: お気に入り登録 — ボタンが「解除」に変わる", async ({ page, request }) => {
  const { username, password } = await registerUser(request, "_bk1");
  await loginWithUI(page, username, password);
  await page.goto("/matthew/1");

  await page.getByTestId("verse-item").first().click();

  // お気に入り登録
  await page.getByRole("button", { name: "🔖 お気に入り" }).click();

  // 「解除」ボタンに変わる
  await expect(page.getByRole("button", { name: "🔖 解除" })).toBeVisible();
});

test("Bk-2: お気に入り解除 — 解除後に「お気に入り」ボタンに戻る", async ({ page, request }) => {
  const { username, password } = await registerUser(request, "_bk2");
  await loginWithUI(page, username, password);
  await page.goto("/matthew/1");

  await page.getByTestId("verse-item").first().click();

  // お気に入り登録
  await page.getByRole("button", { name: "🔖 お気に入り" }).click();
  await expect(page.getByRole("button", { name: "🔖 解除" })).toBeVisible();

  // 解除
  await page.getByRole("button", { name: "🔖 解除" }).click();

  // 「お気に入り」ボタンに戻る
  await expect(page.getByRole("button", { name: "🔖 お気に入り" })).toBeVisible();
});

test("Bk-3: お気に入り一覧 — 登録後に一覧に表示される", async ({ page, request }) => {
  const { username, password } = await registerUser(request, "_bk3");
  await loginWithUI(page, username, password);
  await page.goto("/matthew/1");

  await page.getByTestId("verse-item").first().click();
  await page.getByRole("button", { name: "🔖 お気に入り" }).click();
  await expect(page.getByRole("button", { name: "🔖 解除" })).toBeVisible();

  // お気に入り一覧ページへ移動
  await page.goto("/bookmarks");
  await expect(page.getByRole("heading", { name: "お気に入り" })).toBeVisible();

  // マタイのブックマークが表示される
  await expect(page.getByText(/マタイによる福音書/)).toBeVisible();
});

test("Bk-4: お気に入り一覧 — 解除後に一覧から消える", async ({ page, request }) => {
  const { username, password } = await registerUser(request, "_bk4");
  await loginWithUI(page, username, password);
  await page.goto("/matthew/1");

  await page.getByTestId("verse-item").first().click();
  await page.getByRole("button", { name: "🔖 お気に入り" }).click();
  await expect(page.getByRole("button", { name: "🔖 解除" })).toBeVisible();

  // 解除
  await page.getByRole("button", { name: "🔖 解除" }).click();
  await expect(page.getByRole("button", { name: "🔖 お気に入り" })).toBeVisible();

  // お気に入り一覧で表示されない
  await page.goto("/bookmarks");
  await expect(page.getByText("お気に入りはまだありません。")).toBeVisible();
});

test("Bk-5: 未認証ではお気に入りボタンが表示されない", async ({ page }) => {
  await page.goto("/matthew/1");
  await page.getByTestId("verse-item").first().click();

  await expect(page.getByRole("button", { name: /お気に入り/ })).not.toBeVisible();
});
