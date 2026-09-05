import { test, expect } from "./fixtures";
import { API_BASE, registerUser, loginWithUI } from "./helpers";

/**
 * プラン詳細（読む画面）の章の行。
 *
 * 行のどこを押しても章へ飛べるように、章の題のリンクを透明な覆いで
 * 行いっぱいに引き伸ばしている。この覆いが行の枠から外れると、
 * 最後の行の覆いが他の行の上に乗り、どの行を押しても最後の章に
 * 飛んでしまう。目で見ても分からない（見た目は変わらない）ので、
 * 実際に押して行き先を確かめる。
 */
test("その日の1つ目の章を押すと、その章に飛ぶ（最後の章に飛ばない）", {
  tag: "@release-smoke",
}, async ({ page, request }) => {
  const user = await registerUser(request);
  await loginWithUI(page, user.username, user.password);

  const cookies = await page.context().cookies();
  const csrfToken = cookies.find((c) => c.name === "csrftoken")?.value ?? "";
  const headers: Record<string, string> = csrfToken ? { "X-CSRFToken": csrfToken } : {};

  // 公開するには1日以上の中身が要るので、まず下書きで作る。
  const planRes = await page.request.post(`${API_BASE}/api/plans/`, {
    data: { title: `e2e 章の行 ${Date.now()}` },
    headers,
  });
  expect(planRes.ok(), `プラン作成に失敗: ${await planRes.text()}`).toBeTruthy();
  const plan = await planRes.json();

  const dayRes = await page.request.post(`${API_BASE}/api/plans/${plan.id}/days/`, {
    data: { title: "初日" },
    headers,
  });
  expect(dayRes.ok(), `日の作成に失敗: ${await dayRes.text()}`).toBeTruthy();
  const day = await dayRes.json();

  // 章は日を作ったあとに入れる（作成時に一緒に送っても保存されない）。
  // 1日に3つ入れるのは、1つだけだと「最後の章に飛ぶ」不具合が隠れてしまうため。
  const readingsRes = await page.request.patch(
    `${API_BASE}/api/plans/${plan.id}/days/${day.id}/`,
    {
      data: {
        readings: [
          { book: "matthew", chapter_number: 1 },
          { book: "matthew", chapter_number: 2 },
          { book: "matthew", chapter_number: 3 },
        ],
      },
      headers,
    },
  );
  expect(readingsRes.ok(), `章の追加に失敗: ${await readingsRes.text()}`).toBeTruthy();

  // 中身が入ったので公開に変える（下書きのままだと読む画面を開けない）。
  const publishRes = await page.request.patch(`${API_BASE}/api/plans/${plan.id}/`, {
    data: { title: plan.title, visibility: "public" },
    headers,
  });
  expect(publishRes.ok(), `公開に失敗: ${await publishRes.text()}`).toBeTruthy();

  await page.goto(`/plans/${plan.id}`);
  const firstReading = page.getByRole("link", { name: /マタイによる福音書 1章/ });
  await expect(firstReading).toBeVisible();
  await firstReading.click();

  await expect(page).toHaveURL(/\/matthew\/1(\?|$)/);
});
