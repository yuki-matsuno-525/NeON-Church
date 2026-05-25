import { test, expect } from "@playwright/test";
import { registerUser, loginWithUI } from "./helpers";

// UX-9 以降、節を選択すると VerseList と CommentPanel の両方にブックマークボタンが現れる。
// 両者の accessible name は "お気に入り" / "お気に入りに追加" で曖昧マッチしてしまうため、
// VerseList 側 (テキスト一致) を明示的に対象とするように exact: true を付与する。
const bookmarkBtn = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: "お気に入り", exact: true });
const removeBtn = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: "解除", exact: true });

test("Bk-1: お気に入り登録 — ボタンが「解除」に変わる", async ({ page, request }) => {
  const { username, password } = await registerUser(request, "_bk1");
  await loginWithUI(page, username, password);
  await page.goto("/matthew/1");

  await page.getByTestId("verse-item").first().click();

  // お気に入り登録
  await bookmarkBtn(page).click();

  // 「解除」ボタンに変わる
  await expect(removeBtn(page)).toBeVisible();
});

test("Bk-2: お気に入り解除 — 解除後に「お気に入り」ボタンに戻る", async ({ page, request }) => {
  const { username, password } = await registerUser(request, "_bk2");
  await loginWithUI(page, username, password);
  await page.goto("/matthew/1");

  await page.getByTestId("verse-item").first().click();

  // お気に入り登録
  await bookmarkBtn(page).click();
  await expect(removeBtn(page)).toBeVisible();

  // 解除
  await removeBtn(page).click();

  // 「お気に入り」ボタンに戻る
  await expect(bookmarkBtn(page)).toBeVisible();
});

test("Bk-3: お気に入り一覧 — 登録後に一覧に表示される", async ({ page, request }) => {
  const { username, password } = await registerUser(request, "_bk3");
  await loginWithUI(page, username, password);
  await page.goto("/matthew/1");

  await page.getByTestId("verse-item").first().click();
  await bookmarkBtn(page).click();
  await expect(removeBtn(page)).toBeVisible();

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
  await bookmarkBtn(page).click();
  await expect(removeBtn(page)).toBeVisible();

  // 解除
  await removeBtn(page).click();
  await expect(bookmarkBtn(page)).toBeVisible();

  // お気に入り一覧で表示されない
  await page.goto("/bookmarks");
  await expect(page.getByText("お気に入りはまだありません。")).toBeVisible();
});

test("Bk-5: 未認証ではお気に入りボタンが表示されない", async ({ page }) => {
  await page.goto("/matthew/1");
  await page.getByTestId("verse-item").first().click();

  await expect(page.getByRole("button", { name: /お気に入り/ })).not.toBeVisible();
});
