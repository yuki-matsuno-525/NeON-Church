import { test, expect } from "@playwright/test";

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
  await page.goto("/qa");
  const style = await computed(page, "input", ["font-size"]);
  expect(parseFloat(style["font-size"])).toBeGreaterThanOrEqual(16);
});

test("スマホではハンバーガーボタンが出る", async ({ page }) => {
  await page.goto("/read");
  const style = await computed(page, ".hamburger-btn", ["display"]);
  expect(style.display).toBe("flex");
});

test("スマホの読書画面は本文の余白が 16px になる", async ({ page }) => {
  await page.goto("/matthew/1");
  const style = await computed(page, ".reader-main", ["padding-left", "padding-top"]);
  expect(style["padding-left"]).toBe("16px");
  expect(style["padding-top"]).toBe("16px");
});

test("スマホで節を選ぶと、コメントが下から重なって出る", async ({ page }) => {
  await page.goto("/matthew/1");
  await page.getByTestId("verse-item").first().click();

  const panel = await computed(page, ".reader-panel", ["position", "bottom", "left", "display"]);
  expect(panel.position).toBe("fixed");
  expect(panel.bottom).toBe("0px");
  expect(panel.left).toBe("0px");
  expect(panel.display).toBe("flex");

  // 本文はシートの下に隠れないよう、下に余白を取る
  const main = await computed(page, ".reader-main", ["padding-bottom"]);
  expect(parseFloat(main["padding-bottom"])).toBeGreaterThan(100);
});

test("画面が広いときはハンバーガーボタンを出さない", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/read");
  const style = await computed(page, ".hamburger-btn", ["display"]);
  expect(style.display).toBe("none");
});

test("メニューを開いたまま動かしても、上のバーは画面の上に残る", async ({ page }) => {
  await page.goto("/read");
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
  await page.goto("/read");
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
