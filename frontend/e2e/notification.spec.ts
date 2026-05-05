import { test, expect } from "@playwright/test";
import { registerUser, loginWithUI, logoutWithUI } from "./helpers";

test("N-1,N-2: 返信通知が届き、クリックで既読になる", async ({ page, request }) => {
  const ts = Date.now();

  // ユーザーA: 登録・ログイン・コメント投稿
  const userA = await registerUser(request, `_na${ts}`);
  await loginWithUI(page, userA.username, userA.password);
  await page.goto("/matthew/1");
  await page.getByTestId("verse-item").first().click();
  const commentText = `notif_comment_${ts}`;
  await page.getByPlaceholder("この節へのコメント...").fill(commentText);
  await page.getByRole("button", { name: "投稿", exact: true }).click();
  await expect(page.getByText(commentText)).toBeVisible();
  await logoutWithUI(page);

  // ユーザーB: 登録・ログイン・Aのコメントに返信
  const userB = await registerUser(request, `_nb${ts}`);
  await loginWithUI(page, userB.username, userB.password);
  await page.goto("/matthew/1");
  await page.getByTestId("verse-item").first().click();
  await expect(page.getByText(commentText)).toBeVisible();
  await page.getByRole("button", { name: "返信" }).first().click();
  const replyText = `notif_reply_${ts}`;
  await page.getByPlaceholder("返信を入力...").fill(replyText);
  await page.getByRole("button", { name: "返信" }).last().click();
  await expect(page.getByText(replyText)).toBeVisible();
  await logoutWithUI(page);

  // ユーザーA: 再ログイン → 通知バッジが表示される
  await loginWithUI(page, userA.username, userA.password);
  const notifLink = page.locator('a[href="/notifications"]');
  await expect(notifLink.locator("span")).toHaveText("1");

  // 通知ページで確認
  await page.goto("/notifications");
  await expect(page.getByText("返信")).toBeVisible();
  await expect(page.getByText(userB.username)).toBeVisible();

  // 通知クリックで既読化（「すべて既読」ボタンが消える）
  await page.locator("div").filter({ hasText: replyText }).first().click();
  await expect(page.getByRole("button", { name: "すべて既読" })).not.toBeVisible();
});

test("N-3: 自己返信では通知が来ない", async ({ page, request }) => {
  const { username, password } = await registerUser(request, "_n3");
  await loginWithUI(page, username, password);
  await page.goto("/matthew/1");

  // コメント投稿
  await page.getByTestId("verse-item").first().click();
  const ts = Date.now();
  await page.getByPlaceholder("この節へのコメント...").fill(`self_${ts}`);
  await page.getByRole("button", { name: "投稿", exact: true }).click();
  await expect(page.getByText(`self_${ts}`)).toBeVisible();

  // 自分のコメントに返信
  await page.getByRole("button", { name: "返信" }).first().click();
  await page.getByPlaceholder("返信を入力...").fill(`self_reply_${ts}`);
  await page.getByRole("button", { name: "返信" }).last().click();
  await expect(page.getByText(`self_reply_${ts}`)).toBeVisible();

  // 通知バッジが表示されない
  const badge = page.locator('a[href="/notifications"] span');
  await expect(badge).not.toBeVisible();
});
