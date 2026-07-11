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
 *
 * ログイン完了は「ログイン API（POST /api/auth/login/）が 2xx を返したこと」で判定する。
 * これは認証成功後に必ず・最初に成立する決定的なシグナルで、Navbar の「ログアウト」ボタンの
 * 描画（クライアント状態更新＋再レンダー）より前に確定する。
 *
 * 従来はクリック後に「ログアウト」ボタンの表示だけを 8s の expect で待っていた。この 8s が
 * ログイン往復＋描画の唯一のゲートで、CI（dev サーバのオンデマンドコンパイル・4 並列実行）で
 * 応答が遅れると偶発的に超過して element not found で落ちていた。API 応答という実イベントを
 * 待つことで、timeout を延ばさずに（waitForTimeout も足さずに）その遅延を吸収する。
 */
export async function loginWithUI(
  page: import("@playwright/test").Page,
  username: string,
  password: string
) {
  await page.goto("/login");
  // フォームは AuthContext の初期認証チェック(/auth/me)完了後に描画される。
  // input が可視＝クライアントで hydrate 済み＝onSubmit ハンドラが張られている、を意味する。
  await page.locator('input[type="text"]').waitFor({ state: "visible" });
  await page.locator('input[type="text"]').fill(username);
  await page.locator('input[type="password"]').fill(password);

  // 応答待ちを click より前に登録するため Promise.all で束ねる（取りこぼし防止）。
  const [loginResponse] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/auth/login/") && r.request().method() === "POST"
    ),
    page.getByRole("button", { name: "ログイン" }).click(),
  ]);
  expect(
    loginResponse.ok(),
    `login API が失敗しました: ${loginResponse.status()}`
  ).toBeTruthy();

  // 認証状態が UI に反映されたことを最終確認する（API 応答後なので速やかに成立する）。
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
