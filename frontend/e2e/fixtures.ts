import {
  test as base,
  expect,
  type BrowserContext,
  type ConsoleMessage,
  type Page,
  type Request,
} from "@playwright/test";

export { expect };

export type BrowserIncidentKind =
  | "console"
  | "hydration"
  | "pageerror"
  | "unhandledrejection"
  | "requestfailed";

export type BrowserIncident = {
  kind: BrowserIncidentKind;
  message: string;
  pageUrl: string;
  source?: string;
};

type MessageMatcher = string | RegExp;

/**
 * 意図したブラウザエラーを、テスト単位で狭く許可するための設定。
 *
 * 文字列は部分一致、RegExp は正規表現一致。HTTP 4xx/5xx は requestfailed
 * ではないため、API の期待エラーレスポンスをここで許可する必要はない。
 */
export type BrowserGuardrailOptions = {
  allowConsoleMessages?: readonly MessageMatcher[];
  allowHydrationErrors?: readonly MessageMatcher[];
  allowPageErrors?: readonly MessageMatcher[];
  allowUnhandledRejections?: readonly MessageMatcher[];
  allowRequestFailures?: readonly MessageMatcher[];
};

export type BrowserDiagnostics = {
  readonly incidents: readonly BrowserIncident[];
  readonly unexpectedIncidents: readonly BrowserIncident[];
  monitorContext(context: BrowserContext): Promise<void>;
};

type UnhandledRejectionPayload = {
  message: string;
  url: string;
};

type Fixtures = {
  browserGuardrailOptions: BrowserGuardrailOptions;
  browserDiagnostics: BrowserDiagnostics;
  _browserGuardrails: void;
};

const UNHANDLED_REJECTION_BINDING = "__neonE2EUnhandledRejection";

