import { test, expect } from "@playwright/test";
import { registerUser, loginWithUI } from "./helpers";

/**
 * E2E 3: コメント投稿・返信・削除
 *
 * 確認する流れ:
 * 1. ログインする
 * 2. マタイ1章ページを開く
 * 3. 1節のコメントパネルを開く
 * 4. コメントを投稿する
 * 5. 投稿したコメントが表示される
 * 6. コメントに返信する
 * 7. 返信がツリー表示される
 * 8. コメントを削除する
 * 9. 「このコメントは削除されました」と表示される
 */
test("コメント投稿・返信・削除", async ({ page, request }) => {
  const { username, password } = await registerUser(request, "_comment");

  await loginWithUI(page, username, password);

  // マタイ1章に移動
  await page.goto("/matthew/1");
  await expect(
    page.getByRole("heading", { name: "マタイ 第1章", exact: true })
  ).toBeVisible();

  // 最初の節をクリックしてコメントパネルを開く
  await page.getByTestId("verse-item").first().click();
  // CommentPanel のフォームが表示される
  await expect(page.getByPlaceholder("この節へのコメント...")).toBeVisible();

  // コメントを入力して投稿
  const ts = Date.now();
  const commentBody = `E2Eテストコメント_${ts}`;
  await page.getByPlaceholder("この節へのコメント...").fill(commentBody);
  // CommentPanel 内の「投稿」ボタン（exact: true でChapterCommentsの「投稿する」と区別）
  await page.getByRole("button", { name: "投稿", exact: true }).click();

  // 投稿したコメントが表示される
  await expect(page.getByText(commentBody)).toBeVisible();

  // 返信ボタンをクリック
  await page.getByRole("button", { name: "返信" }).first().click();

  // 返信フォームが表示される
  await expect(page.getByPlaceholder("返信を入力...")).toBeVisible();

  // 返信を入力して送信
  const replyBody = `E2E返信_${ts}`;
  await page.getByPlaceholder("返信を入力...").fill(replyBody);
  // 返信フォームの「返信」送信ボタン
  await page.getByRole("button", { name: "返信" }).last().click();

  // 返信がツリー表示される（インデントされた返信コメント）
  await expect(page.getByText(replyBody)).toBeVisible();

  // 元のコメントを削除（自分のコメントの削除ボタン）
  await page.getByTestId("delete-comment").first().click();

  // 「このコメントは削除されました」が表示される
  await expect(
    page.getByText("このコメントは削除されました")
  ).toBeVisible();
});

test("C-3: 返信の返信（depth ≥ 2）が表示される", async ({ page, request }) => {
  const { username, password } = await registerUser(request, "_c3");
  await loginWithUI(page, username, password);
  await page.goto("/matthew/1");

  await page.getByTestId("verse-item").first().click();
  const ts = Date.now();

  // トップコメント投稿（depth=0）
  await page.getByPlaceholder("この節へのコメント...").fill(`top_${ts}`);
  await page.getByRole("button", { name: "投稿", exact: true }).click();
  await expect(page.getByText(`top_${ts}`)).toBeVisible();

  // depth=1 の返信
  await page.getByRole("button", { name: "返信" }).first().click();
  await page.getByPlaceholder("返信を入力...").fill(`reply1_${ts}`);
  await page.getByRole("button", { name: "返信" }).last().click();
  await expect(page.getByText(`reply1_${ts}`)).toBeVisible();

  // depth=2 の返信（depth=1 コメントの「返信」ボタンを押す）
  await page
    .locator("div")
    .filter({ hasText: `reply1_${ts}` })
    .last()
    .getByRole("button", { name: "返信" })
    .click();
  await page.getByPlaceholder("返信を入力...").fill(`reply2_${ts}`);
  await page.getByRole("button", { name: "返信" }).last().click();

  // depth=2 コメントが表示される
  await expect(page.getByText(`reply2_${ts}`)).toBeVisible();
});

test("C-5: 章コメント投稿 — エラーなく投稿できる", async ({ page, request }) => {
  const { username, password } = await registerUser(request, "_c5");
  await loginWithUI(page, username, password);
  await page.goto("/matthew/1");

  // 章コメント欄にスクロール
  await page.getByRole("heading", { name: /章へのコメント/ }).scrollIntoViewIfNeeded();

  const ts = Date.now();
  const chapterComment = `chapter_${ts}`;
  await page.getByPlaceholder("コメントを入力...").fill(chapterComment);
  await page.getByRole("button", { name: "投稿する" }).click();

  // 投稿成功（エラーなし、コメントが表示される）
  await expect(page.getByText(chapterComment)).toBeVisible();
});

test("C-6: 書コメント投稿 — エラーなく投稿できる", async ({ page, request }) => {
  const { username, password } = await registerUser(request, "_c6");
  await loginWithUI(page, username, password);
  await page.goto("/matthew");

  const ts = Date.now();
  const bookComment = `book_${ts}`;
  await page.getByPlaceholder("コメントを入力...").fill(bookComment);
  await page.getByRole("button", { name: "投稿する" }).click();

  await expect(page.getByText(bookComment)).toBeVisible();
});

test("C-7: 節コメントが章コメント欄に混入しない", async ({ page, request }) => {
  const { username, password } = await registerUser(request, "_c7");
  await loginWithUI(page, username, password);
  await page.goto("/matthew/1");

  // 節コメント投稿
  await page.getByTestId("verse-item").first().click();
  const ts = Date.now();
  const verseComment = `verse_only_${ts}`;
  await page.getByPlaceholder("この節へのコメント...").fill(verseComment);
  await page.getByRole("button", { name: "投稿", exact: true }).click();
  await expect(page.getByText(verseComment)).toBeVisible();

  // コメントパネルを閉じる
  await page.getByRole("button", { name: "閉じる" }).click();

  // 章コメント欄（section）内に節コメントが表示されていないことを確認
  const chapterSection = page.locator("section").filter({ hasText: "章へのコメント" });
  await expect(chapterSection.getByText(verseComment)).not.toBeVisible();
});
