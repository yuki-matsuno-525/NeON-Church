import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UserProfilePage from "./page";
import { ApiError, type PublicUser, type Comment, type Bookmark, type BookmarkCounts, type ListPage } from "@/lib/api";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    use: (p: unknown) => {
      if (p instanceof Promise) return { username: "targetuser" };
      return actual.use(p as never);
    },
  };
});

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchUserProfile: vi.fn(),
    fetchUserCommentPage: vi.fn(),
    fetchUserBookmarkPage: vi.fn(),
    fetchArticles: vi.fn(),
    formatRelativeTime: vi.fn().mockReturnValue("1日前"),
  };
});

const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const makeProfile = (overrides: Partial<PublicUser> = {}): PublicUser => ({
  id: "u2",
  username: "targetuser",
  bio: "これはテストユーザーです。",
  bookmarks_visibility: "public",
  created_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

const makeComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: "c1",
  user: { id: "u2", username: "targetuser" },
  translation_project: null,
  version_label: "新共同訳",
  parent: null,
  body: "テストコメント本文",
  is_deleted: false,
  created_at: "2024-01-01T00:00:00Z",
  vote_count: 3,
  reply_count: 0,
  tags: [],
  ...overrides,
});

const makeBookmark = (overrides: Partial<Bookmark> = {}): Bookmark => ({
  id: "bm1",
  // 一覧は verse_detail に依存せず reference（訳非依存の箇所）だけで表示する。
  verse_detail: null,
  project_detail: null,
  comment_detail: null,
  target_type: "verse",
  reference: { book: "matthew", chapter: 1, verse: 1 },
  verse_text: null,
  created_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

/** お気に入り1ページ分。counts は results の中身から素直に数える。 */
const makeBookmarkPage = (
  results: Bookmark[],
  overrides: Partial<ListPage<Bookmark, BookmarkCounts>> = {}
): ListPage<Bookmark, BookmarkCounts> => {
  const counts: BookmarkCounts = { all: results.length, verse: 0, chapter: 0, book: 0, comment: 0, project: 0 };
  for (const bm of results) {
    if (bm.target_type) counts[bm.target_type] += 1;
  }
  return { results, count: results.length, hasMore: false, counts, ...overrides };
};

/** コメント1ページ分。こちらは種類の件数を持たない。 */
const makeCommentPage = (
  results: Comment[],
  overrides: Partial<ListPage<Comment>> = {}
): ListPage<Comment> => ({
  results, count: results.length, hasMore: false, counts: undefined, ...overrides,
});

describe("UserProfilePage", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { fetchArticles } = await import("@/lib/api");
    vi.mocked(fetchArticles).mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
  });

  it("ローディング中に「読み込み中...」が表示される", async () => {
    const { fetchUserProfile } = await import("@/lib/api");
    vi.mocked(fetchUserProfile).mockReturnValue(new Promise(() => {}));
    mockUseAuth.mockReturnValue({ user: null });

    render(<UserProfilePage params={Promise.resolve({ username: "targetuser" })} />);
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("自分自身のプロフィールページでは /profile へのリンクが表示される", async () => {
    const { fetchUserProfile, fetchUserCommentPage, fetchUserBookmarkPage } = await import("@/lib/api");
    vi.mocked(fetchUserProfile).mockResolvedValue(makeProfile());
    vi.mocked(fetchUserCommentPage).mockResolvedValue(makeCommentPage([]));
    vi.mocked(fetchUserBookmarkPage).mockResolvedValue(makeBookmarkPage([]));
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "targetuser" } });

    render(<UserProfilePage params={Promise.resolve({ username: "targetuser" })} />);

    await screen.findByText(/自分のプロフィールは/);
    const link = screen.getByRole("link", { name: "こちら" });
    expect(link).toHaveAttribute("href", "/profile");
  });

  it("他ユーザーのプロフィールにユーザー名が表示される", async () => {
    const { fetchUserProfile, fetchUserCommentPage, fetchUserBookmarkPage } = await import("@/lib/api");
    vi.mocked(fetchUserProfile).mockResolvedValue(makeProfile());
    vi.mocked(fetchUserCommentPage).mockResolvedValue(makeCommentPage([]));
    vi.mocked(fetchUserBookmarkPage).mockResolvedValue(makeBookmarkPage([]));
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "otheruser" } });

    render(<UserProfilePage params={Promise.resolve({ username: "targetuser" })} />);

    await screen.findByText("targetuser");
  });

  it("bio が表示される", async () => {
    const { fetchUserProfile, fetchUserCommentPage, fetchUserBookmarkPage } = await import("@/lib/api");
    vi.mocked(fetchUserProfile).mockResolvedValue(makeProfile({ bio: "これはテストユーザーです。" }));
    vi.mocked(fetchUserCommentPage).mockResolvedValue(makeCommentPage([]));
    vi.mocked(fetchUserBookmarkPage).mockResolvedValue(makeBookmarkPage([]));
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "otheruser" } });

    render(<UserProfilePage params={Promise.resolve({ username: "targetuser" })} />);

    await screen.findByText("これはテストユーザーです。");
  });

  it("ユーザーが見つからない場合「ユーザーが見つかりません。」が表示される", async () => {
    const { fetchUserProfile } = await import("@/lib/api");
    vi.mocked(fetchUserProfile).mockRejectedValue(new ApiError(404, "Not Found"));
    mockUseAuth.mockReturnValue({ user: null });

    render(<UserProfilePage params={Promise.resolve({ username: "targetuser" })} />);

    await screen.findByText("ユーザーが見つかりません。");
  });

  it("お気に入りタブが表示される (visibility=public)", async () => {
    const { fetchUserProfile, fetchUserCommentPage, fetchUserBookmarkPage } = await import("@/lib/api");
    vi.mocked(fetchUserProfile).mockResolvedValue(makeProfile());
    vi.mocked(fetchUserCommentPage).mockResolvedValue(makeCommentPage([]));
    vi.mocked(fetchUserBookmarkPage).mockResolvedValue(makeBookmarkPage([makeBookmark()]));
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "otheruser" } });

    render(<UserProfilePage params={Promise.resolve({ username: "targetuser" })} />);

    await screen.findByText(/お気に入り/);
    await screen.findByText(/マタイによる福音書/);
  });

  it("visibility=private のときお気に入りタブが表示されず、bookmarks API は呼ばれない", async () => {
    const { fetchUserProfile, fetchUserCommentPage, fetchUserBookmarkPage } = await import("@/lib/api");
    vi.mocked(fetchUserProfile).mockResolvedValue(makeProfile({ bookmarks_visibility: "private" }));
    vi.mocked(fetchUserCommentPage).mockResolvedValue(makeCommentPage([makeComment()]));
    vi.mocked(fetchUserBookmarkPage).mockResolvedValue(makeBookmarkPage([]));
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "otheruser" } });

    render(<UserProfilePage params={Promise.resolve({ username: "targetuser" })} />);

    await screen.findByText("targetuser");
    expect(screen.queryByRole("button", { name: /お気に入り/ })).not.toBeInTheDocument();
    expect(fetchUserBookmarkPage).not.toHaveBeenCalled();
  });

  it("コメントタブに切り替えできる", async () => {
    const { fetchUserProfile, fetchUserCommentPage, fetchUserBookmarkPage } = await import("@/lib/api");
    vi.mocked(fetchUserProfile).mockResolvedValue(makeProfile());
    vi.mocked(fetchUserCommentPage).mockResolvedValue(makeCommentPage([makeComment()]));
    vi.mocked(fetchUserBookmarkPage).mockResolvedValue(makeBookmarkPage([]));
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "otheruser" } });

    render(<UserProfilePage params={Promise.resolve({ username: "targetuser" })} />);

    await screen.findByText("targetuser");

    const commentTab = await screen.findByRole("tab", { name: /コメント/ });
    fireEvent.click(commentTab);

    await waitFor(() => {
      expect(screen.getByText("テストコメント本文")).toBeInTheDocument();
    });
  });

  it("公開記事をページ単位で読み足し、総件数を表示する", async () => {
    const { fetchUserProfile, fetchUserCommentPage, fetchUserBookmarkPage, fetchArticles } = await import("@/lib/api");
    vi.mocked(fetchUserProfile).mockResolvedValue(makeProfile());
    vi.mocked(fetchUserCommentPage).mockResolvedValue(makeCommentPage([]));
    vi.mocked(fetchUserBookmarkPage).mockResolvedValue(makeBookmarkPage([]));
    vi.mocked(fetchArticles)
      .mockResolvedValueOnce({
        count: 2,
        next: "/api/articles/?page=2",
        previous: null,
        results: [{ id: "a1", title: "最初の記事", summary: "概要", visibility: "public", owner_username: "targetuser", tags: [], created_at: "2026-08-01T00:00:00Z", updated_at: "2026-08-01T00:00:00Z" }],
      })
      .mockResolvedValueOnce({
        count: 2,
        next: null,
        previous: "/api/articles/",
        results: [{ id: "a2", title: "次の記事", summary: "概要", visibility: "public", owner_username: "targetuser", tags: [], created_at: "2026-08-01T00:00:00Z", updated_at: "2026-08-01T00:00:00Z" }],
      });
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "otheruser" } });

    render(<UserProfilePage params={Promise.resolve({ username: "targetuser" })} />);
    const articleTab = await screen.findByRole("tab", { name: "記事 (2)" });
    fireEvent.click(articleTab);
    expect(await screen.findByText("最初の記事")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "もっと見る" }));
    expect(await screen.findByText("次の記事")).toBeInTheDocument();
    expect(fetchArticles).toHaveBeenLastCalledWith({ author: "targetuser", page: 2 });
  });
});
