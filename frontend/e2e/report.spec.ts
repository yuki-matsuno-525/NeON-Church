import { test, expect } from "@playwright/test";
import { registerUser, loginWithUI, logoutWithUI, openVerseCompose } from "./helpers";

test("Rp-1: 他ユーザーのコメントを報告できる", async ({ page, request }) => {
  const ts = Date.now();

  // ユーザーA: コメント投稿
  const userA = await registerUser(request, `_rpa${ts}`);
  await loginWithUI(page, userA.username, userA.password);
  await page.goto("/matthew/1");
  await page.getByTestId("verse-item").first().click();
  const panel = page.locator(".comment-panel");
  await openVerseCompose(page);
  const commentText = `report_target_${ts}`;
  await panel.getByPlaceholder("この節へのコメント...").fill(commentText);
  await panel.getByRole("button", { name: "投稿する" }).click();
  await expect(panel.getByText(commentText)).toBeVisible();
  await logoutWithUI(page);

  // ユーザーB: 他ユーザーのコメントに「報告」ボタンが表示される
  const userB = await registerUser(request, `_rpb${ts}`);
  await loginWithUI(page, userB.username, userB.password);
  await page.goto("/matthew/1");
  await page.getByTestId("verse-item").first().click();

  const commentInner = panel.locator("p").filter({ hasText: commentText }).locator("xpath=..");
  await expect(commentInner.getByRole("button", { name: "報告" })).toBeVisible();

  // 報告フォームを開いて送信
  await commentInner.getByRole("button", { name: "報告" }).click();
  await expect(commentInner.getByRole("button", { name: "送信" })).toBeVisible();
  await commentInner.getByRole("button", { name: "送信" }).click();

  // 「報告しました」が表示され、「報告」ボタンが消える
  await expect(commentInner.getByText("報告しました")).toBeVisible();
  await expect(commentInner.getByRole("button", { name: "報告" })).not.toBeVisible();
});

test("Rp-2: 自分のコメントには「報告」ボタンが表示されない", async ({ page, request }) => {
  const { username, password } = await registerUser(request, "_rp2");
  await loginWithUI(page, username, password);
  await page.goto("/matthew/1");

  await page.getByTestId("verse-item").first().click();
  const ts = Date.now();
  const panel = page.locator(".comment-panel");
  await openVerseCompose(page);
  await panel.getByPlaceholder("この節へのコメント...").fill(`self_report_${ts}`);
  await panel.getByRole("button", { name: "投稿する" }).click();

  const commentInner = panel.locator("p").filter({ hasText: `self_report_${ts}` }).locator("xpath=..");

  // 自分のコメントには「報告」ボタンがない
  await expect(commentInner.getByRole("button", { name: "報告" })).not.toBeVisible();
});
