import { expect, type APIRequestContext, type Page } from "@playwright/test";

import { API_BASE } from "../helpers";

export const VISUAL_REFERENCE_TIME = "2026-08-02T12:00:00+09:00";
export const VISUAL_BASELINE_ENABLED = process.env.PLAYWRIGHT_VISUAL_BASELINE === "1";

const WEB_BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const VISUAL_ADMIN_USERNAME = "visual_admin";

type AuthSource = "none" | "shared-user" | "article-owner" | "plan-owner" | "translation-owner";
type DynamicTarget = "article" | "plan" | "profile" | "question" | "translation" | "translation-chapter";

export type VisualRouteCase = {
  id: string;
  template: string;
  path?: string;
  target?: DynamicTarget;
  auth: AuthSource;
  /** Most pages expose an h1 when their async state is ready. Editors use a stable field instead. */
  readySelector?: string;
};

/**
 * Every App Router page at the Step 0 baseline. Keep this list in route order so a
 * source route addition/removal produces a small, reviewable diff.
 */
export const VISUAL_ROUTE_CASES: readonly VisualRouteCase[] = [
  { id: "01-home", template: "/", path: "/", auth: "none" },
  { id: "02-book", template: "/[book]", path: "/matthew", auth: "none" },
  { id: "03-chapter", template: "/[book]/[chapter]", path: "/matthew/1", auth: "none" },
  { id: "04-about", template: "/about", path: "/about", auth: "none" },
  { id: "05-articles", template: "/articles", path: "/articles", auth: "none" },
  { id: "06-article-detail", template: "/articles/[id]", target: "article", auth: "none" },
  {
    id: "07-article-edit",
    template: "/articles/[id]/edit",
    target: "article",
    auth: "article-owner",
    readySelector: "main #article-title",
  },
  {
    id: "08-article-new",
    template: "/articles/new",
    path: "/articles/new",
    auth: "shared-user",
  },
  { id: "09-bookmarks", template: "/bookmarks", path: "/bookmarks", auth: "shared-user" },
  { id: "10-feedback", template: "/feedback", path: "/feedback", auth: "none" },
  {
    id: "11-forgot-password",
    template: "/forgot-password",
    path: "/forgot-password",
    auth: "none",
  },
  { id: "12-guidelines", template: "/guidelines", path: "/guidelines", auth: "none" },
  { id: "13-licenses", template: "/licenses", path: "/licenses", auth: "none" },
  { id: "14-login", template: "/login", path: "/login", auth: "none" },
  {
    id: "15-notifications",
    template: "/notifications",
    path: "/notifications",
    auth: "shared-user",
  },
  { id: "16-plans", template: "/plans", path: "/plans", auth: "none" },
  { id: "17-plan-detail", template: "/plans/[id]", target: "plan", auth: "none" },
  {
    id: "18-plan-edit",
    template: "/plans/[id]/edit",
    target: "plan",
    auth: "plan-owner",
    readySelector: "main input.form-control",
  },
  { id: "19-plan-new", template: "/plans/new", path: "/plans/new", auth: "shared-user" },
  { id: "20-privacy", template: "/privacy", path: "/privacy", auth: "none" },
  { id: "21-profile", template: "/profile", path: "/profile", auth: "shared-user" },
  {
    id: "22-public-profile",
    template: "/profile/[username]",
    target: "profile",
    auth: "none",
  },
  { id: "23-qa", template: "/qa", path: "/qa", auth: "none" },
  { id: "24-question-detail", template: "/qa/[id]", target: "question", auth: "none" },
  { id: "25-read", template: "/read", path: "/read", auth: "none" },
  { id: "26-register", template: "/register", path: "/register", auth: "none" },
  {
    id: "27-reset-password",
    template: "/reset-password",
    path: "/reset-password?uid=visual-fixture&token=visual-fixture",
    auth: "none",
  },
  { id: "28-search", template: "/search", path: "/search?q=%E6%84%9B", auth: "none" },
  { id: "29-settings", template: "/settings", path: "/settings", auth: "shared-user" },
  { id: "30-terms", template: "/terms", path: "/terms", auth: "none" },
  { id: "31-translations", template: "/translations", path: "/translations", auth: "none" },
  {
    id: "32-translation-detail",
    template: "/translations/[id]",
    target: "translation",
    auth: "translation-owner",
  },
  {
    id: "33-translation-read",
    template: "/translations/[id]/read",
    target: "translation",
    auth: "none",
  },
  {
    id: "34-translation-chapter",
    template: "/translations/[id]/read/[chapter]",
    target: "translation-chapter",
    auth: "none",
  },
  {
    id: "35-translation-new",
    template: "/translations/new",
    path: "/translations/new",
    auth: "shared-user",
  },
] as const;

export const VISUAL_MOBILE_VARIANT_IDS = [
  "01-home",
  "03-chapter",
  "23-qa",
  "07-article-edit",
] as const;
export const VISUAL_ENGLISH_VARIANT_IDS = [
  "01-home",
  "03-chapter",
  "14-login",
  "06-article-detail",
] as const;

