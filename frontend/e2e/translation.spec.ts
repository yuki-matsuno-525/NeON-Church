import { test, expect } from "@playwright/test";
import { registerUser, loginWithUI, logoutWithUI } from "./helpers";

/**
 * E2E: 翻訳プロジェクト
 *
 * /translations     — プロジェクト一覧
 * /translations/new — 新規プロジェクト作成フォーム
 * /translations/[id]— プロジェクト詳細・参加申請
 */

test("Tr-1: /translations にアクセスするとページが表示される", async ({ page }) => {
  await page.goto("/translations");

  // ページタイトルが表示される
  await expect(
    page.getByRole("heading", { name: "翻訳プロジェクト" })
  ).toBeVisible();
});

test("Tr-2: ログイン済みユーザーに「＋ 新規作成」ボタンが表示される", async ({
  page,
  request,
}) => {
  const { username, password } = await registerUser(request, "_tr2");
  await loginWithUI(page, username, password);

  await page.goto("/translations");

  // 「＋ 新規作成」リンクが表示される（ログイン済みの場合のみ）
  await expect(page.getByRole("link", { name: "＋ 新規作成" })).toBeVisible();
});

test("Tr-3: 未ログインでは「＋ 新規作成」ボタンが表示されない", async ({ page }) => {
  await page.goto("/translations");

  // 「＋ 新規作成」リンクが表示されない
  await expect(page.getByRole("link", { name: "＋ 新規作成" })).not.toBeVisible();
});

test("Tr-4: /translations/new から新規プロジェクトを作成できる", async ({
  page,
  request,
}) => {
  const { username, password } = await registerUser(request, "_tr4");
  await loginWithUI(page, username, password);

  await page.goto("/translations/new");

  // フォームが表示される
  await expect(
    page.getByRole("heading", { name: "新規翻訳プロジェクト" })
  ).toBeVisible();

  const ts = Date.now();
  const projectName = `E2Eテスト翻訳_${ts}`;

  // プロジェクト名を入力
  await page.locator('input[placeholder="例: マタイ英語翻訳"]').fill(projectName);

  // 説明を入力（任意）
  await page
    .locator('textarea[placeholder="プロジェクトの目的や方針を記述（任意）"]')
    .fill("E2Eテスト用プロジェクトです");

  // 書籍バージョンは「口語訳」がデフォルトなのでそのまま
  // 翻訳元の書を選択（マタイによる福音書）
  await page.locator("select").nth(1).selectOption({ label: "マタイによる福音書" });

  // 翻訳先言語を選択
  await page.locator("select").nth(2).selectOption({ label: "English" });

  // フォーム送信
  await page.getByRole("button", { name: "プロジェクトを作成" }).click();

  // 作成後、プロジェクト詳細ページにリダイレクトされる
  await expect(page).toHaveURL(/\/translations\/[^/]+$/);

  // プロジェクト名が詳細ページに表示される
  await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
});

test("Tr-5: 作成したプロジェクトが一覧に表示される", async ({
  page,
  request,
}) => {
  const { username, password } = await registerUser(request, "_tr5");
  await loginWithUI(page, username, password);

  // 新規プロジェクトを作成
  await page.goto("/translations/new");

  const ts = Date.now();
  const projectName = `E2E一覧確認_${ts}`;

  await page.locator('input[placeholder="例: マタイ英語翻訳"]').fill(projectName);
  await page.locator("select").nth(1).selectOption({ label: "マタイによる福音書" });
  await page.locator("select").nth(2).selectOption({ label: "English" });
  await page.getByRole("button", { name: "プロジェクトを作成" }).click();

  // 詳細ページに遷移（プロジェクト名見出しが表示されるまで待つ）
  await expect(page.getByRole("heading", { name: projectName })).toBeVisible();

  // DRAFT → ACTIVE にして一覧に表示されるようにする
  await page.getByRole("button", { name: "募集開始" }).click();
  await expect(page.getByRole("button", { name: "公開する" })).toBeVisible();

  // 一覧ページに移動してプロジェクトが表示されることを確認
  await page.goto("/translations");
  await expect(page.getByText(projectName)).toBeVisible();
});

test("Tr-6: 別ユーザーが翻訳プロジェクトに参加申請できる", async ({
  page,
  request,
}) => {
  const ts = Date.now();

  // ユーザーA: プロジェクトを作成して「募集開始」にする
  const userA = await registerUser(request, `_tr6a${ts}`);
  await loginWithUI(page, userA.username, userA.password);

  await page.goto("/translations/new");
  const projectName = `E2E参加申請_${ts}`;
  await page.locator('input[placeholder="例: マタイ英語翻訳"]').fill(projectName);
  await page.locator("select").nth(1).selectOption({ label: "マタイによる福音書" });
  await page.locator("select").nth(2).selectOption({ label: "English" });
  await page.getByRole("button", { name: "プロジェクトを作成" }).click();

  // 詳細ページに遷移（プロジェクト名見出しが表示されるまで待つ）
  // ※ /translations/[^/]+$ は /translations/new にもマッチするためheadingで確認
  await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
  const projectUrl = page.url();

  // 「募集開始」ボタンをクリックして status を active にする
  await page.getByRole("button", { name: "募集開始" }).click();

  // ステータスが変わることを確認（「公開する」ボタンが現れる）
  await expect(page.getByRole("button", { name: "公開する" })).toBeVisible();

  // ユーザーAをログアウト
  await logoutWithUI(page);

  // ユーザーB: ログインして参加申請
  const userB = await registerUser(request, `_tr6b${ts}`);
  await loginWithUI(page, userB.username, userB.password);

  await page.goto(projectUrl);

  // 「参加申請」ボタンが表示される（active プロジェクトで非メンバーのユーザー）
  await expect(page.getByRole("button", { name: "参加申請" })).toBeVisible();

  // 参加申請ボタンをクリック
  await page.getByRole("button", { name: "参加申請" }).click();

  // 「参加受付中ではありません」や他のメッセージではなく、ボタンが消えることを確認
  // （申請後は isMember が true になるため「参加申請」ボタンが非表示になる）
  await expect(page.getByRole("button", { name: "参加申請" })).not.toBeVisible({
    timeout: 5000,
  });
});
