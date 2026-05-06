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
  const panel = page.locator(".comment-panel");
  // CommentPanel のフォームが表示される
  await expect(panel.getByPlaceholder("この節へのコメント...")).toBeVisible();

  // コメントを入力して投稿
  const ts = Date.now();
  const commentBody = `E2Eテストコメント_${ts}`;
  await panel.getByPlaceholder("この節へのコメント...").fill(commentBody);
  await panel.getByRole("button", { name: "投稿", exact: true }).click();

  // 投稿したコメントが表示される
  await expect(panel.getByText(commentBody)).toBeVisible();

  // commentBody を含む inner-div にスコープして返信
  const commentInner = panel.locator("p").filter({ hasText: commentBody }).locator("xpath=..");
  await commentInner.getByRole("button", { name: "返信" }).click();

  // 返信フォームが表示される
  await expect(commentInner.getByPlaceholder("返信を入力...")).toBeVisible();

  // 返信を入力して送信
  const replyBody = `E2E返信_${ts}`;
  await commentInner.getByPlaceholder("返信を入力...").fill(replyBody);
  await commentInner.locator('button[type="submit"]').click();

  // 返信がツリー表示される（インデントされた返信コメント）
  await expect(panel.getByText(replyBody)).toBeVisible();

  // 元のコメントを削除（自分のコメントの削除ボタン）
  await panel.getByTestId("delete-comment").first().click();

  // 「このコメントは削除されました」が表示される
  await expect(
    panel.getByText("このコメントは削除されました").first()
  ).toBeVisible();
});

test("C-3: 返信の返信（depth ≥ 2）が表示される", async ({ page, request }) => {
  const { username, password } = await registerUser(request, "_c3");
  await loginWithUI(page, username, password);
  await page.goto("/matthew/1");

  await page.getByTestId("verse-item").first().click();
  const ts = Date.now();
  const panel = page.locator(".comment-panel");

  // トップコメント投稿（depth=0）
  await panel.getByPlaceholder("この節へのコメント...").fill(`top_${ts}`);
  await panel.getByRole("button", { name: "投稿", exact: true }).click();
  await expect(panel.getByText(`top_${ts}`)).toBeVisible();

  // top_${ts} コメントの inner-div にスコープして操作（他コメントのボタンと混同しない）
  const topInner = panel.locator("p").filter({ hasText: `top_${ts}` }).locator("xpath=..");

  // depth=1 の返信: toggle → fill → submit
  await topInner.getByRole("button", { name: "返信" }).click();
  await topInner.getByPlaceholder("返信を入力...").fill(`reply1_${ts}`);
  await topInner.locator('button[type="submit"]').click();
  await expect(panel.getByText(`reply1_${ts}`)).toBeVisible();

  // reply1_${ts} コメントの inner-div にスコープ
  const reply1Inner = panel.locator("p").filter({ hasText: `reply1_${ts}` }).locator("xpath=..");

  // depth=2 の返信: toggle → fill → submit
  await reply1Inner.getByRole("button", { name: "返信" }).click();
  await reply1Inner.getByPlaceholder("返信を入力...").fill(`reply2_${ts}`);
  await reply1Inner.locator('button[type="submit"]').click();

  // depth=2 コメントが表示される
  await expect(panel.getByText(`reply2_${ts}`)).toBeVisible();
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
