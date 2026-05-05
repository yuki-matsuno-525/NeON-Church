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
  const ts = Date.now();
  const username = `e2e_${ts}${suffix}`;
  const email = `e2e_${ts}${suffix}@test.example`;
  const password = "testpass123";

  const res = await request.post(`${API_BASE}/api/auth/register/`, {
    data: { username, email, password },
  });
  if (!res.ok()) {
    throw new Error(`register failed: ${await res.text()}`);
  }

  return { username, email, password };
}

/**
 * ブラウザページでログインフォームを使ってログインする。
 * ログイン後、/matthew/1 にリダイレクトされることを前提とする。
 */
export async function loginWithUI(
  page: import("@playwright/test").Page,
  username: string,
  password: string
) {
  await page.goto("/login");
  // AuthContext が /api/csrf/ を叩いて csrftoken Cookie が設定されるまで待つ
  await page.waitForLoadState("networkidle");
  await page.locator('input[type="text"]').fill(username);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "ログイン" }).click();
  await page.waitForURL("**/matthew/1");
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
