import { test, expect } from "@playwright/test";
import { registerUser, loginWithUI } from "./helpers";

/**
 * E2E: プロフィールページ
 *
 * /profile  — ログイン済みユーザー自身のプロフィール編集
 * /profile/[username] — 他ユーザーの公開プロフィール
 */

test("Pr-1: ログイン済みユーザーが /profile にアクセスするとユーザー名が表示される", async ({
  page,
  request,
}) => {
  const { username, password } = await registerUser(request, "_pr1");
  await loginWithUI(page, username, password);

  await page.goto("/profile");

  // ページタイトル
  await expect(page.getByRole("heading", { name: "プロフィール" })).toBeVisible();

  // ユーザー名が dl/dd に表示される（exact: true でメールアドレスとの部分マッチを回避）
  await expect(page.getByText(username, { exact: true })).toBeVisible();
});

test("Pr-2: bio を更新すると保存成功メッセージが表示される", async ({
  page,
  request,
}) => {
  const { username, password } = await registerUser(request, "_pr2");
  await loginWithUI(page, username, password);

  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "プロフィール" })).toBeVisible();

  // 自己紹介欄を更新
  const bioText = `E2Eテスト自己紹介_${Date.now()}`;
  await page.locator("textarea#bio").fill(bioText);
  await page.getByRole("button", { name: "保存" }).click();

  // 保存成功メッセージが表示される
  await expect(page.getByText("プロフィールを更新しました。")).toBeVisible();
});

test("Pr-3: お気に入りタブにブックマーク一覧が表示される", async ({
  page,
  request,
}) => {
  const { username, password } = await registerUser(request, "_pr3");
  await loginWithUI(page, username, password);

  // 事前にお気に入りを登録する
  await page.goto("/matthew/1");
  await page.getByTestId("verse-item").first().click();
  await page.getByRole("button", { name: "🔖 お気に入り" }).click();
  await expect(page.getByRole("button", { name: "🔖 解除" })).toBeVisible();

  // プロフィールページのお気に入りタブを確認
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "プロフィール" })).toBeVisible();

  // 「お気に入り」タブが表示されていることを確認（デフォルトで選択されている）
  // ブックマークが1件以上あるので「お気に入り (1)」のようにカウントが表示される
  await expect(page.getByRole("button", { name: /お気に入り \(\d+\)/ })).toBeVisible();

  // マタイのブックマークが表示される
  await expect(page.getByText(/マタイによる福音書/)).toBeVisible();
});

test("Pr-4: コメントタブに自分のコメントが表示される（コメント投稿後に確認）", async ({
  page,
  request,
}) => {
  const { username, password } = await registerUser(request, "_pr4");
  await loginWithUI(page, username, password);

  // 事前にコメントを投稿する
  await page.goto("/matthew/1");
  await page.getByTestId("verse-item").first().click();
  const ts = Date.now();
  const commentBody = `プロフィールE2Eコメント_${ts}`;
  await page.getByPlaceholder("この節へのコメント...").fill(commentBody);
  await page.getByRole("button", { name: "投稿", exact: true }).click();
  await expect(page.getByText(commentBody)).toBeVisible();

  // プロフィールページのコメントタブを確認
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "プロフィール" })).toBeVisible();

  // 「コメント」タブをクリック
  await page.getByRole("button", { name: /コメント \(\d+\)/ }).click();

  // 投稿したコメントが表示される
  await expect(page.getByText(commentBody)).toBeVisible();
});

test("Pr-5: 他ユーザーのプロフィール /profile/[username] にアクセスするとユーザー名が表示される", async ({
  page,
  request,
}) => {
  // ユーザーAとユーザーBを作成
  const ts = Date.now();
  const userA = await registerUser(request, `_pr5a${ts}`);
  const userB = await registerUser(request, `_pr5b${ts}`);

  // ユーザーBでログインして、ユーザーAのプロフィールを閲覧
  await loginWithUI(page, userB.username, userB.password);
  await page.goto(`/profile/${userA.username}`);

  // ユーザーAのユーザー名が見出しに表示される
  await expect(page.getByRole("heading", { name: userA.username })).toBeVisible();
});

test("Pr-6: 自分のプロフィールを /profile/[username] でアクセスすると /profile へのリンクが表示される", async ({
  page,
  request,
}) => {
  const { username, password } = await registerUser(request, "_pr6");
  await loginWithUI(page, username, password);

  // 自分の username で /profile/[username] にアクセス
  await page.goto(`/profile/${username}`);

  // 「こちら」リンク（/profile へのリダイレクト案内）が表示される
  await expect(page.getByRole("link", { name: "こちら" })).toBeVisible();
  await expect(page.getByText("自分のプロフィールは")).toBeVisible();
});

test("Pr-7: 存在しないユーザー名で「ユーザーが見つかりません。」が表示される", async ({
  page,
}) => {
  // 存在しないユーザー名でアクセス
  await page.goto("/profile/this_user_does_not_exist_zzz");

  await expect(page.getByText("ユーザーが見つかりません。")).toBeVisible({
    timeout: 10000,
  });
});
