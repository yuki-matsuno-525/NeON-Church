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
