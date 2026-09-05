import { test, expect } from "./fixtures";

/**
 * E2E 1: 聖書本文を読む
 *
 * 確認する流れ:
 * 1. /matthew/1 を開く
 * 2. Sidebar からマタイの章一覧を開く
 * 3. 章一覧から5章を選ぶ
 * 4. 本文が表示される
 * 5. 節番号が表示される
 */
test("聖書本文を読む", { tag: "@release-smoke" }, async ({ page }) => {
  // /matthew/1 に直接アクセス（ページコンテンツ読み込みを待つ）
  await page.goto("/matthew/1");
  await expect(page).toHaveURL(/\/matthew\/1$/);

  // 本文ページのh1が表示されるまで待つ（localStorage に章が保存される）
  await expect(
    page.getByRole("heading", { name: "マタイ 第1章", exact: true })
  ).toBeVisible();

  // 明示的に書を選んだ場合は、記憶済みの章へ自動転送せず章一覧を開く。
  await page.getByRole("link", { name: "マタイ" }).first().click();
  await expect(page).toHaveURL(/\/matthew\?list=1$/);
  await expect(page.getByRole("heading", { name: "マタイによる福音書" })).toBeVisible();

  // 章一覧から5章を選ぶ。
  await page.locator('a.chapter-cell[href="/matthew/5"]').click();
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

  // 次章（6章）へ (UX-11 で本文末尾の prev/next バーに変更)
  await page.getByRole("link", { name: /次の章/ }).click();
  await expect(page).toHaveURL(/\/matthew\/6$/);
  await expect(
    page.getByRole("heading", { name: "マタイ 第6章", exact: true })
  ).toBeVisible();

  // 前章（5章）へ戻る
  await page.getByRole("link", { name: /前の章/ }).click();
  await expect(page).toHaveURL(/\/matthew\/5$/);
  await expect(
    page.getByRole("heading", { name: "マタイ 第5章", exact: true })
  ).toBeVisible();
});

test("B-3: サイドバー — モバイルでハンバーガーメニューが機能する", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/matthew/1");
  // Client hydration and chapter data loading are complete before testing an
  // interactive control; otherwise an early click can land on server HTML.
  await expect(
    page.getByRole("heading", { name: "マタイ 第1章", exact: true })
  ).toBeVisible();

  // ハンバーガーボタンでサイドバーを開く
  await page.getByRole("button", { name: "メニューを開く" }).click();
  await expect(page.locator(".sidebar-open")).toBeVisible();

  // オーバーレイのサイドバー外側（右端）をクリックして閉じる
  // サイドバー幅200px / 画面幅375px のため x=320 はサイドバー外
  await page.locator(".sidebar-overlay").click({ position: { x: 320, y: 400 } });
  await expect(page.locator(".sidebar-open")).not.toBeVisible();
});
