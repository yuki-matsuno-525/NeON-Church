import { test, expect } from "@playwright/test";
import { registerUser, loginWithUI, logoutWithUI, openVerseCompose } from "./helpers";

test("N-1,N-2: 返信通知が届き、クリックで既読になる", async ({ page, request }) => {
  const ts = Date.now();

  // ユーザーA: 登録・ログイン・コメント投稿
  const userA = await registerUser(request, `_na${ts}`);
  await loginWithUI(page, userA.username, userA.password);
  await page.goto("/matthew/1");
  await page.getByTestId("verse-item").first().click();
  const panel = page.locator(".comment-panel");
  await openVerseCompose(page);
  const commentText = `notif_comment_${ts}`;
  await panel.getByPlaceholder("この節へのコメント...").fill(commentText);
  await panel.getByRole("button", { name: "投稿する" }).click();
  await expect(panel.getByText(commentText)).toBeVisible();
  await logoutWithUI(page);

  // ユーザーB: 登録・ログイン・Aのコメントに返信
  const userB = await registerUser(request, `_nb${ts}`);
  await loginWithUI(page, userB.username, userB.password);
  await page.goto("/matthew/1");
  await page.getByTestId("verse-item").first().click();
  await expect(panel.getByText(commentText)).toBeVisible();
  // commentText を含む inner-div にスコープして返信（他コメントのボタンと混同しない）
  const commentInner = panel.locator("p").filter({ hasText: commentText }).locator("xpath=..");
  await commentInner.getByRole("button", { name: "返信" }).click();
  const replyText = `notif_reply_${ts}`;
  await commentInner.getByPlaceholder("返信を入力...").fill(replyText);
  await commentInner.locator('button[type="submit"]').click();
  await expect(panel.getByText(replyText)).toBeVisible();
  await logoutWithUI(page);

  // ユーザーA: 再ログイン → 通知バッジが表示される
  // waitForResponse を先に登録してログイン中の通知フェッチを確実に捕捉する
  const notifResponsePromise = page.waitForResponse(
    (resp) => resp.url().includes("/api/notifications/") && resp.status() === 200
  );
  await loginWithUI(page, userA.username, userA.password);
  await notifResponsePromise;
  const notifLink = page.locator('a[href="/notifications"]');
  await expect(notifLink.locator("span")).toHaveText("1");

  // 通知ページで確認
  await page.goto("/notifications");
  await expect(page.getByText("返信")).toBeVisible();
  await expect(page.getByText(userB.username)).toBeVisible();

  // 通知クリックで既読化（p 要素をクリック → 親 div の onClick にバブリング）
  await page.locator("p").filter({ hasText: replyText }).click();
  await expect(page.getByRole("button", { name: "すべて既読" })).not.toBeVisible();
});

test("N-3: 自己返信では通知が来ない", async ({ page, request }) => {
  const { username, password } = await registerUser(request, "_n3");
  await loginWithUI(page, username, password);
  await page.goto("/matthew/1");

  // コメント投稿
  await page.getByTestId("verse-item").first().click();
  const ts = Date.now();
  const panel = page.locator(".comment-panel");
  await openVerseCompose(page);
  await panel.getByPlaceholder("この節へのコメント...").fill(`self_${ts}`);
  await panel.getByRole("button", { name: "投稿する" }).click();
  await expect(panel.getByText(`self_${ts}`)).toBeVisible();

  // 自分のコメントに返信（inner-div にスコープ）
  const selfInner = panel.locator("p").filter({ hasText: `self_${ts}` }).locator("xpath=..");
  await selfInner.getByRole("button", { name: "返信" }).click();
  await selfInner.getByPlaceholder("返信を入力...").fill(`self_reply_${ts}`);
  await selfInner.locator('button[type="submit"]').click();
  await expect(panel.getByText(`self_reply_${ts}`)).toBeVisible();

  // 通知バッジが表示されない
  const badge = page.locator('a[href="/notifications"] span');
  await expect(badge).not.toBeVisible();
});
