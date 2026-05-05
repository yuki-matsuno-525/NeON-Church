import { test, expect } from "@playwright/test";

/**
 * E2E 1: 聖書本文を読む
 *
 * 確認する流れ:
 * 1. トップページを開く（/matthew/1 にリダイレクト）
 * 2. Sidebar からマタイを選ぶ
 * 3. 章一覧から5章を選ぶ
 * 4. 本文が表示される
 * 5. 節番号が表示される
 */
test("聖書本文を読む", async ({ page }) => {
  // トップページは /matthew/1 にリダイレクト
  await page.goto("/");
  await expect(page).toHaveURL(/\/matthew\/1$/);

  // Sidebar の「マタイ」リンクをクリック
  await page.getByRole("link", { name: "マタイ" }).first().click();
  await expect(page).toHaveURL(/\/matthew$/);

  // 章一覧から5章を選ぶ（章グリッドのリンク "5"）
  await page
    .getByRole("link", { name: /^5$/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/matthew\/5$/);

  // 本文ページのh1が表示される
  await expect(
    page.getByRole("heading", { name: "マタイ 第5章", exact: true })
  ).toBeVisible();

  // 節番号（sup 要素）が少なくとも1つ表示される
  const supElements = page.locator("sup");
  await expect(supElements.first()).toBeVisible();
  expect(await supElements.count()).toBeGreaterThan(0);
});
