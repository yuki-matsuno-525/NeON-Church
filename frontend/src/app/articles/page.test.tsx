import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ArticlesPage from "./page";
import type { Article } from "@/lib/types";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
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
  vi.mocked(apiServer.serverFetchList).mockResolvedValue([
    { id: "t1", name: "断食", slug: "fasting", article_count: 1 },
  ]);
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
async function renderPage(searchParams: { tag?: string } = {}) {
  render(await ArticlesPage({ searchParams: Promise.resolve(searchParams) }));
}

describe("記事一覧", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("サーバー側で取った記事を最初から表示し、公開一覧からは自分を除外する", async () => {
    const apiServer = await mockServer({ signedIn: true });
    await renderPage();

    expect(screen.getByRole("link", { name: "自分の記事" })).toHaveAttribute("href", "/articles/mine");
    expect(screen.getByRole("link", { name: "編集" })).toHaveAttribute("href", "/articles/mine/edit");
    expect(screen.getByRole("link", { name: "公開記事" })).toHaveAttribute("href", "/articles/public");

    const paths = vi.mocked(apiServer.serverFetchPage).mock.calls.map(([path]) => path);
    expect(paths).toContain("/articles/?exclude_mine=true");
    expect(paths).toContain("/articles/?mine=true");
  });

  it("主題は URL の tag として持ち、選ばれているものが分かる", async () => {
    const apiServer = await mockServer({ signedIn: false });
    await renderPage({ tag: "fasting" });

    const chip = screen.getByRole("link", { name: /断食/ });
    expect(chip).toHaveAttribute("href", "/articles?tag=fasting");
    expect(chip).toHaveAttribute("aria-current", "page");

    const paths = vi.mocked(apiServer.serverFetchPage).mock.calls.map(([path]) => path);
    expect(paths).toEqual(["/articles/?tag=fasting"]);
  });

  it("未ログインでも記事を書くためのログイン導線を示す", async () => {
    await mockServer({ signedIn: false });
    await renderPage();

    expect(screen.getByRole("link", { name: "ログインして記事を書く" })).toHaveAttribute(
      "href",
      "/login?from=%2Farticles%2Fnew",
    );
    expect(screen.queryByText("自分の記事")).not.toBeInTheDocument();
  });

  it("主題が取れなくても記事は読める", async () => {
    const apiServer = await mockServer({ signedIn: false });
    vi.mocked(apiServer.serverFetchList).mockRejectedValue(new Error("offline"));
    await renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent("主題");
    expect(screen.getByRole("link", { name: "公開記事" })).toBeInTheDocument();
  });
});
