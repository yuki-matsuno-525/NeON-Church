import {
  DEFAULT_BROWSER_GUARDRAIL_OPTIONS,
  test,
  expect,
  type BrowserGuardrailOptions,
} from "./fixtures";

const consoleAllowlist = [/guardrail-probe console warning/];
const httpResponseAllowlist = [
  ...(DEFAULT_BROWSER_GUARDRAIL_OPTIONS.allowHttpResponses ?? []),
  /GET https:\/\/guardrail\.test\/expected-401 \(fetch\): HTTP 401/,
];
const guardrailOptions: BrowserGuardrailOptions = {
  allowConsoleMessages: consoleAllowlist,
  allowHydrationErrors: [/guardrail-probe hydration mismatch/],
  allowPageErrors: [/guardrail-probe/],
  allowUnhandledRejections: [/guardrail-probe unhandled rejection/],
  allowRequestFailures: [/guardrail-probe-request/],
  allowHttpResponses: httpResponseAllowlist,
};

test.use({
  browserGuardrailOptions: guardrailOptions,
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

test("明示許可したHTTPエラーレスポンスだけを合格にできる", async ({
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
  expect(browserDiagnostics.incidents).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: "httpresponse",
        message: expect.stringContaining("GET https://guardrail.test/expected-401 (fetch): HTTP 401"),
      }),
    ])
  );
  expect(browserDiagnostics.unexpectedIncidents).toHaveLength(0);
});

test("匿名セッション確認の401だけを既定で許可する", async ({
  page,
  browserDiagnostics,
}) => {
  await page.route("https://guardrail.test/**", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ detail: "authentication required" }),
    });
  });

  await page.goto("data:text/html,<title>anonymous auth probe</title>");
  await page.evaluate(async () => {
    await fetch("https://guardrail.test/api/auth/me/");
    await fetch("https://guardrail.test/api/auth/token/refresh/", { method: "POST" });
    await fetch("https://guardrail.test/api/auth/login/");
  });
  await page.waitForTimeout(0);

  const unexpectedHttp = browserDiagnostics.unexpectedIncidents.filter(
    (incident) => incident.kind === "httpresponse",
  );
  expect(unexpectedHttp).toHaveLength(1);
  expect(unexpectedHttp[0].message).toContain("GET https://guardrail.test/api/auth/login/");

  // Keep the fixture's own teardown green only after proving this adjacent 401
  // is rejected by the default policy.
  httpResponseAllowlist.push(/GET https:\/\/guardrail\.test\/api\/auth\/login\//);
});

test("同一originの明示的なNext RSC prefetchキャンセルだけを無視する", async ({
  page,
  browserDiagnostics,
}) => {
  await page.route("https://guardrail.test/**", async (route) => {
    if (route.request().url().includes("_rsc=")) {
      await route.abort("aborted");
      return;
    }
    await route.fulfill({ status: 200, contentType: "text/html", body: "<title>prefetch probe</title>" });
  });

  await page.goto("https://guardrail.test/");
  await page.evaluate(async () => {
    await fetch("/?_rsc=guardrail", {
      headers: { RSC: "1", "Next-Router-Prefetch": "1" },
    }).catch(() => undefined);
  });
  await page.waitForTimeout(0);

  expect(
    browserDiagnostics.incidents.filter((incident) => incident.kind === "requestfailed")
  ).toHaveLength(0);
});

test("未許可incidentはrelease failureを生成する", async ({ page, browserDiagnostics }) => {
  await page.goto("data:text/html,<title>unexpected incident probe</title>");
  await page.evaluate(() => console.error("guardrail-probe unexpected console error"));

  await expect
    .poll(() => browserDiagnostics.unexpectedIncidents.length)
    .toBeGreaterThan(0);
  expect(() => browserDiagnostics.assertNoUnexpectedIncidents()).toThrow(
    /未許可のエラーを 1 件検出/
  );

  // The assertion above proves the same method used by fixture teardown fails.
  // Permit this one synthetic probe only after observing the failure so the
  // guardrail's own conformance test can finish green.
  consoleAllowlist.push(/guardrail-probe unexpected console error/);
});
