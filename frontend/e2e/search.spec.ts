import { test, expect } from "@playwright/test";

/**
 * E2E: 検索機能
 *
 * 検索ページは /search?q=xxx にアクセスし、
 * SearchContent コンポーネントが Suspense でラップされている。
 */

test("S-1: 1文字の日本語（神）でも検索が実行される", async ({ page }) => {
  // CJK は1文字でも検索できる（2文字未満で弾かない）
  await page.goto("/search?q=神");

  // 検索結果の見出しが出る＝検索が実行されている
  await expect(page.getByText(/「神」の検索結果/)).toBeVisible({ timeout: 10000 });
});

test("S-2: キーワード「イエス」で検索すると節結果が表示される", async ({ page }) => {
  // バックエンドにデータが存在するキーワードで検索
  await page.goto("/search?q=イエス");

  // 検索結果の見出しが表示される（節セクション）
  await expect(page.getByText(/「イエス」の検索結果/)).toBeVisible({ timeout: 10000 });

  // 節ヒットセクションの見出しが表示される
  await expect(page.getByRole("heading", { name: "節", exact: true })).toBeVisible();
});

test("S-3: 存在しないキーワードで「一致する結果が見つかりませんでした」が表示される", async ({ page }) => {
  // ヒットしないであろうランダムな文字列で検索
  const uniqueQuery = `zzz_nohit_${Date.now()}`;
  await page.goto(`/search?q=${encodeURIComponent(uniqueQuery)}`);

  // ヒット0件のメッセージが表示される
  await expect(
    page.getByText(`「${uniqueQuery}」に一致する結果が見つかりませんでした。`)
  ).toBeVisible({ timeout: 10000 });
});

test("S-4: 検索フォームから送信すると URL が /search?q=... になる", async ({ page }) => {
  // 検索ページを開く
  await page.goto("/search");

  // 検索フォームにキーワードを入力して送信
  const keyword = "マタイ";
  await page.locator('input[placeholder="キーワードを入力..."]').fill(keyword);
  await page.getByRole("button", { name: "検索" }).click();

  // URL が /search?q=マタイ になる
  await expect(page).toHaveURL(
    new RegExp(`/search\\?q=${encodeURIComponent(keyword)}`)
  );
});
