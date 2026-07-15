import { test, expect } from "@playwright/test";
import { registerUser, loginWithUI } from "./helpers";

test("compiled book can be drafted, edited, published, commented, and read publicly", async ({
  page,
  request,
  browser,
}) => {
  test.setTimeout(90_000);

  const user = await registerUser(request, "_comp");
  await loginWithUI(page, user.username, user.password);

  const stamp = Date.now();
  const title = `E2E 編纂書 ${stamp}`;
  const ordinaryBody = `普通本文 ${stamp}`;
  const ordinaryNote = `節注釈 ${stamp}`;
  const chapterTitle = `データベース的章 ${stamp}`;
  const chapterIntro = `章導入 ${stamp}`;
  const chapterNote = `章注釈 ${stamp}`;
  const sourceVerseNote = `既存節注釈 ${stamp}`;

  await page.goto("/compilations/new");
  await page.getByTestId("compilation-title-input").fill(title);
  await Promise.all([
    page.waitForURL(/\/compilations\/[^/]+\/edit$/),
    page.getByTestId("create-compilation-button").click(),
  ]);

  const editUrl = page.url();
  const bookId = editUrl.match(/\/compilations\/([^/]+)\/edit$/)?.[1];
  expect(bookId).toBeTruthy();
  const waitForCompilationDetail = () =>
    page.waitForResponse((r) => {
      const url = new URL(r.url());
      return url.pathname === `/api/compilations/${bookId}/` && r.request().method() === "GET" && r.ok();
    });

  const anonBefore = await browser.newContext();
  const anonBeforePage = await anonBefore.newPage();
  await anonBeforePage.goto(`/compilations/${bookId}`);
  await expect(anonBeforePage.locator("body")).not.toContainText(title);
  await anonBefore.close();

  await page.getByTestId("add-text-body").fill(ordinaryBody);
  await page.getByTestId("add-text-note").fill(ordinaryNote);
  await Promise.all([
    page.waitForResponse((r) => new URL(r.url()).pathname === `/api/compilations/${bookId}/verses/` && r.request().method() === "POST" && r.ok()),
    waitForCompilationDetail(),
    page.getByTestId("add-text-button").click(),
  ]);
  await expect(page.getByText(ordinaryBody)).toBeVisible();

  await page.getByTestId("add-chapter-title").fill(chapterTitle);
  await expect(page.getByTestId("add-chapter-title")).toHaveValue(chapterTitle);
  await expect(page.getByTestId("add-chapter-button")).toBeEnabled();
  await Promise.all([
    page.waitForResponse((r) => new URL(r.url()).pathname === `/api/compilations/${bookId}/chapters/` && r.request().method() === "POST" && r.ok()),
    waitForCompilationDetail(),
    page.getByTestId("add-chapter-button").click(),
  ]);
  await expect
    .poll(async () => page.locator("input").evaluateAll((inputs, value) => inputs.some((input) => (input as HTMLInputElement).value === value), chapterTitle))
    .toBeTruthy();

  await Promise.all([
    page.waitForResponse((r) => new URL(r.url()).pathname.startsWith(`/api/compilations/${bookId}/verses/`) && r.request().method() === "PATCH" && r.ok()),
    waitForCompilationDetail(),
    page.getByTestId("move-verse-select").first().selectOption({ index: 1 }),
  ]);
  await expect(page.getByTestId("chapter-introduction")).toBeVisible();
  await page.getByTestId("chapter-introduction").fill(chapterIntro);
  await page.getByTestId("chapter-annotation").fill(chapterNote);
  await expect(page.getByTestId("chapter-introduction")).toHaveValue(chapterIntro);
  await expect(page.getByTestId("chapter-annotation")).toHaveValue(chapterNote);
  await Promise.all([
    page.waitForResponse((r) => new URL(r.url()).pathname.startsWith(`/api/compilations/${bookId}/chapters/`) && r.request().method() === "PATCH" && r.ok()),
    waitForCompilationDetail(),
    page.getByTestId("chapter-save-button").click(),
  ]);
  await expect(page.getByTestId("chapter-introduction")).toHaveValue(chapterIntro);

  await page.goto("/matthew/1");
  await page.getByTestId("verse-item").first().click();
  await page.getByTestId("open-add-to-compilation").click();
  await page.getByTestId("compilation-select").selectOption({ label: title });
  await page.getByTestId("compilation-note-input").fill(sourceVerseNote);
  await Promise.all([
    page.waitForResponse((r) => new URL(r.url()).pathname === `/api/compilations/${bookId}/verses/` && r.request().method() === "POST" && r.ok()),
    page.getByTestId("add-to-compilation-button").click(),
  ]);

  await page.goto(editUrl);
  await expect(page.getByText(sourceVerseNote)).toBeVisible();
  await page.getByTestId("publish-compilation-button").click();
  await expect(page.getByTestId("unpublish-compilation-button")).toBeVisible();

  await page.goto(`/compilations/${bookId}`);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText(ordinaryBody)).toBeVisible();
  await expect(page.getByText(ordinaryNote, { exact: true })).toBeVisible();
  await expect(page.getByText(chapterIntro)).toBeVisible();
  await expect(page.getByText(chapterNote)).toBeVisible();
  await expect(page.getByText(sourceVerseNote)).toBeVisible();

  const bookComment = `書コメント ${stamp}`;
  const chapterComment = `章コメント ${stamp}`;
  const verseComment = `節コメント ${stamp}`;
  await page.getByTestId("book-comment-input").fill(bookComment);
  await page.getByTestId("book-comment-submit").click();
  await expect(page.getByText(bookComment)).toBeVisible();

  await page.getByTestId("chapter-comment-input").fill(chapterComment);
  await page.getByTestId("chapter-comment-submit").click();
  await expect(page.getByText(chapterComment)).toBeVisible();

  await page.getByTestId("verse-comment-input").first().fill(verseComment);
  await page.getByTestId("verse-comment-submit").first().click();
  await expect(page.getByText(verseComment)).toBeVisible();

  const anonAfter = await browser.newContext();
  const anonAfterPage = await anonAfter.newPage();
  await anonAfterPage.goto(`/compilations/${bookId}`);
  await expect(anonAfterPage.getByRole("heading", { name: title })).toBeVisible();
  await expect(anonAfterPage.getByText(ordinaryBody)).toBeVisible();
  await anonAfter.close();

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "../artifacts/compiled-book-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "../artifacts/compiled-book-mobile.png", fullPage: true });
});