const HYDRATION_ERROR_PATTERNS = [
  /hydration (?:failed|mismatch|error)/i,
  /server rendered html.*(?:didn't|did not) match/i,
  /text content (?:does not|did not) match/i,
  /a tree hydrated but some attributes/i,
  /expected server html to contain/i,
  /there was an error while hydrating/i,
];

function matches(matcher: MessageMatcher, value: string): boolean {
  if (typeof matcher === "string") {
    return value.includes(matcher);
  }

  // /g や /y が付いた式を繰り返し使っても lastIndex の影響を受けないようにする。
  matcher.lastIndex = 0;
  return matcher.test(value);
}

function matchesAny(
  matchers: readonly MessageMatcher[] | undefined,
  value: string
): boolean {
  return matchers?.some((matcher) => matches(matcher, value)) ?? false;
}

function isHydrationError(message: string): boolean {
  return HYDRATION_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

function isBrowserReportedHttpStatus(message: string): boolean {
  // fetch/XHR の 4xx/5xx は通信自体には成功しており、アプリが通常の戻り値として
  // 処理すべきもの。Chromium が追加するこの console.error は、アプリ自身の
  // console.error や transport failure とは分離する。
  return /^Failed to load resource: the server responded with a status of \d+/i.test(
    message
  );
}

function isAllowed(
  incident: BrowserIncident,
  options: BrowserGuardrailOptions
): boolean {
  const searchable = [incident.message, incident.source, incident.pageUrl]
    .filter(Boolean)
    .join("\n");

  switch (incident.kind) {
    case "console":
      return (
        matchesAny(options.allowConsoleMessages, searchable) ||
        // Chromium は route.abort() などの意図した通信失敗も console.error に
        // 重ねて出す。同じURLが request failure として許可済みなら二重申告しない。
        (/^error: Failed to load resource:/i.test(incident.message) &&
          matchesAny(options.allowRequestFailures, searchable))
      );
    case "hydration":
      return matchesAny(options.allowHydrationErrors, searchable);
    case "pageerror":
      return matchesAny(options.allowPageErrors, searchable);
    case "unhandledrejection":
      return matchesAny(options.allowUnhandledRejections, searchable);
    case "requestfailed":
      return matchesAny(options.allowRequestFailures, searchable);
  }
}

function consoleSource(message: ConsoleMessage): string | undefined {
  const location = message.location();
  if (!location.url) {
    return undefined;
  }
  return `${location.url}:${location.lineNumber}:${location.columnNumber}`;
}

function requestFailureMessage(request: Request): string {
  const errorText = request.failure()?.errorText ?? "unknown network failure";
  return `${request.method()} ${request.url()} (${request.resourceType()}): ${errorText}`;
}

function formatIncidents(incidents: readonly BrowserIncident[]): string {
  return incidents
    .map(
      (incident, index) =>
        `${index + 1}. [${incident.kind}] ${incident.message}\n` +
        `   page: ${incident.pageUrl || "about:blank"}` +
        (incident.source ? `\n   source: ${incident.source}` : "")
    )
    .join("\n");
}

async function installBrowserGuardrails(
  context: BrowserContext,
  incidents: BrowserIncident[]
): Promise<() => void> {
  const pageDisposers = new Map<Page, () => void>();

  await context.exposeBinding(
    UNHANDLED_REJECTION_BINDING,
    ({ page }, payload: UnhandledRejectionPayload) => {
      incidents.push({
        kind: "unhandledrejection",
        message: payload.message,
        pageUrl: payload.url || page.url(),
      });
    }
  );

  await context.addInitScript((bindingName: string) => {
    globalThis.addEventListener("unhandledrejection", (event) => {
      const reason: unknown = event.reason;
      let message: string;

      if (reason instanceof Error) {
        message = reason.stack
          ? `${reason.name}: ${reason.message}\n${reason.stack}`
          : `${reason.name}: ${reason.message}`;
      } else if (typeof reason === "string") {
        message = reason;
      } else {
        try {
          message = JSON.stringify(reason);
        } catch {
          message = String(reason);
        }
      }

      const report = (
        globalThis as typeof globalThis & {
          [key: string]:
            | ((payload: UnhandledRejectionPayload) => Promise<void>)
            | undefined;
        }
      )[bindingName];

      if (report) {
        void report({ message, url: globalThis.location.href }).catch(() => {
          // コンテキスト終了時の binding 切断は、検査対象のアプリ障害ではない。
        });
      }
    });
  }, UNHANDLED_REJECTION_BINDING);

  const attachPage = (page: Page) => {
    if (pageDisposers.has(page)) {
      return;
    }

    const onConsole = (message: ConsoleMessage) => {
      const text = message.text();
      const hydrationError = isHydrationError(text);
      if (!hydrationError && isBrowserReportedHttpStatus(text)) {
        return;
      }
      if (
        !hydrationError &&
        message.type() !== "error" &&
        message.type() !== "warning"
      ) {
        return;
      }

      incidents.push({
        kind: hydrationError ? "hydration" : "console",
        message: `${message.type()}: ${text}`,
        pageUrl: page.url(),
        source: consoleSource(message),
      });
    };

    const onPageError = (error: Error) => {
      incidents.push({
        kind: "pageerror",
        message: error.stack ?? `${error.name}: ${error.message}`,
        pageUrl: page.url(),
      });
    };

    const onRequestFailed = (request: Request) => {
      incidents.push({
        kind: "requestfailed",
        message: requestFailureMessage(request),
        pageUrl: page.url(),
      });
    };

    page.on("console", onConsole);
    page.on("pageerror", onPageError);
    page.on("requestfailed", onRequestFailed);

    pageDisposers.set(page, () => {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      page.off("requestfailed", onRequestFailed);
    });
  };

  context.pages().forEach(attachPage);
  context.on("page", attachPage);

  return () => {
    context.off("page", attachPage);
    for (const dispose of pageDisposers.values()) {
      dispose();
    }
    pageDisposers.clear();
  };
}

export const test = base.extend<Fixtures>({
  browserGuardrailOptions: [{}, { option: true }],

  browserDiagnostics: async (
    { browserGuardrailOptions },
    runFixture,
    testInfo
  ) => {
    const incidents: BrowserIncident[] = [];
    const monitoredContexts = new Map<BrowserContext, () => void>();

    const diagnostics: BrowserDiagnostics = {
      get incidents() {
        return incidents;
      },
      get unexpectedIncidents() {
        return incidents.filter(
          (incident) => !isAllowed(incident, browserGuardrailOptions)
        );
      },
      async monitorContext(context) {
        if (monitoredContexts.has(context)) {
          return;
        }
        monitoredContexts.set(
          context,
          await installBrowserGuardrails(context, incidents)
        );
      },
    };

    await runFixture(diagnostics);

    for (const dispose of monitoredContexts.values()) {
      dispose();
    }

    if (incidents.length > 0) {
      await testInfo.attach("browser-diagnostics", {
        body: Buffer.from(
          JSON.stringify(
            {
              test: testInfo.titlePath,
              retry: testInfo.retry,
              incidents: incidents.map((incident) => ({
                ...incident,
                allowed: isAllowed(incident, browserGuardrailOptions),
              })),
            },
            null,
            2
          )
        ),
        contentType: "application/json",
      });
    }

    const unexpected = diagnostics.unexpectedIncidents;
    if (
      unexpected.length > 0 &&
      testInfo.status === testInfo.expectedStatus
    ) {
      throw new Error(
        `ブラウザで未許可のエラーを ${unexpected.length} 件検出しました。\n` +
          `${formatIncidents(unexpected)}\n` +
          "意図した障害だけを browserGuardrailOptions の狭い条件で許可してください。"
      );
    }
  },

  _browserGuardrails: [
    async ({ context, browserDiagnostics }, runFixture) => {
      await browserDiagnostics.monitorContext(context);
      await runFixture();

      // テスト末尾で発火した同一ターンのエラーイベントまで受け取ってから判定する。
      await Promise.all(
        context
          .pages()
          .filter((page) => !page.isClosed())
          .map((page) => page.waitForTimeout(0).catch(() => undefined))
      );
    },
    { auto: true },
  ],
});
