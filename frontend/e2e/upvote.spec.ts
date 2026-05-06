import { test, expect } from "@playwright/test";
import { registerUser, loginWithUI } from "./helpers";

test("U-1,U-2: upvote・取り消し — vote 数が増減する", async ({ page, request }) => {
  const { username, password } = await registerUser(request, "_upv");
  await loginWithUI(page, username, password);
  await page.goto("/matthew/1");

  // コメント投稿
  await page.getByTestId("verse-item").first().click();
  const ts = Date.now();
  const panel = page.locator(".comment-panel");
  await panel.getByPlaceholder("この節へのコメント...").fill(`upvote_${ts}`);
  await panel.getByRole("button", { name: "投稿", exact: true }).click();
  await expect(panel.getByText(`upvote_${ts}`)).toBeVisible();

  // 投稿したコメントの inner-div にスコープして ▲ ボタンを取得
  const commentInner = panel.locator("p").filter({ hasText: `upvote_${ts}` }).locator("xpath=..");
  const upvoteBtn = commentInner.getByRole("button", { name: /▲/ });

  // 初期 vote 数は 0
  await expect(upvoteBtn).toContainText("0");

  // U-1: upvote → +1
  await upvoteBtn.click();
  await expect(upvoteBtn).toContainText("1");

  // U-2: 再クリックで取り消し → 0
  await upvoteBtn.click();
  await expect(upvoteBtn).toContainText("0");
});

test("U-3: 連続upvoteは最大1票に留まる", async ({ page, request }) => {
  const { username, password } = await registerUser(request, "_u3");
  await loginWithUI(page, username, password);
  await page.goto("/matthew/1");

  // コメント投稿
  await page.getByTestId("verse-item").first().click();
  const ts = Date.now();
  const panel = page.locator(".comment-panel");
  await panel.getByPlaceholder("この節へのコメント...").fill(`u3_${ts}`);
  await panel.getByRole("button", { name: "投稿", exact: true }).click();
  await expect(panel.getByText(`u3_${ts}`)).toBeVisible();

  // 投稿したコメントの inner-div にスコープして ▲ ボタンを取得
  const commentInner = panel.locator("p").filter({ hasText: `u3_${ts}` }).locator("xpath=..");
  const upvoteBtn = commentInner.getByRole("button", { name: /▲/ });

  // 2回クリック（1回目: upvote, 2回目: 取り消し）
  await upvoteBtn.click();
  await upvoteBtn.click();

  // vote 数は 1 以下（バックエンドは二重投票を 409 で弾く）
  const text = await upvoteBtn.textContent();
  const count = parseInt(text?.replace("▲", "").trim() ?? "0");
  expect(count).toBeLessThanOrEqual(1);
});
