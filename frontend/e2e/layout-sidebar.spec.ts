import { test, expect } from "./fixtures";

/**
 * どのページでも、本文が左のサイドバーに重ならないことを確かめる。
 *
 * 画面を狭くしていくと本文がサイドバーの下に潜り込む不具合があった
 * （トップページが「サイドバーのぶん右に寄って見える」のを打ち消すために
 * 中身を左へずらしていて、狭い画面ではずらした先がサイドバーだった）。
 * 見た目のずれは目で追いにくいので、実際の座標で押さえる。
 */
const widths = [1280, 1024, 900, 820, 769];
const paths = ["/", "/read", "/plans", "/articles", "/qa", "/translations", "/about", "/matthew/1"];

for (const path of paths) {
  test(`${path} は本文がサイドバーに重ならない`, async ({ page }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      const result = await page.evaluate(() => {
        const sidebar = document.querySelector(".sidebar");
        if (!sidebar) return null;
        const bar = sidebar.getBoundingClientRect();
        // 画面が狭いときサイドバーは画面外のドロワーになるので、そのときは見ない。
        if (bar.width === 0 || bar.right <= 0) return null;
        const overlapping: string[] = [];
        document.querySelectorAll("#main-content *").forEach((element) => {
          const box = element.getBoundingClientRect();
          if (box.width === 0 || box.height === 0) return;
          // 1px は端の丸め誤差ぶん。
          if (box.left < bar.right - 1 && box.right > bar.left) {
            const name = element.className?.toString().slice(0, 40) || element.tagName;
            if (!overlapping.includes(name)) overlapping.push(name);
          }
        });
        return overlapping.slice(0, 3);
      });
      expect(result ?? [], `${path} 幅${width}px でサイドバーに重なった要素`).toEqual([]);
    }
  });
}
