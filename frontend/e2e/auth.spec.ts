import { test, expect } from "@playwright/test";
import { gotoReady } from "./helpers";

/**
 * E2E 2: 登録・ログイン
 *
 * 確認する流れ:
 * 1. ユーザー登録する
 * 2. ログアウトする
 * 3. ログインする
 * 4. ログイン済み状態になっていることを確認する
 */
test("登録・ログアウト・ログイン", async ({ page }) => {
  const ts = Date.now();
  const username = `e2e_auth_${ts}`;
  const email = `e2e_auth_${ts}@test.example`;
  const password = "testpass123";

  // 登録ページでフォームを使って登録
  await gotoReady(page, "/register");
  await page.locator('input[type="text"]').waitFor({ state: "visible" });
  await page.locator('input[type="text"]').fill(username);
  await page.locator('input[type="email"]').fill(email);
  const registrationPasswords = page.locator('input[type="password"]');
  await registrationPasswords.nth(0).fill(password);
  await registrationPasswords.nth(1).fill(password);
  await page.getByRole("button", { name: "登録する" }).click();

  // 登録成功 = ログアウトボタンが表示される (リダイレクト先はホーム)
  await expect(page.getByRole("button", { name: "ログアウト" })).toBeVisible();

  // ログアウト
  await page.getByRole("button", { name: "ログアウト" }).click();
  // ログアウト後は「ログイン」リンクが Navbar に表示される
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "ログイン" })
  ).toBeVisible();

  // ログインページへ移動
  await gotoReady(page, "/login");
  await page.locator('input[type="text"]').fill(username);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "ログイン" }).click();

  // ログイン成功 = ログアウトボタンが表示される
  await expect(page.getByRole("button", { name: "ログアウト" })).toBeVisible();
});

test("A-4: 未認証アクセス — コメントフォームが表示されない", async ({ page }) => {
  await gotoReady(page, "/matthew/1");
  await page.getByTestId("verse-item").first().click();
  // 未ログインのためテキストエリアは表示されず、ログインリンクが表示される
  await expect(page.getByPlaceholder("この節へのコメント...")).not.toBeVisible();
  await expect(page.getByRole("link", { name: "ログイン" }).first()).toBeVisible();
});
