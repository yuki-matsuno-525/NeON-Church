import { test, expect } from "@playwright/test";
import { gotoReady, loginWithUI, registerUser } from "./helpers";

/**
 * スマホ幅でのレイアウトが崩れていないことを、実際の計算結果で確かめる。
 *
 * globals.css のスマホ用の指定は `!important` を多く使っている。これは画面ごとの
 * 指定に勝つためのもので、外せるかどうかは「外しても同じ計算結果になるか」でしか
 * 判断できない。目視だと気づけない差が出るため、ここで数値として押さえておく。
 */
test.use({ viewport: { width: 390, height: 844 } });

/** その要素に実際に効いている値を読む。 */
async function computed(page: import("@playwright/test").Page, selector: string, props: string[]) {
  return page.locator(selector).first().evaluate((el, names) => {
    const style = getComputedStyle(el as Element);
    return Object.fromEntries(names.map((name) => [name, style.getPropertyValue(name)]));
  }, props);
}

test("スマホでは入力欄が 16px 以上ある（勝手に拡大されないため）", async ({ page }) => {
  await gotoReady(page, "/qa");
  const style = await computed(page, "input", ["font-size"]);
  expect(parseFloat(style["font-size"])).toBeGreaterThanOrEqual(16);
});

test("スマホではハンバーガーボタンが出る", async ({ page }) => {
  await gotoReady(page, "/read");
  const style = await computed(page, ".hamburger-btn", ["display"]);
  expect(style.display).toBe("flex");
});

test("スマホの読書画面は本文の余白が 16px になる", async ({ page }) => {
  await gotoReady(page, "/matthew/1");
  const style = await computed(page, ".reader-main", ["padding-left", "padding-top"]);
  expect(style["padding-left"]).toBe("16px");
  expect(style["padding-top"]).toBe("16px");
});

test("スマホで節を選ぶと、コメントが画面いっぱいに出る", async ({ page }) => {
  await gotoReady(page, "/matthew/1");
  await page.getByTestId("verse-item").first().click();

  const panel = await computed(page, ".reader-panel", ["position", "top", "bottom", "left", "display"]);
  expect(panel.position).toBe("fixed");
  expect(panel.top).toBe("0px");
  expect(panel.bottom).toBe("0px");
  expect(panel.left).toBe("0px");
  expect(panel.display).toBe("flex");

  // 上部バー（ロゴ）が隠れるところまで来ている
  const viewport = page.viewportSize()!;
  const box = (await page.locator(".reader-panel").boundingBox())!;
  expect(box.y).toBe(0);
  expect(box.height).toBeGreaterThanOrEqual(viewport.height - 1);
});

test("画面が広いときはハンバーガーボタンを出さない", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await gotoReady(page, "/read");
  const style = await computed(page, ".hamburger-btn", ["display"]);
  expect(style.display).toBe("none");
});

test("タブレット幅はドロワー、1024pxからデスクトップナビになる", async ({ page, request }) => {
  const user = await registerUser(request, "_responsive_nav");
  await page.setViewportSize({ width: 1024, height: 900 });
  await loginWithUI(page, user.username, user.password);

  for (const width of [769, 800, 900, 939, 1023]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator(".hamburger-btn")).toBeVisible();
    await expect(page.locator(".nav-desktop-only")).toBeHidden();
    await expect(page.locator("#app-sidebar")).toHaveAttribute("inert", "");
  }

  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(page.locator(".hamburger-btn")).toBeHidden();
  await expect(page.getByRole("button", { name: "ログアウト" })).toBeVisible();

  const bounds = await page.evaluate(() => {
    const nav = document.querySelector(".navbar-root")!.getBoundingClientRect();
    const logout = [...document.querySelectorAll("button")]
      .find((button) => button.textContent?.trim() === "ログアウト")!
      .getBoundingClientRect();
    return { navBottom: nav.bottom, logoutTop: logout.top, logoutBottom: logout.bottom };
  });
  expect(bounds.logoutTop).toBeGreaterThanOrEqual(0);
  expect(bounds.logoutBottom).toBeLessThanOrEqual(bounds.navBottom);

});

