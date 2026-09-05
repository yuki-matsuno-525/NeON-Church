import { test, expect } from "./fixtures";
import { registerUser, loginWithUI } from "./helpers";

/**
 * E2E: 期限切れが近いログイン状態を、画面を出す前に更新できているか
 *
 * サーバー側で画面を組み立てるとき Cookie は書けないため、proxy.ts が
 * 画面の手前で更新を済ませている。ここが壊れると「ログインしているのに
 * ログアウト状態に見える」という、再現しにくい不具合になる。
 *
 * access_token（短い方）だけを消すと、期限切れ直後と同じ状態になる。
 * refresh_token（長い方）は残っているので、正しく作られていれば
 * ページを開いた時点で新しい access_token が発行される。
 */
test("期限切れでもページを開けばログイン状態が続く", async ({ page, context, request }) => {
  const { username, password } = await registerUser(request);
  await loginWithUI(page, username, password);

  // 期限切れを模す: 短い方のトークンだけを消す
  const before = await context.cookies();
  expect(before.some((c) => c.name === "refresh_token")).toBe(true);
  await context.clearCookies({ name: "access_token" });
  expect((await context.cookies()).some((c) => c.name === "access_token")).toBe(false);

  // ログインが要る画面を開く
  await page.goto("/bookmarks");

  // 新しい access_token が発行され、ログアウトさせられていない
  await expect(page.getByRole("button", { name: "ログアウト" })).toBeVisible();
  const after = await context.cookies();
  expect(after.some((c) => c.name === "access_token")).toBe(true);
});

test("ログインしていない人のページ表示は変わらない", async ({ page, context }) => {
  await context.clearCookies();

  await page.goto("/read");

  await expect(page.getByRole("navigation").getByRole("link", { name: "ログイン" })).toBeVisible();
});
