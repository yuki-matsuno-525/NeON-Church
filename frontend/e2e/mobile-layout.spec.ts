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