test("タブレットではコメントパネルを全画面、1024pxでは2列で表示する", async ({ page }) => {
  await page.setViewportSize({ width: 940, height: 800 });
  await gotoReady(page, "/matthew/1");
  await page.getByTestId("verse-item").first().click();

  await expect(page.locator(".reader-panel")).toHaveCSS("position", "fixed");
  await expect(page.locator(".navbar-root")).toBeHidden();

  await page.setViewportSize({ width: 1024, height: 800 });
  await expect(page.locator(".reader-panel")).toHaveCSS("position", "static");
  await expect(page.locator(".navbar-root")).toBeVisible();

  const columns = await page.evaluate(() => {
    const main = document.querySelector(".reader-main")!.getBoundingClientRect();
    const panel = document.querySelector(".reader-panel")!.getBoundingClientRect();
    return { mainRight: main.right, panelLeft: panel.left, mainWidth: main.width };
  });
  expect(columns.mainRight).toBeLessThanOrEqual(columns.panelLeft + 1);
  expect(columns.mainWidth).toBeGreaterThan(400);
});

test("検索結果ページはページ内検索だけを表示する", async ({ page }) => {
  await gotoReady(page, "/search?q=%E7%A5%9E");

  await expect(page.locator('input[type="search"]:visible')).toHaveCount(1);
  await expect(page.locator(".navbar-root")).toHaveCSS("height", "60px");
  await expect(page.locator(".navbar-search-form")).toBeHidden();
});

test("スマホの一覧検索は件数を検索欄の下へ送る", async ({ page }) => {
  await gotoReady(page, "/qa");

  const searchBox = page.locator('.list-filter-row input[type="search"]');
  const count = page.locator(".list-filter-count");
  const [searchBounds, countBounds] = await Promise.all([
    searchBox.boundingBox(),
    count.boundingBox(),
  ]);

  expect(searchBounds).not.toBeNull();
  expect(countBounds).not.toBeNull();
  expect(countBounds!.y).toBeGreaterThanOrEqual(searchBounds!.y + searchBounds!.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    await page.evaluate(() => document.documentElement.clientWidth),
  );
});

test("メニューを開いたまま動かしても、上のバーは画面の上に残る", async ({ page }) => {
  await gotoReady(page, "/read");
  // スマホ幅では、ブラウザ側の処理が始まった時点でドロワーに inert が付く。
  // これを待たずに押すと、まだ押しても何も起きない（サーバーが描いた見た目だけの状態）。
  await page.locator("#app-sidebar[inert]").waitFor();
  await page.locator(".hamburger-btn").first().click();
  await expect(page.locator("#app-sidebar")).toHaveClass(/sidebar-open/);

  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(300);

  // 上のバーが上端にいる（position:sticky が効いている）。
  // 以前は body に overflow:hidden を付けていたため、sticky の基準が body に移り、
  // バーだけが本文と一緒に流れて画面外へ消えていた。
  const navTop = await page.locator(".navbar-root").first().evaluate((el) => el.getBoundingClientRect().top);
  expect(navTop).toBe(0);

  // 同じ理由で、止めたかったはずの後ろの本文も動いてしまっていた
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test("メニューを閉じれば、また本文をスクロールできる", async ({ page }) => {
  await gotoReady(page, "/read");
  // スマホ幅では、ブラウザ側の処理が始まった時点でドロワーに inert が付く。
  // これを待たずに押すと、まだ押しても何も起きない（サーバーが描いた見た目だけの状態）。
  await page.locator("#app-sidebar[inert]").waitFor();
  await page.locator(".hamburger-btn").first().click();
  await expect(page.locator("#app-sidebar")).toHaveClass(/sidebar-open/);
  await page.keyboard.press("Escape");
  await expect(page.locator("#app-sidebar")).not.toHaveClass(/sidebar-open/);

  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});
