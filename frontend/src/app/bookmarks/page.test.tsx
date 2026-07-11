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
  comment_detail: null,
  target_type: "verse",
  reference: { book: "matthew", chapter: 1, verse: 3 },
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

  it("fetchBookmarks が失敗してもページがクラッシュしない", async () => {
    const { fetchBookmarks } = await import("@/lib/api");
    vi.mocked(fetchBookmarks).mockRejectedValue(new Error("Network Error"));
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" }, loading: false });

    render(<BookmarksPage />);

    await screen.findByText("お気に入りはまだありません。");
  });
});
