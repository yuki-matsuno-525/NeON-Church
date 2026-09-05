import { test, expect } from "./fixtures";

test.use({
  browserGuardrailOptions: {
    allowConsoleMessages: [/guardrail-probe console warning/],
    allowHydrationErrors: [/guardrail-probe hydration mismatch/],
    allowPageErrors: [/guardrail-probe/],
    allowUnhandledRejections: [/guardrail-probe unhandled rejection/],
    allowRequestFailures: [/guardrail-probe-request/],
  },
});

test("ブラウザ診断fixtureが全カテゴリの障害を捕捉する", async ({
  page,
  browserDiagnostics,
}) => {
  await page.goto("data:text/html,<title>guardrail probe</title>");
  await page.route("**/guardrail-probe-request", (route) =>
    route.abort("failed")
  );

  await page.evaluate(() => {
    console.warn("guardrail-probe console warning");
    console.info("Hydration failed: guardrail-probe hydration mismatch");

    setTimeout(() => {
      throw new Error("guardrail-probe page error");
    }, 0);
    setTimeout(() => {
      void Promise.reject(
        new Error("guardrail-probe unhandled rejection")
      );
    }, 0);
  });

  await page.evaluate(async () => {
    await fetch("https://guardrail.invalid/guardrail-probe-request").catch(
      () => undefined
    );
  });

  await expect
    .poll(
      () => [
        ...new Set(
          browserDiagnostics.incidents.map((incident) => incident.kind)
        ),
      ],
      { message: "全ブラウザ障害カテゴリがfixtureに届くこと" }
    )
    .toEqual(
      expect.arrayContaining([
        "console",
        "hydration",
        "pageerror",
        "unhandledrejection",
        "requestfailed",
      ])
    );
});

test("期待されたHTTPエラーレスポンスを通信障害と誤判定しない", async ({
  page,
  browserDiagnostics,
}) => {
  await page.route("https://guardrail.test/**", async (route) => {
    if (route.request().url().endsWith("/expected-401")) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ detail: "authentication required" }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<title>HTTP status probe</title>",
    });
  });

  await page.goto("https://guardrail.test/");
  const status = await page.evaluate(async () => {
    const response = await fetch("/expected-401");
    return response.status;
  });

  expect(status).toBe(401);
  await page.waitForTimeout(0);
  expect(browserDiagnostics.incidents).toHaveLength(0);
});
