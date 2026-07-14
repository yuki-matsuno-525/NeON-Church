import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UserProfilePage from "./page";
import type { PublicUser, Comment, Bookmark } from "@/lib/api";

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
    fetchUserComments: vi.fn(),
    fetchUserBookmarks: vi.fn(),
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
  verse: "v1",
  chapter: null,
  book: null,
  parent: null,
  body: "テストコメント本文",
  is_qa: false,
  is_deleted: false,
  created_at: "2024-01-01T00:00:00Z",
  vote_count: 3,
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

describe("UserProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ローディング中に「読み込み中...」が表示される", async () => {
    const { fetchUserProfile } = await import("@/lib/api");
    vi.mocked(fetchUserProfile).mockReturnValue(new Promise(() => {}));
    mockUseAuth.mockReturnValue({ user: null });

    render(<UserProfilePage params={Promise.resolve({ username: "targetuser" })} />);
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("自分自身のプロフィールページでは /profile へのリンクが表示される", async () => {
    const { fetchUserProfile, fetchUserComments, fetchUserBookmarks } = await import("@/lib/api");
    vi.mocked(fetchUserProfile).mockResolvedValue(makeProfile());
    vi.mocked(fetchUserComments).mockResolvedValue([]);
    vi.mocked(fetchUserBookmarks).mockResolvedValue([]);
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "targetuser" } });

    render(<UserProfilePage params={Promise.resolve({ username: "targetuser" })} />);

    await screen.findByText(/自分のプロフィールは/);
    const link = screen.getByRole("link", { name: "こちら" });
    expect(link).toHaveAttribute("href", "/profile");
  });

  it("他ユーザーのプロフィールにユーザー名が表示される", async () => {
    const { fetchUserProfile, fetchUserComments, fetchUserBookmarks } = await import("@/lib/api");
    vi.mocked(fetchUserProfile).mockResolvedValue(makeProfile());
    vi.mocked(fetchUserComments).mockResolvedValue([]);
    vi.mocked(fetchUserBookmarks).mockResolvedValue([]);
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "otheruser" } });

    render(<UserProfilePage params={Promise.resolve({ username: "targetuser" })} />);

    await screen.findByText("targetuser");
  });

  it("bio が表示される", async () => {
    const { fetchUserProfile, fetchUserComments, fetchUserBookmarks } = await import("@/lib/api");
    vi.mocked(fetchUserProfile).mockResolvedValue(makeProfile({ bio: "これはテストユーザーです。" }));
    vi.mocked(fetchUserComments).mockResolvedValue([]);
    vi.mocked(fetchUserBookmarks).mockResolvedValue([]);
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "otheruser" } });

    render(<UserProfilePage params={Promise.resolve({ username: "targetuser" })} />);

    await screen.findByText("これはテストユーザーです。");
  });

  it("ユーザーが見つからない場合「ユーザーが見つかりません。」が表示される", async () => {
    const { fetchUserProfile } = await import("@/lib/api");
    vi.mocked(fetchUserProfile).mockRejectedValue(new Error("Not Found"));
    mockUseAuth.mockReturnValue({ user: null });

    render(<UserProfilePage params={Promise.resolve({ username: "targetuser" })} />);

    await screen.findByText("ユーザーが見つかりません。");
  });

  it("お気に入りタブが表示される (visibility=public)", async () => {
    const { fetchUserProfile, fetchUserComments, fetchUserBookmarks } = await import("@/lib/api");
    vi.mocked(fetchUserProfile).mockResolvedValue(makeProfile());
    vi.mocked(fetchUserComments).mockResolvedValue([]);
    vi.mocked(fetchUserBookmarks).mockResolvedValue([makeBookmark()]);
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "otheruser" } });

    render(<UserProfilePage params={Promise.resolve({ username: "targetuser" })} />);

    await screen.findByText(/お気に入り/);
    await screen.findByText(/マタイによる福音書/);
  });

  it("visibility=private のときお気に入りタブが表示されず、bookmarks API は呼ばれない", async () => {
    const { fetchUserProfile, fetchUserComments, fetchUserBookmarks } = await import("@/lib/api");
    vi.mocked(fetchUserProfile).mockResolvedValue(makeProfile({ bookmarks_visibility: "private" }));
    vi.mocked(fetchUserComments).mockResolvedValue([makeComment()]);
    vi.mocked(fetchUserBookmarks).mockResolvedValue([]);
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "otheruser" } });

    render(<UserProfilePage params={Promise.resolve({ username: "targetuser" })} />);

    await screen.findByText("targetuser");
    expect(screen.queryByRole("button", { name: /お気に入り/ })).not.toBeInTheDocument();
    expect(fetchUserBookmarks).not.toHaveBeenCalled();
  });

  it("コメントタブに切り替えできる", async () => {
    const { fetchUserProfile, fetchUserComments, fetchUserBookmarks } = await import("@/lib/api");
    vi.mocked(fetchUserProfile).mockResolvedValue(makeProfile());
    vi.mocked(fetchUserComments).mockResolvedValue([makeComment()]);
    vi.mocked(fetchUserBookmarks).mockResolvedValue([]);
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "otheruser" } });

    render(<UserProfilePage params={Promise.resolve({ username: "targetuser" })} />);

    await screen.findByText("targetuser");

    const commentTab = await screen.findByRole("button", { name: /コメント/ });
    fireEvent.click(commentTab);

    await waitFor(() => {
      expect(screen.getByText("テストコメント本文")).toBeInTheDocument();
    });
  });
});
