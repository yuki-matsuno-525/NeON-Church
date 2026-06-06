import { test, expect } from "@playwright/test";
import { registerUser, loginWithUI } from "./helpers";

// 節を選択すると右の CommentPanel ヘッダーにブックマーク(リボン)アイコンが現れる。
// アイコンのみで文字を持たないため、状態は aria-label で判定する。
// (お気に入りに追加 = 未登録 / お気に入りを解除 = 登録済み)
const verseBookmark = (page: import("@playwright/test").Page) =>
  page.getByTestId("verse-bookmark");

test("Bk-1: お気に入り登録 — aria-label が「お気に入りを解除」に変わる", async ({ page, request }) => {
  const { username, password } = await registerUser(request, "_bk1");
  await loginWithUI(page, username, password);
  await page.goto("/matthew/1");

  await page.getByTestId("verse-item").first().click();

  // お気に入り登録
  await verseBookmark(page).click();

  // 登録済み状態になる
  await expect(verseBookmark(page)).toHaveAttribute("aria-label", "お気に入りを解除");
});

test("Bk-2: お気に入り解除 — 解除後に未登録状態に戻る", async ({ page, request }) => {
  const { username, password } = await registerUser(request, "_bk2");
  await loginWithUI(page, username, password);
  await page.goto("/matthew/1");

  await page.getByTestId("verse-item").first().click();

  // お気に入り登録
  await verseBookmark(page).click();
  await expect(verseBookmark(page)).toHaveAttribute("aria-label", "お気に入りを解除");

  // 解除
  await verseBookmark(page).click();

  // 未登録状態に戻る
  await expect(verseBookmark(page)).toHaveAttribute("aria-label", "お気に入りに追加");
});

test("Bk-3: お気に入り一覧 — 登録後に一覧に表示される", async ({ page, request }) => {
  const { username, password } = await registerUser(request, "_bk3");
  await loginWithUI(page, username, password);
  await page.goto("/matthew/1");

  await page.getByTestId("verse-item").first().click();
  await verseBookmark(page).click();
  await expect(verseBookmark(page)).toHaveAttribute("aria-label", "お気に入りを解除");

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
  await verseBookmark(page).click();
  await expect(verseBookmark(page)).toHaveAttribute("aria-label", "お気に入りを解除");

  // 解除
  await verseBookmark(page).click();
  await expect(verseBookmark(page)).toHaveAttribute("aria-label", "お気に入りに追加");

  // お気に入り一覧で表示されない
  await page.goto("/bookmarks");
  await expect(page.getByText("お気に入りはまだありません。")).toBeVisible();
});

test("Bk-5: 未認証ではお気に入りボタンが表示されない", async ({ page }) => {
  await page.goto("/matthew/1");
  await page.getByTestId("verse-item").first().click();

  await expect(verseBookmark(page)).not.toBeVisible();
});
