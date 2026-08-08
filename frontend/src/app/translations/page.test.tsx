import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TranslationsPage from "./page";
import type { TranslationProject, TranslationStatus } from "@/lib/api";

const replace = vi.fn();
const refresh = vi.fn();
let currentSearch = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
  usePathname: () => "/translations",
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/hooks/useIsMobile", () => ({ useIsMobile: () => false }));

vi.mock("@/lib/i18nServer", async () => {
  const { translations } = await import("@/lib/i18nDictionary");
  return { getT: async () => translations.ja, getRequestLanguage: async () => "ja" };
});

vi.mock("@/lib/apiServer", () => ({
  serverFetchPage: vi.fn(),
  serverIsSignedIn: vi.fn(),
}));

const makeProject = (overrides: Partial<TranslationProject> = {}): TranslationProject => ({
  id: "p1",
  name: "マタイ英訳プロジェクト",
  description: "マタイによる福音書の英訳プロジェクトです。",
  owner_username: "alice",
  source_book: "b1",
  source_book_name: "マタイによる福音書",
  source_book_translation: "口語訳",
  target_language: "en",
  status: "active",
  unit_count: 100,
  done_count: 30,
  is_member: false,
  membership_status: null,
  is_in_library: false,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-10T00:00:00Z",
  ...overrides,
});

/** 列は status ごとに独立して取る。status に一致するものだけをその列に返す。 */
async function mockServer({ signedIn = false, projects = [] as TranslationProject[] } = {}) {
  const apiServer = await import("@/lib/apiServer");
  vi.mocked(apiServer.serverIsSignedIn).mockResolvedValue(signedIn);
  vi.mocked(apiServer.serverFetchPage).mockImplementation(async (path: string) => {
    const status = new URLSearchParams(path.split("?")[1]).get("status") as TranslationStatus;
    const results = projects.filter((project) => project.status === status);
    return { results, count: results.length, hasMore: false, counts: undefined };
  });
  return apiServer;
}

const renderPage = async (params: Record<string, string> = {}) =>
  render(await TranslationsPage({ searchParams: Promise.resolve(params) }));

describe("翻訳プロジェクト一覧", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSearch = "";
  });

  it("ログイン済みなら新規作成の導線と下書きの列を出す", async () => {
    const apiServer = await mockServer({ signedIn: true });

    await renderPage();

    expect(screen.getByText(/＋ 新規作成/)).toBeInTheDocument();
    expect(vi.mocked(apiServer.serverFetchPage)).toHaveBeenCalledTimes(3);
  });

  it("未ログインでは新規作成も下書きの列も出さない", async () => {
    const apiServer = await mockServer({ projects: [makeProject()] });

    await renderPage();

    expect(screen.queryByText(/＋ 新規作成/)).not.toBeInTheDocument();
    expect(vi.mocked(apiServer.serverFetchPage)).toHaveBeenCalledTimes(2);
  });

  it("プロジェクトを、開いた直後から進捗つきで並べる", async () => {
    await mockServer({
      projects: [
        makeProject(),
        makeProject({
          id: "p2",
          name: "マルコ仏訳プロジェクト",
          target_language: "fr",
          status: "published",
          unit_count: 10,
          done_count: 5,
        }),
      ],
    });

    await renderPage();

    expect(screen.getByText("マタイ英訳プロジェクト")).toBeInTheDocument();
    expect(screen.getByText("マルコ仏訳プロジェクト")).toBeInTheDocument();
    expect(screen.getByText(/English/)).toBeInTheDocument();
    expect(screen.getByText("30/100 (30%)")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: /マタイ英訳プロジェクト.*進捗/ })).toHaveAttribute(
      "aria-valuenow",
      "30",
    );
  });

  it("1件も無いときは、列ごとに空だと伝える", async () => {
    await mockServer();

    await renderPage();

    expect(screen.getAllByText("このステータスのプロジェクトはありません")).toHaveLength(2);
  });

  it("取得失敗を空一覧と誤表示せず、列ごとに再試行できる", async () => {
    const apiServer = await mockServer();
    vi.mocked(apiServer.serverFetchPage).mockRejectedValue(new Error("Network Error"));

    await renderPage();

    expect(
      screen.getAllByText("読み込みに失敗しました。通信状況を確認して再試行してください。"),
    ).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("button", { name: "再試行" })[0]);
    expect(refresh).toHaveBeenCalled();
  });

  it("検索語は、手が止まってから URL に書き出す", async () => {
    await mockServer({ projects: [makeProject()] });
    currentSearch = "published=3";

    await renderPage({ published: "3" });

    fireEvent.change(screen.getByRole("searchbox", { name: "プロジェクトを検索" }), {
      target: { value: "Matthew" },
    });

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/translations?published=3&q=Matthew", { scroll: false }),
    );
  });

  it("開いていたページが無くなったら1ページ目に戻す", async () => {
    const apiServer = await mockServer({ projects: [makeProject()] });
    const { ApiError } = await import("@/lib/api");
    const real = vi.mocked(apiServer.serverFetchPage).getMockImplementation()!;
    // 3ページ目は無い（DRF は 404 を返す）。1ページ目なら取れる。
    vi.mocked(apiServer.serverFetchPage).mockImplementation(async (path: string) => {
      if (path.includes("page=3")) throw new ApiError(404, "Invalid page.");
      return real(path);
    });

    await renderPage({ published: "3" });

    const paths = vi.mocked(apiServer.serverFetchPage).mock.calls.map(([path]) => path);
    expect(paths.some((path) => path.includes("status=published") && path.includes("page=1"))).toBe(true);
    expect(
      screen.queryByText("読み込みに失敗しました。通信状況を確認して再試行してください。"),
    ).not.toBeInTheDocument();
  });

  it("URL の検索語で入力欄を初期化する", async () => {
    await mockServer({ projects: [makeProject()] });
    currentSearch = "q=Luke";

    const apiServer = await import("@/lib/apiServer");
    await renderPage({ q: "Luke" });

    expect(screen.getByRole("searchbox", { name: "プロジェクトを検索" })).toHaveValue("Luke");
    for (const [path] of vi.mocked(apiServer.serverFetchPage).mock.calls) {
      expect(path).toContain("q=Luke");
    }
    expect(replace).not.toHaveBeenCalled();
  });
});
