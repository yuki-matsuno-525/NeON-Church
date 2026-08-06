import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ChapterPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/matthew/4",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, title, children, ...props }: { href: string; title?: string; children: React.ReactNode }) => (
    <a href={href} title={title} {...props}>{children}</a>
  ),
}));

vi.mock("@/lib/i18nServer", async () => {
  const { translations } = await import("@/lib/i18nDictionary");
  return { getT: async () => translations.ja, getRequestLanguage: async () => "ja" };
});

vi.mock("@/lib/serverLanguage", () => ({
  getRequestTranslation: vi.fn().mockResolvedValue("口語訳"),
}));

vi.mock("@/lib/apiServer", () => ({ serverFetch: vi.fn() }));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, fetchChapterBookmarks: vi.fn().mockResolvedValue([]) };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", username: "alice" } }),
}));

vi.mock("@/components/reader/VerseList", () => ({ VerseList: () => <div data-testid="verse-list" /> }));
vi.mock("@/components/reader/CommentPanel", () => ({ CommentPanel: () => <div data-testid="comment-panel" /> }));
vi.mock("@/components/reader/ChapterComments", () => ({ ChapterComments: () => <div data-testid="chapter-comments" /> }));

/** 「この書のこの章を開いた」状態を作る。書・章・節は1回でまとめて返ってくる。 */
async function mockChapterRead(bookId: string, name: string, number: number) {
  const apiServer = await import("@/lib/apiServer");
  vi.mocked(apiServer.serverFetch).mockResolvedValue({
    book: { id: bookId, name, translation: "口語訳", order: 1 },
    chapter: { id: `ch${number}`, book: bookId, number },
    verses: [],
  });
  return apiServer;
}

const renderChapter = async (slug: string, chapter: string) =>
  render(
    await ChapterPage({
      params: Promise.resolve({ book: slug, chapter }),
      searchParams: Promise.resolve({}),
    }),
  );

describe("本文ページ - 章ナビゲーション", () => {
  beforeEach(() => vi.clearAllMocks());

  const prevLink = () => screen.queryByRole("link", { name: /前の章/ });
  const nextLink = () => screen.queryByRole("link", { name: /次の章/ });

  it("中間の章のとき前後両方のリンクが正しいURLで表示される", async () => {
    await mockChapterRead("book1", "マタイによる福音書", 4);

    await renderChapter("matthew", "4");

    expect(prevLink()).toHaveAttribute("href", "/matthew/3");
    expect(nextLink()).toHaveAttribute("href", "/matthew/5");
  });

  it("1章のとき前の章リンクが表示されない", async () => {
    await mockChapterRead("book1", "マタイによる福音書", 1);

    await renderChapter("matthew", "1");

    expect(nextLink()).toBeInTheDocument();
    expect(prevLink()).not.toBeInTheDocument();
  });

  it("最終章（マタイ28章）のとき次の章リンクが表示されない", async () => {
    await mockChapterRead("book1", "マタイによる福音書", 28);

    await renderChapter("matthew", "28");

    expect(prevLink()).toBeInTheDocument();
    expect(nextLink()).not.toBeInTheDocument();
  });

  it("書ごとの最終章が正しく制御される（マルコ16章）", async () => {
    await mockChapterRead("book2", "マルコによる福音書", 16);

    await renderChapter("mark", "16");

    expect(prevLink()).toBeInTheDocument();
    expect(nextLink()).not.toBeInTheDocument();
  });
});

describe("本文ページ - サーバー描画", () => {
  beforeEach(() => vi.clearAllMocks());

  it("見出しを開いた直後から出す（読み込み中の枠を挟まない）", async () => {
    await mockChapterRead("book1", "マタイによる福音書", 4);

    await renderChapter("matthew", "4");

    expect(screen.getByRole("heading", { name: "マタイ 第4章" })).toBeInTheDocument();
  });

  it("覚えている訳でサーバーに問い合わせる", async () => {
    const apiServer = await mockChapterRead("book1", "マタイによる福音書", 4);
    const { getRequestTranslation } = await import("@/lib/serverLanguage");
    vi.mocked(getRequestTranslation).mockResolvedValue("文語訳");

    await renderChapter("matthew", "4");

    expect(vi.mocked(apiServer.serverFetch).mock.calls[0][0]).toContain(
      `translation=${encodeURIComponent("文語訳")}`,
    );
  });

  it("その訳にこの書が無いときは、別の訳へ切り替える導線を出す", async () => {
    const apiServer = await import("@/lib/apiServer");
    const { ApiError } = await import("@/lib/api");
    vi.mocked(apiServer.serverFetch).mockRejectedValue(new ApiError(404, "not found", "book_not_found"));
    const { getRequestTranslation } = await import("@/lib/serverLanguage");
    vi.mocked(getRequestTranslation).mockResolvedValue("文語訳");

    await renderChapter("matthew", "4");

    expect(screen.getByRole("alert")).toHaveTextContent("文語訳");
    expect(screen.getAllByRole("button", { name: /に切り替え$/ }).length).toBeGreaterThan(0);
  });
});