export const VISUAL_SNAPSHOT_BASENAMES = [
  ...VISUAL_ROUTE_CASES.map((route) => `route-${route.id}-ja-desktop`),
  ...VISUAL_MOBILE_VARIANT_IDS.map((id) => `route-${id}-ja-mobile`),
  ...VISUAL_ENGLISH_VARIANT_IDS.map((id) => `route-${id}-en-desktop`),
  "route-404-ja-desktop",
].sort();

export const VISUAL_LINUX_SNAPSHOT_FILENAMES = VISUAL_SNAPSHOT_BASENAMES.map(
  (basename) => `${basename}-chromium-linux.png`
).sort();

type ListEnvelope<T> = { results?: T[] } | T[];
type OwnedItem = { id: string; owner_username: string };
type QuestionItem = { id: string; user?: { username?: string } };
type TranslationRead = { chapters?: number[] };

async function responseJson<T>(request: APIRequestContext, path: string): Promise<T> {
  const response = await request.get(`${API_BASE}/api${path}`);
  if (!response.ok()) {
    throw new Error(`visual fixture API failed (${response.status()}): GET ${path}\n${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

function listResults<T>(payload: ListEnvelope<T>, label: string): T[] {
  const items = Array.isArray(payload) ? payload : payload.results;
  if (!items?.length) {
    throw new Error(
      `${label} is empty. Rebuild the dedicated visual database with the documented fixed seed.`,
    );
  }
  return items;
}

function normalOwner(items: OwnedItem[], label: string): OwnedItem {
  const item = items.find((candidate) => candidate.owner_username !== VISUAL_ADMIN_USERNAME);
  if (!item) {
    throw new Error(`${label} has no non-admin owner; the fixed visual seed is incomplete.`);
  }
  return item;
}

async function publicArticle(request: APIRequestContext): Promise<OwnedItem> {
  const payload = await responseJson<ListEnvelope<OwnedItem>>(request, "/articles/");
  return normalOwner(listResults(payload, "public articles"), "public articles");
}

async function publicPlan(request: APIRequestContext): Promise<OwnedItem> {
  const payload = await responseJson<ListEnvelope<OwnedItem>>(request, "/plans/");
  return normalOwner(listResults(payload, "public plans"), "public plans");
}

async function publishedTranslation(request: APIRequestContext): Promise<OwnedItem> {
  const payload = await responseJson<ListEnvelope<OwnedItem>>(
    request,
    "/translations/?status=published&page=1",
  );
  // The fixed small seed deliberately makes the first two projects admin-owned.
  // Public/read routes do not require authentication, and the owner view selects
  // the matching admin credential when this first stable item belongs to admin.
  return listResults(payload, "published translations")[0];
}

async function publicQuestion(request: APIRequestContext): Promise<QuestionItem & { user: { username: string } }> {
  const payload = await responseJson<ListEnvelope<QuestionItem>>(request, "/qa/questions/");
  const item = listResults(payload, "public questions").find(
    (candidate) => candidate.user?.username && candidate.user.username !== VISUAL_ADMIN_USERNAME,
  );
  if (!item?.user?.username) {
    throw new Error("public questions have no non-admin author; the fixed visual seed is incomplete.");
  }
  return item as QuestionItem & { user: { username: string } };
}

async function sharedUsername(request: APIRequestContext): Promise<string> {
  return (await publicArticle(request)).owner_username;
}

async function resolveRoute(
  request: APIRequestContext,
  route: VisualRouteCase,
): Promise<{ path: string; username?: string }> {
  if (route.path) {
    const username = route.auth === "shared-user" ? await sharedUsername(request) : undefined;
    return { path: route.path, username };
  }

  switch (route.target) {
    case "article": {
      const article = await publicArticle(request);
      return {
        path: `/articles/${article.id}${route.template.endsWith("/edit") ? "/edit" : ""}`,
        username: route.auth === "article-owner" ? article.owner_username : undefined,
      };
    }
    case "plan": {
      const plan = await publicPlan(request);
      return {
        path: `/plans/${plan.id}${route.template.endsWith("/edit") ? "/edit" : ""}`,
        username: route.auth === "plan-owner" ? plan.owner_username : undefined,
      };
    }
    case "profile": {
      const username = await sharedUsername(request);
      return { path: `/profile/${encodeURIComponent(username)}` };
    }
    case "question": {
      const question = await publicQuestion(request);
      return { path: `/qa/${question.id}` };
    }
    case "translation": {
      const project = await publishedTranslation(request);
      return {
        path: `/translations/${project.id}${route.template.endsWith("/read") ? "/read" : ""}`,
        username: route.auth === "translation-owner" ? project.owner_username : undefined,
      };
    }
    case "translation-chapter": {
      const project = await publishedTranslation(request);
      const read = await responseJson<TranslationRead>(request, `/translations/${project.id}/read/`);
      const chapter = read.chapters?.[0];
      if (!chapter) {
        throw new Error("published visual translation has no readable chapter.");
      }
      return { path: `/translations/${project.id}/read/${chapter}` };
    }
    default:
      throw new Error(`Visual route ${route.template} has no concrete path resolver.`);
  }
}

async function setLanguage(page: Page, language: "ja" | "en") {
  await page.context().addCookies([
    {
      name: "neon_lang",
      value: language,
      url: new URL(WEB_BASE).origin,
      sameSite: "Lax",
    },
  ]);
}

async function authenticate(page: Page, username: string) {
  const password =
    username === VISUAL_ADMIN_USERNAME
      ? process.env.VISUAL_BASELINE_ADMIN_PASSWORD
      : process.env.VISUAL_BASELINE_USER_PASSWORD;
  if (!password) {
    throw new Error(
      `${
        username === VISUAL_ADMIN_USERNAME
          ? "VISUAL_BASELINE_ADMIN_PASSWORD"
          : "VISUAL_BASELINE_USER_PASSWORD"
      } is required for authenticated visual routes.`,
    );
  }
  await page.request.get(`${API_BASE}/api/csrf/`);
  const csrfToken = (await page.context().cookies(API_BASE)).find(
    (cookie) => cookie.name === "csrftoken",
  )?.value;
  const response = await page.request.post(`${API_BASE}/api/auth/login/`, {
    data: { username, password },
    headers: csrfToken ? { "X-CSRFToken": csrfToken } : undefined,
  });
  if (!response.ok()) {
    throw new Error(
      `visual fixture login failed for ${username} (${response.status()}): ${await response.text()}`,
    );
  }
}

/**
 * Resolve random UUIDs through deterministic seed content, then enter the route
 * with a fixed language, browser time, and (where needed) owner identity.
 */
export async function openVisualRoute(
  page: Page,
  route: VisualRouteCase,
  options: { language?: "ja" | "en"; viewport?: { width: number; height: number } } = {},
) {
  if (options.viewport) await page.setViewportSize(options.viewport);
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await setLanguage(page, options.language ?? "ja");

  const resolved = await resolveRoute(page.request, route);
  if (resolved.username) await authenticate(page, resolved.username);

  // setFixedTime freezes Date without freezing timers used by hydration, polling,
  // and autosave. The backend seed uses this same instant.
  await page.clock.setFixedTime(new Date(VISUAL_REFERENCE_TIME));
  const response = await page.goto(resolved.path, { waitUntil: "domcontentloaded" });
  expect(response, `No navigation response for ${route.template}`).not.toBeNull();
  expect(response!.status(), `Unexpected HTTP status for ${route.template}`).toBeLessThan(400);
  expect(new URL(page.url()).pathname, `${route.template} redirected unexpectedly`).toBe(
    new URL(resolved.path, WEB_BASE).pathname,
  );

  if (resolved.username) {
    const authenticatedUser = await page.evaluate(async () => {
      const authResponse = await fetch("/api/auth/me/", { credentials: "include" });
      return {
        status: authResponse.status,
        body: authResponse.ok ? await authResponse.json() : null,
      };
    });
    expect(authenticatedUser.status, `${route.template} lost its authenticated session`).toBe(200);
    expect(authenticatedUser.body?.username).toBe(resolved.username);
  }

  const ready = route.readySelector
    ? page.locator(route.readySelector).first()
    : page.getByRole("heading", { level: 1 }).first();
  await expect(ready, `${route.template} never reached its representative state`).toBeVisible();
  await expect(page.locator('[data-testid="skeleton-list"]:visible')).toHaveCount(0);
  await expect(page.locator(".spinning:visible")).toHaveCount(0);
  await page.waitForLoadState("networkidle");

  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        caret-color: transparent !important;
        scroll-behavior: auto !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
    `,
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
    const images = Array.from(document.images);
    await Promise.all(
      images.map((image) => {
        if (image.complete) return Promise.resolve();
        return new Promise<void>((resolve, reject) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => reject(new Error(`image failed: ${image.currentSrc}`)), {
            once: true,
          });
        });
      }),
    );
    if (images.some((image) => image.naturalWidth === 0)) {
      throw new Error("A visible route asset has zero natural width.");
    }
    window.scrollTo(0, 0);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}

export async function captureVisualBaseline(page: Page, snapshotName: string) {
  await expect(page).toHaveScreenshot(`${snapshotName}.png`, {
    animations: "disabled",
    caret: "hide",
    fullPage: false,
    maxDiffPixels: 0,
    scale: "css",
  });
}

export function discoverAppPageTemplates(root: string): string[] {
  // Node built-ins are loaded lazily so this browser-oriented support module stays
  // usable by Playwright without bundling filesystem code into the page.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("node:fs") as typeof import("node:fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("node:path") as typeof import("node:path");
  const pages: string[] = [];

  const visit = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(entryPath);
      else if (entry.name === "page.tsx") {
        const relativeDirectory = path.relative(root, directory).split(path.sep).join("/");
        pages.push(relativeDirectory ? `/${relativeDirectory}` : "/");
      }
    }
  };

  visit(root);
  return pages.sort();
}
