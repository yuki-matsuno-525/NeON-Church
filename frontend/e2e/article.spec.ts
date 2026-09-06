import { test, expect } from "@playwright/test";
import { gotoReady, loginWithUI, registerUser } from "./helpers";

/**
 * 記事の一連。書きはじめ → 引用パネルから節を入れる → 要約を書いて公開 →
 * 節のページから「引用した記事」として引ける、までを通す。
 */

/**
 * 記事が保存されるのを待つ。
 *
 * 以前は画面の「保存しました」を待っていたが、うまくいったときは何も出さない
 * ようにしたので（自動保存の状態を出し続けると画面の端で文字が明滅する）、
 * 保存そのもの＝PATCH の返事を待つ。表示の文言に頼らないぶん、e2e としても素直。
 *
 * 動かす前に呼んで受け取り、動かしたあとに await すること。
 */
function articleSaved(page: import("@playwright/test").Page) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH"
      && /\/api\/articles\/[0-9a-f-]+\/$/.test(new URL(response.url()).pathname)
      && response.ok(),
    { timeout: 15000 },
  );
}

/** 題を決めて下書きを作り、編集画面まで進む。 */
async function startArticle(page: import("@playwright/test").Page, title: string) {
  await gotoReady(page, "/articles/new");
  await page.getByPlaceholder("例: 断食について").fill(title);
  await page.getByRole("button", { name: "書きはじめる" }).click();
  await expect(page).toHaveURL(/\/articles\/[0-9a-f-]+\/edit$/);
}

test("A-1: 記事を書いて公開すると一覧に出る", async ({ page, request }) => {
  const { username, password } = await registerUser(request, "_a1");
  await loginWithUI(page, username, password);

  const title = `記事テスト_${Date.now()}`;
  await startArticle(page, title);

  await page.getByPlaceholder(/本文を書きます/).fill("断食について考えたこと。");
  await page.getByPlaceholder(/要約/).fill("断食についての覚え書き。");

  // 要約を入れると公開が選べるようになる
  await page.locator("select").first().selectOption("public");
  const saved = articleSaved(page);
  await page.getByRole("button", { name: "変更して保存" }).click();
  await saved;

  await gotoReady(page, "/articles");
  await expect(page.getByText(title).first()).toBeVisible();
});

test("A-2: 要約が空のあいだは公開を選べない", async ({ page, request }) => {
  const { username, password } = await registerUser(request, "_a2");
  await loginWithUI(page, username, password);

  await startArticle(page, `未公開_${Date.now()}`);

  await expect(page.getByText("要約を書くと、公開できるようになります。")).toBeVisible();
  await expect(page.locator('select option[value="public"]')).toBeDisabled();
});

test("A-3: 引用パネルから節を入れると、プレビューに節の本文が出る", async ({ page, request }) => {
  const { username, password } = await registerUser(request, "_a3");
  await loginWithUI(page, username, password);

  await startArticle(page, `引用テスト_${Date.now()}`);

  // さがす → 書 → 章 → 節 とたどる
  await page.getByPlaceholder("書をさがす").fill("マタイ");
  await page.getByRole("button", { name: "マタイによる福音書" }).click();
  await page.getByRole("button", { name: "第1章", exact: true }).click();

  // 最初の節を引用ブロックとして入れる
  await page.getByRole("button", { name: "引用して入れる" }).first().click();

  // 本文に印が入り、プレビューには節の本文が出る
  await expect(page.getByPlaceholder(/本文を書きます/)).toHaveValue(/\{\{matthew 1:1\}\}/);
  await expect(page.locator("blockquote").first()).toBeVisible();
});

test("A-4: 公開した記事は、引用した節のページから引ける", async ({ page, request }) => {
  const { username, password } = await registerUser(request, "_a4");
  await loginWithUI(page, username, password);

  const title = `逆引きテスト_${Date.now()}`;
  await startArticle(page, title);

  await page.getByPlaceholder(/本文を書きます/).fill("[[matthew 1:1]] について。");
  await page.getByPlaceholder(/要約/).fill("系図のはじまりについて。");
  await page.locator("select").first().selectOption("public");
  const saved = articleSaved(page);
  await page.getByRole("button", { name: "変更して保存" }).click();
  await saved;

  // 引用した節のページを開く
  await gotoReady(page, "/matthew/1");
  await page.getByTestId("verse-item").first().click();

  const tab = page.getByRole("tab", { name: /引用した記事/ });
  await expect(tab).toBeVisible({ timeout: 10000 });
  await tab.click();
  await expect(page.getByText(title)).toBeVisible();
});

test("A-5: 下書きは他の人から見えない", async ({ page, request, browser }) => {
  const author = await registerUser(request, "_a5a");
  await loginWithUI(page, author.username, author.password);

  const title = `下書き_${Date.now()}`;
  await startArticle(page, title);
  const url = page.url().replace("/edit", "");
  const saved = articleSaved(page);
  await page.getByPlaceholder(/本文を書きます/).fill("まだ人には見せない。");
  await saved;

  // 別のユーザーで開くと読めない
  const other = await registerUser(request, "_a5b");
  const context = await browser.newContext();
  const otherPage = await context.newPage();
  await loginWithUI(otherPage, other.username, other.password);
  await gotoReady(otherPage, url);

  await expect(otherPage.getByText(/記事が見つかりません。|この記事は非公開です。/).first()).toBeVisible();
  await expect(otherPage.getByText("まだ人には見せない。")).toHaveCount(0);
  await context.close();
});
