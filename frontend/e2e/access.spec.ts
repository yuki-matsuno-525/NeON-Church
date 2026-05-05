import { test, expect } from "@playwright/test";
import { registerUser, loginWithUI, logoutWithUI } from "./helpers";

test("P-1: 他者のコメントに削除ボタンが表示されない", async ({ page, request }) => {
  const ts = Date.now();

  // ユーザーA: 登録・ログイン・コメント投稿
  const userA = await registerUser(request, `_p1a${ts}`);
  await loginWithUI(page, userA.username, userA.password);
  await page.goto("/matthew/1");
  await page.getByTestId("verse-item").first().click();
  const commentText = `other_comment_${ts}`;
  await page.getByPlaceholder("この節へのコメント...").fill(commentText);
  await page.getByRole("button", { name: "投稿", exact: true }).click();
  await expect(page.getByText(commentText)).toBeVisible();
  await logoutWithUI(page);

  // ユーザーB: 登録・ログイン
  const userB = await registerUser(request, `_p1b${ts}`);
  await loginWithUI(page, userB.username, userB.password);
  await page.goto("/matthew/1");
  await page.getByTestId("verse-item").first().click();
  await expect(page.getByText(commentText)).toBeVisible();

  // Aのコメントに削除ボタンが表示されない
  await expect(page.getByTestId("delete-comment")).not.toBeVisible();
});

test("P-2: 未認証ではコメント投稿フォームが表示されない", async ({ page }) => {
  await page.goto("/matthew/1");
  await page.getByTestId("verse-item").first().click();

  // テキストエリアがなく、ログインリンクが表示される
  await expect(page.getByPlaceholder("この節へのコメント...")).not.toBeVisible();
  await expect(page.getByRole("link", { name: "ログイン" }).first()).toBeVisible();
});
