import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BookmarksPage from "./page";
import type { Bookmark, BookmarkCounts, ListPage } from "@/lib/api";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchBookmarkPage: vi.fn(),
    removeBookmark: vi.fn(),
  };
});

const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const makeBookmark = (overrides: Partial<Bookmark> = {}): Bookmark => ({
  id: "bm1",
  // 一覧は verse_detail に依存せず reference（訳非依存の箇所）だけで表示する。
  verse_detail: null,
  project_detail: null,
  comment_detail: null,
  target_type: "verse",
  reference: { book: "matthew", chapter: 1, verse: 3 },
  verse_text: null,
  created_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

/** 1ページ分のレスポンス。counts は results の中身から素直に数える。 */
const makePage = (
  results: Bookmark[],
  overrides: Partial<ListPage<Bookmark, BookmarkCounts>> = {}
): ListPage<Bookmark, BookmarkCounts> => {
  const counts: BookmarkCounts = { all: results.length, verse: 0, chapter: 0, book: 0, comment: 0, project: 0 };
  for (const bm of results) {
    if (bm.target_type) counts[bm.target_type] += 1;
  }
  return { results, count: results.length, hasMore: false, counts, ...overrides };
};

const loggedIn = () =>
  mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" }, loading: false });

describe("BookmarksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ローディング中に Skeleton を表示する", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(<BookmarksPage />);
    expect(screen.getByTestId("skeleton-list")).toBeInTheDocument();
  });

  it("未ログインの場合 /login にリダイレクトする", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(<BookmarksPage />);
    expect(mockPush).toHaveBeenCalledWith("/login?from=/bookmarks");
  });

  it("ブックマークがない場合「お気に入りはまだありません。」を表示する", async () => {
    const { fetchBookmarkPage } = await import("@/lib/api");
    vi.mocked(fetchBookmarkPage).mockResolvedValue(makePage([]));
    loggedIn();

    render(<BookmarksPage />);

    await screen.findByText("お気に入りはまだありません。");
  });

  it("ブックマーク一覧を表示する（書名・章・節番号）", async () => {
    const { fetchBookmarkPage } = await import("@/lib/api");
    vi.mocked(fetchBookmarkPage).mockResolvedValue(makePage([makeBookmark()]));
    loggedIn();

    render(<BookmarksPage />);

    await screen.findByText(/マタイによる福音書/);
    expect(screen.getByText(/1章/)).toBeInTheDocument();
    expect(screen.getByText(/3節/)).toBeInTheDocument();
  });

  it("ブックマークのリンクが正しい章URLを持つ", async () => {
    const { fetchBookmarkPage } = await import("@/lib/api");
    vi.mocked(fetchBookmarkPage).mockResolvedValue(makePage([makeBookmark()]));
    loggedIn();

    render(<BookmarksPage />);

    const link = await screen.findByRole("link");
    expect(link).toHaveAttribute("href", "/matthew/1#verse-3");
  });

  it("複数のブックマークがすべて表示される", async () => {
    const { fetchBookmarkPage } = await import("@/lib/api");
    vi.mocked(fetchBookmarkPage).mockResolvedValue(
      makePage([
        makeBookmark({ id: "bm1" }),
        makeBookmark({ id: "bm2", reference: { book: "mark", chapter: 2, verse: 5 } }),
      ])
    );
    loggedIn();

    render(<BookmarksPage />);

    await screen.findByText(/マタイによる福音書/);
    expect(screen.getByText(/マルコによる福音書/)).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("節の栞に本文（verse_text）を表示する", async () => {
    const { fetchBookmarkPage } = await import("@/lib/api");
    vi.mocked(fetchBookmarkPage).mockResolvedValue(
      makePage([makeBookmark({ verse_text: "はじめに神は天と地とを創造された。" })])
    );
    loggedIn();

    render(<BookmarksPage />);

    await screen.findByText("はじめに神は天と地とを創造された。");
  });

  it("コメントの栞は箇所ラベル付きでその節へリンクする", async () => {
    const { fetchBookmarkPage } = await import("@/lib/api");
    vi.mocked(fetchBookmarkPage).mockResolvedValue(
      makePage([
        makeBookmark({
          target_type: "comment",
          reference: null,
          comment_detail: {
            id: "cm1",
            body: "栞したコメント本文",
            username: "someone",
            created_at: "2024-01-01T00:00:00Z",
            location_label: "マタイによる福音書 1章 3節",
            book_slug: "matthew",
            chapter_number: 1,
            verse_number: 3,
            source_translation: "口語訳",
          },
        }),
      ])
    );
    loggedIn();

    render(<BookmarksPage />);

    const link = await screen.findByRole("link", { name: /栞したコメント本文/ });
    expect(link).toHaveAttribute("href", "/matthew/1?translation=%E5%8F%A3%E8%AA%9E%E8%A8%B3#verse-3");
    expect(screen.getByText(/マタイによる福音書 1章3節/)).toBeInTheDocument();
  });

  it("取りに行けなかったときは「1件も無い」ではなくエラーとやり直しを出す", async () => {
    // 以前は通信エラーでも「お気に入りはまだありません」と出ていたため、
    // サーバーが落ちているのか本当に空なのか区別できなかった。
    const { fetchBookmarkPage } = await import("@/lib/api");
    vi.mocked(fetchBookmarkPage).mockRejectedValue(new Error("Network Error"));
    loggedIn();

    render(<BookmarksPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("読み込めませんでした");
    expect(screen.queryByText("お気に入りはまだありません。")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "もう一度試す" })).toBeInTheDocument();
  });

  it("削除後はカードを一覧から外し、取り消し導線を表示する", async () => {
    const { fetchBookmarkPage, removeBookmark } = await import("@/lib/api");
    vi.mocked(fetchBookmarkPage).mockResolvedValue(makePage([makeBookmark()]));
    vi.mocked(removeBookmark).mockResolvedValue(undefined);
    loggedIn();

    render(<BookmarksPage />);
    await screen.findByText(/マタイによる福音書/);
    await userEvent.click(screen.getByRole("button", { name: "解除" }));

    await screen.findByText("お気に入りを解除しました。");
    expect(screen.queryByText(/マタイによる福音書/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "元に戻す" })).toBeInTheDocument();
  });

  // ------------------------------------------------------------------
  // 種類での絞り込み
  // ------------------------------------------------------------------
  it("種類のチップを件数つきで表示する（0件の種類は出さない）", async () => {
    const { fetchBookmarkPage } = await import("@/lib/api");
    vi.mocked(fetchBookmarkPage).mockResolvedValue(
      makePage([makeBookmark({ id: "bm1" }), makeBookmark({ id: "bm2" })])
    );
    loggedIn();

    render(<BookmarksPage />);

    await screen.findByRole("button", { name: /すべて \(2\)/ });
    expect(screen.getByRole("button", { name: /節 \(2\)/ })).toBeInTheDocument();
    // 章・書・コメント・翻訳は 0 件なのでチップを出さない
    expect(screen.queryByRole("button", { name: /^章/ })).not.toBeInTheDocument();
  });

  it("種類のチップを押すとその種類だけを取り直す", async () => {
    const { fetchBookmarkPage } = await import("@/lib/api");
    vi.mocked(fetchBookmarkPage).mockResolvedValue(makePage([makeBookmark()]));
    loggedIn();

    render(<BookmarksPage />);
    const chip = await screen.findByRole("button", { name: /節 \(1\)/ });
    await userEvent.click(chip);

    expect(fetchBookmarkPage).toHaveBeenCalledWith({ type: "verse", page: 1 });
  });

  it("栞が0件のときはチップを出さない", async () => {
    const { fetchBookmarkPage } = await import("@/lib/api");
    vi.mocked(fetchBookmarkPage).mockResolvedValue(makePage([]));
    loggedIn();

    render(<BookmarksPage />);

    await screen.findByText("お気に入りはまだありません。");
    expect(screen.queryByRole("button", { name: /すべて/ })).not.toBeInTheDocument();
  });

  // ------------------------------------------------------------------
  // もっと見る
  // ------------------------------------------------------------------
  it("続きがあるとき「もっと見る」を表示し、押すと次のページを足す", async () => {
    const { fetchBookmarkPage } = await import("@/lib/api");
    vi.mocked(fetchBookmarkPage)
      .mockResolvedValueOnce(makePage([makeBookmark({ id: "bm1" })], { hasMore: true }))
      .mockResolvedValueOnce(
        makePage([makeBookmark({ id: "bm2", reference: { book: "mark", chapter: 2, verse: 5 } })])
      );
    loggedIn();

    render(<BookmarksPage />);

    const button = await screen.findByRole("button", { name: "もっと見る" });
    await userEvent.click(button);

    // 1ページ目の分は消えず、2ページ目が下に足される
    await screen.findByText(/マルコによる福音書/);
    expect(screen.getByText(/マタイによる福音書/)).toBeInTheDocument();
    expect(fetchBookmarkPage).toHaveBeenLastCalledWith({ type: undefined, page: 2 });
  });

  it("続きがないときは「もっと見る」を出さない", async () => {
    const { fetchBookmarkPage } = await import("@/lib/api");
    vi.mocked(fetchBookmarkPage).mockResolvedValue(makePage([makeBookmark()]));
    loggedIn();

    render(<BookmarksPage />);

    await screen.findByText(/マタイによる福音書/);
    expect(screen.queryByRole("button", { name: "もっと見る" })).not.toBeInTheDocument();
  });
});
