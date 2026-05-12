import { test, expect } from "@playwright/test";
import { registerUser, loginWithUI } from "./helpers";

/**
 * E2E: 読書進捗
 *
 * 聖書ページを開いたときに進捗が保存されることを確認する。
 * - 認証済み: バックエンド API に保存される
 * - 未認証: localStorage に保存される
 */

test("RP-1: 聖書ページを開くと読書進捗がバックエンドに保存される（認証済みユーザー）", async ({
  page,
  request,
}) => {
  const { username, password } = await registerUser(request, "_rp1");
  await loginWithUI(page, username, password);
  // loginWithUI はすでに /matthew/1 にいる

  await expect(
    page.getByRole("heading", { name: "マタイ 第1章", exact: true })
  ).toBeVisible();

  // saveReadingProgress は非同期 + AuthContext の user 設定完了を待つ必要がある
  // polling で進捗が保存されるまで待つ（最大10秒）
  await expect
    .poll(
      async () => {
        const res = await page.evaluate(async () => {
          const r = await fetch("/api/reading-progress/", {
            credentials: "include",
          });
          if (!r.ok) return null;
          return r.json();
        });
        if (!Array.isArray(res)) return false;
        return (res as { book_name?: string }[]).some((p) => p.book_name?.includes("マタイ"));
      },
      { timeout: 10000 }
    )
    .toBe(true);
});

test("RP-2: ログインしていない状態では進捗が localStorage に保存される", async ({
  page,
}) => {
  // 未ログインでマタイ1章を開く
  await page.goto("/matthew/1");
  await expect(
    page.getByRole("heading", { name: "マタイ 第1章", exact: true })
  ).toBeVisible();

  // localStorage に "neon_progress_matthew" が保存されている
  const progressValue = await page.evaluate(() =>
    localStorage.getItem("neon_progress_matthew")
  );
  expect(progressValue).not.toBeNull();

  // 保存された進捗の chapterNumber が 1 であることを確認
  const progress = JSON.parse(progressValue!);
  expect(progress.chapterNumber).toBe(1);

  // 最後に読んだ書のスラッグも保存されている
  const lastBook = await page.evaluate(() =>
    localStorage.getItem("neon_last_book")
  );
  expect(lastBook).toBe("matthew");
});

test("RP-3: 異なる章に移動すると進捗が更新される", async ({ page }) => {
  // マタイ1章を開く
  await page.goto("/matthew/1");
  await expect(
    page.getByRole("heading", { name: "マタイ 第1章", exact: true })
  ).toBeVisible();

  // 1章の進捗が localStorage に保存される
  const progress1 = await page.evaluate(() =>
    localStorage.getItem("neon_progress_matthew")
  );
  expect(progress1).not.toBeNull();
  expect(JSON.parse(progress1!).chapterNumber).toBe(1);

  // マタイ5章に移動
  await page.goto("/matthew/5");
  await expect(
    page.getByRole("heading", { name: "マタイ 第5章", exact: true })
  ).toBeVisible();

  // 5章の進捗に更新される
  const progress5 = await page.evaluate(() =>
    localStorage.getItem("neon_progress_matthew")
  );
  expect(progress5).not.toBeNull();
  expect(JSON.parse(progress5!).chapterNumber).toBe(5);
});
