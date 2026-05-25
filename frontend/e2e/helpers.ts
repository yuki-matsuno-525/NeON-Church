import { type APIRequestContext, expect } from "@playwright/test";

export const API_BASE =
  process.env.PLAYWRIGHT_API_BASE ?? "http://localhost:8000";

/**
 * テスト用ユーザーをAPIで作成し、認証情報を返す。
 * username はタイムスタンプ + suffix でユニークにする。
 */
export async function registerUser(
  request: APIRequestContext,
  suffix = ""
): Promise<{ username: string; email: string; password: string }> {
  // 認証済みコンテキストでは CSRF Cookie が必要なため、事前取得してヘッダーに付ける
  await request.get(`${API_BASE}/api/csrf/`);
  const state = await request.storageState();
  const csrfToken = state.cookies.find((c) => c.name === "csrftoken")?.value ?? "";

  const ts = Date.now();
  const username = `e2e_${ts}${suffix}`;
  const email = `e2e_${ts}${suffix}@test.example`;
  const password = "testpass123";

  const res = await request.post(`${API_BASE}/api/auth/register/`, {
    data: { username, email, password },
    headers: csrfToken ? { "X-CSRFToken": csrfToken } : {},
  });
  if (!res.ok()) {
    throw new Error(`register failed: ${await res.text()}`);
  }

  return { username, email, password };
}

/**
 * ブラウザページでログインフォームを使ってログインする。
 * ログイン成功は Navbar に「ログアウト」ボタンが表示されることで判定する。
 * (リダイレクト先は `?from=...` の有無で変わるため URL では待たない)
 */
export async function loginWithUI(
  page: import("@playwright/test").Page,
  username: string,
  password: string
) {
  await page.goto("/login");
  // ログインフォームが表示されるまで待つ（CSRF Cookie の設定完了も兼ねる）
  await page.locator('input[type="text"]').waitFor({ state: "visible" });
  await page.locator('input[type="text"]').fill(username);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(page.getByRole("button", { name: "ログアウト" })).toBeVisible();
}

/**
 * ログアウトボタンを押し、Navbar に「ログイン」リンクが表示されるまで待つ。
 */
export async function logoutWithUI(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "ログアウト" }).click();
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "ログイン" })
  ).toBeVisible();
}

/**
 * UX-9 で CommentPanel の投稿フォームがデフォルト折りたたみになったため、
 * テストではまず「コメントを書く」CTA をクリックしてフォームを開く必要がある。
 * 投稿成功またはキャンセルで再び折りたたまれる。
 */
export async function openVerseCompose(page: import("@playwright/test").Page) {
  await page
    .locator(".comment-panel")
    .getByRole("button", { name: "コメントを書く" })
    .click();
}
