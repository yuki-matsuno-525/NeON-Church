import path from "node:path";

import { expect, test } from "./fixtures";

import {
  captureVisualBaseline,
  discoverAppPageTemplates,
  openVisualRoute,
  VISUAL_BASELINE_ENABLED,
  VISUAL_ROUTE_CASES,
} from "./support/visualBaseline";

test.use({
  colorScheme: "dark",
  deviceScaleFactor: 1,
  locale: "ja-JP",
  timezoneId: "Asia/Tokyo",
  // A successful release-gate run must retain operation evidence as well as PNGs.
  video: VISUAL_BASELINE_ENABLED ? "on" : "retain-on-failure",
  viewport: { width: 1440, height: 1000 },
});

test("visual route inventory matches every App Router page", () => {
  const sourceRoutes = discoverAppPageTemplates(path.join(process.cwd(), "src", "app"));
  const baselineRoutes = VISUAL_ROUTE_CASES.map((route) => route.template).sort();

  expect(new Set(VISUAL_ROUTE_CASES.map((route) => route.id)).size).toBe(
    VISUAL_ROUTE_CASES.length,
  );
  expect(baselineRoutes).toEqual(sourceRoutes);
});

if (VISUAL_BASELINE_ENABLED) {
  test.describe("fixed-seed route appearance", () => {
    for (const route of VISUAL_ROUTE_CASES) {
      test(`${route.id}: ${route.template}`, async ({ page }) => {
        await openVisualRoute(page, route);
        await captureVisualBaseline(page, `route-${route.id}-ja-desktop`);
      });
    }
  });

  // Cross-product snapshots grow quickly and make review less reliable. These
  // variants cover each major responsive layout family and both rendering languages;
  // individual findings add a focused snapshot rather than duplicating all 35 pages.
  const mobileVariants = ["01-home", "03-chapter", "23-qa", "07-article-edit"];
  const englishVariants = ["01-home", "03-chapter", "14-login", "06-article-detail"];

  test.describe("responsive and language sentinels", () => {
    for (const id of mobileVariants) {
      const route = VISUAL_ROUTE_CASES.find((candidate) => candidate.id === id)!;
      test(`${route.id}: mobile`, async ({ page }) => {
        await openVisualRoute(page, route, { viewport: { width: 390, height: 844 } });
        await captureVisualBaseline(page, `route-${route.id}-ja-mobile`);
      });
    }

    for (const id of englishVariants) {
      const route = VISUAL_ROUTE_CASES.find((candidate) => candidate.id === id)!;
      test(`${route.id}: English`, async ({ page }) => {
        await openVisualRoute(page, route, { language: "en" });
        await captureVisualBaseline(page, `route-${route.id}-en-desktop`);
      });
    }
  });

  test("404 uses a path that cannot be captured by root dynamic routes", async ({ page }) => {
    await page.context().addCookies([
      {
        name: "neon_lang",
        value: "ja",
        url: new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000").origin,
        sameSite: "Lax",
      },
    ]);
    const response = await page.goto("/__visual_missing__/__visual_missing__/__visual_missing__");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.evaluate(async () => document.fonts.ready);
    await captureVisualBaseline(page, "route-404-ja-desktop");
  });
}
