import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ArticlesPage from "./page";
import type { Article } from "@/lib/types";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

vi.mock("@/lib/i18nServer", async () => {
  const { translations } = await import("@/lib/i18nDictionary");
  return { getT: async () => translations.ja, getRequestLanguage: async () => "ja" };
});

vi.mock("@/lib/apiServer", () => ({
  serverFetchPage: vi.fn(),
  serverFetchList: vi.fn(),
  serverIsSignedIn: vi.fn(),
}));

const mine: Article = {
  id: "mine",
  title: "自分の記事",
  summary: "自分の下書き",
  visibility: "private",
  owner_username: "alice",
  tags: [],
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
};

const published: Article = {
  ...mine,
  id: "public",
  title: "公開記事",
  summary: "公開された記事",
  visibility: "public",
  owner_username: "bob",
};

/** サーバー側の取得をまとめて用意する。path で「自分の記事」か「公開記事」かを分ける。 */
async function mockServer({ signedIn }: { signedIn: boolean }) {
  const apiServer = await import("@/lib/apiServer");
  vi.mocked(apiServer.serverIsSignedIn).mockResolvedValue(signedIn);
  // 主題の一覧だけを返す。書の一覧（絞り込み用）は空。
  vi.mocked(apiServer.serverFetchList).mockImplementation(async (path: string) =>
    path.startsWith("/article-tags/") ? [{ id: "t1", name: "断食", slug: "fasting", article_count: 1 }] : [],
  );
  vi.mocked(apiServer.serverFetchPage).mockImplementation(async (path: string) => ({
    // exclude_mine=true も mine=true を含むので、先頭の ? まで見て区別する
    results: path.includes("?mine=true") ? [mine] : [published],
    count: 1,
    hasMore: false,
    counts: undefined,
  }));
  return apiServer;
}

/** サーバーコンポーネントなので、await して返ってきたものを描く。 */
async function renderPage(searchParams: Record<string, string> = {}) {
  render(await ArticlesPage({ searchParams: Promise.resolve(searchParams) }));
}

describe("記事一覧", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("最初は公開記事のタブを開き、自分の記事は取りに行かない", async () => {
    const apiServer = await mockServer({ signedIn: true });
    await renderPage();

    expect(screen.getByRole("link", { name: "公開記事" })).toHaveAttribute("href", "/articles/public");
    expect(screen.queryByRole("link", { name: "自分の記事" })).not.toBeInTheDocument();

    const paths = vi.mocked(apiServer.serverFetchPage).mock.calls.map(([path]) => path);
    expect(paths).toEqual(["/articles/"]);
  });

  it("タブは URL で切り替わり、開いているほうだけを取りに行く", async () => {
    const apiServer = await mockServer({ signedIn: true });
    await renderPage({ tab: "mine" });

    expect(screen.getByRole("tab", { name: "自分の記事" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "公開された記事" })).toHaveAttribute("href", "/articles");
    expect(screen.getByRole("link", { name: "自分の記事" })).toHaveAttribute("href", "/articles/mine");
    expect(screen.getByRole("link", { name: "編集" })).toHaveAttribute("href", "/articles/mine/edit");

    const paths = vi.mocked(apiServer.serverFetchPage).mock.calls.map(([path]) => path);
    expect(paths).toEqual(["/articles/?mine=true"]);
  });

  it("書と主題は URL で持ち、漏斗のボタンの中で選ばれているものが分かる", async () => {
    const apiServer = await mockServer({ signedIn: false });
    await renderPage({ tag: "fasting", book: "matthew" });

    expect(screen.getByRole("tab", { name: "自分の記事" })).toHaveAttribute(
      "href",
      "/articles?tab=mine&tag=fasting&book=matthew",
    );
    // 閉じているあいだは出さない
    expect(screen.queryByRole("combobox", { name: "記事の主題" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "絞り込み" }));
    expect(screen.getByRole("combobox", { name: "記事の主題" })).toHaveValue("fasting");

    const paths = vi.mocked(apiServer.serverFetchPage).mock.calls.map(([path]) => path);
    expect(paths).toEqual(["/articles/?tag=fasting&book=matthew"]);
  });

  it("主題を選ぶと URL に書く", async () => {
    await mockServer({ signedIn: false });
    await renderPage();

    await userEvent.click(screen.getByRole("button", { name: "絞り込み" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "記事の主題" }), "fasting");

    expect(replace).toHaveBeenLastCalledWith("/articles?tag=fasting", { scroll: false });
  });

  it("未ログインでも記事を書くためのログイン導線を示す", async () => {
    await mockServer({ signedIn: false });
    await renderPage();

    expect(screen.getByRole("link", { name: "ログインして記事を書く" })).toHaveAttribute(
      "href",
      "/login?from=%2Farticles%2Fnew",
    );
  });

  it("未ログインで自分の記事のタブを開くと、一覧の代わりにログインの案内を出す", async () => {
    const apiServer = await mockServer({ signedIn: false });
    await renderPage({ tab: "mine" });

    expect(screen.getByText("ログインが必要です")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ログインする" })).toHaveAttribute(
      "href",
      "/login?from=%2Farticles%3Ftab%3Dmine",
    );
    expect(vi.mocked(apiServer.serverFetchPage)).not.toHaveBeenCalled();
  });

  it("主題が取れなくても記事は読める", async () => {
    const apiServer = await mockServer({ signedIn: false });
    vi.mocked(apiServer.serverFetchList).mockRejectedValue(new Error("offline"));
    await renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent("主題");
    expect(screen.getByRole("link", { name: "公開記事" })).toBeInTheDocument();
  });
});
