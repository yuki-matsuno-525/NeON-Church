import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import BookmarksPage from "./page";
import type { Bookmark } from "@/lib/api";

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
    fetchBookmarks: vi.fn(),
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
    const { fetchBookmarks } = await import("@/lib/api");
    vi.mocked(fetchBookmarks).mockResolvedValue([]);
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" }, loading: false });

    render(<BookmarksPage />);

    await screen.findByText("お気に入りはまだありません。");
  });

  it("ブックマーク一覧を表示する（書名・章・節番号）", async () => {
    const { fetchBookmarks } = await import("@/lib/api");
    vi.mocked(fetchBookmarks).mockResolvedValue([makeBookmark()]);
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" }, loading: false });

    render(<BookmarksPage />);

    await screen.findByText(/マタイによる福音書/);
    expect(screen.getByText(/1章/)).toBeInTheDocument();
    expect(screen.getByText(/3節/)).toBeInTheDocument();
  });

  it("ブックマークのリンクが正しい章URLを持つ", async () => {
    const { fetchBookmarks } = await import("@/lib/api");
    vi.mocked(fetchBookmarks).mockResolvedValue([makeBookmark()]);
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" }, loading: false });

    render(<BookmarksPage />);

    const link = await screen.findByRole("link");
    expect(link).toHaveAttribute("href", "/matthew/1#verse-3");
  });

  it("複数のブックマークがすべて表示される", async () => {
    const { fetchBookmarks } = await import("@/lib/api");
    vi.mocked(fetchBookmarks).mockResolvedValue([
      makeBookmark({ id: "bm1" }),
      makeBookmark({
        id: "bm2",
        reference: { book: "mark", chapter: 2, verse: 5 },
      }),
    ]);
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" }, loading: false });

    render(<BookmarksPage />);

    await screen.findByText(/マタイによる福音書/);
    expect(screen.getByText(/マルコによる福音書/)).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("節の栞に本文（verse_text）を表示する", async () => {
    const { fetchBookmarks } = await import("@/lib/api");
    vi.mocked(fetchBookmarks).mockResolvedValue([
      makeBookmark({ verse_text: "はじめに神は天と地とを創造された。" }),
    ]);
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" }, loading: false });

    render(<BookmarksPage />);

    await screen.findByText("はじめに神は天と地とを創造された。");
  });

  it("コメントの栞は箇所ラベル付きでその節へリンクする", async () => {
    const { fetchBookmarks } = await import("@/lib/api");
    vi.mocked(fetchBookmarks).mockResolvedValue([
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
    ]);
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" }, loading: false });

    render(<BookmarksPage />);

    const link = await screen.findByRole("link", { name: /栞したコメント本文/ });
    expect(link).toHaveAttribute("href", "/matthew/1?translation=%E5%8F%A3%E8%AA%9E%E8%A8%B3#verse-3");
    expect(screen.getByText(/マタイによる福音書 1章3節/)).toBeInTheDocument();
  });

  it("fetchBookmarks が失敗してもページがクラッシュしない", async () => {
    const { fetchBookmarks } = await import("@/lib/api");
    vi.mocked(fetchBookmarks).mockRejectedValue(new Error("Network Error"));
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" }, loading: false });

    render(<BookmarksPage />);

    await screen.findByText("お気に入りはまだありません。");
  });
});
