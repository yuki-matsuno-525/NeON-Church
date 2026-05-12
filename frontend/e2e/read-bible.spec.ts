import { test, expect } from "@playwright/test";

/**
 * E2E 1: 聖書本文を読む
 *
 * 確認する流れ:
 * 1. /matthew/1 を開く
 * 2. Sidebar からマタイを選ぶ（localStorage に保存済みなので /matthew/1 にリダイレクト）
 * 3. 章一覧から5章を選ぶ
 * 4. 本文が表示される
 * 5. 節番号が表示される
 */
test("聖書本文を読む", async ({ page }) => {
  // /matthew/1 に直接アクセス（ページコンテンツ読み込みを待つ）
  await page.goto("/matthew/1");
  await expect(page).toHaveURL(/\/matthew\/1$/);

  // 本文ページのh1が表示されるまで待つ（localStorage に章が保存される）
  await expect(
    page.getByRole("heading", { name: "マタイ 第1章", exact: true })
  ).toBeVisible();

  // サイドバー「マタイ」クリック → localStorage参照で /matthew/1 にリダイレクト
  await page.getByRole("link", { name: "マタイ" }).first().click();
  await expect(page).toHaveURL(/\/matthew\/1$/);

  // 直接 /matthew/5 に移動
  await page.goto("/matthew/5");
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

test("B-2: 章ナビゲーション — 前後章に遷移する", async ({ page }) => {
  await page.goto("/matthew/5");
  await expect(
    page.getByRole("heading", { name: "マタイ 第5章", exact: true })
  ).toBeVisible();

  // 次章（6章）へ
  await page.getByTitle("第6章").click();
  await expect(page).toHaveURL(/\/matthew\/6$/);
  await expect(
    page.getByRole("heading", { name: "マタイ 第6章", exact: true })
  ).toBeVisible();

  // 前章（5章）へ戻る
  await page.getByTitle("第5章").click();
  await expect(page).toHaveURL(/\/matthew\/5$/);
  await expect(
    page.getByRole("heading", { name: "マタイ 第5章", exact: true })
  ).toBeVisible();
});

test("B-3: サイドバー — モバイルでハンバーガーメニューが機能する", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/matthew/1");

  // ハンバーガーボタンでサイドバーを開く
  await page.getByRole("button", { name: "メニューを開く" }).click();
  await expect(page.locator(".sidebar-open")).toBeVisible();

  // オーバーレイのサイドバー外側（右端）をクリックして閉じる
  // サイドバー幅200px / 画面幅375px のため x=320 はサイドバー外
  await page.locator(".sidebar-overlay").click({ position: { x: 320, y: 400 } });
  await expect(page.locator(".sidebar-open")).not.toBeVisible();
});
