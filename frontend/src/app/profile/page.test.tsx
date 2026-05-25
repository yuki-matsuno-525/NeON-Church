import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProfilePage from "./page";
import type { User, Bookmark, MyComment } from "@/lib/api";

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
    updateProfile: vi.fn(),
    uploadAvatar: vi.fn(),
    fetchBookmarks: vi.fn().mockResolvedValue([]),
    fetchMyComments: vi.fn().mockResolvedValue([]),
  };
});

const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: "u1",
  username: "testuser",
  email: "test@example.com",
  bio: "初期自己紹介",
  avatar_url: null,
  created_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

const makeBookmark = (overrides: Partial<Bookmark> = {}): Bookmark => ({
  id: "bm1",
  verse_detail: {
    id: "v1",
    number: 3,
    text: "アブラハムの子であるダビデの子、イエス・キリストの系図。",
    chapter_number: 1,
    book_name: "マタイによる福音書",
  },
  comment_detail: null,
  target_type: "verse",
  created_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

const makeMyComment = (overrides: Partial<MyComment> = {}): MyComment => ({
  id: "c1",
  user: { id: "u1", username: "testuser" },
  body: "テストコメント",
  created_at: "2024-01-01T00:00:00Z",
  vote_count: 2,
  location_label: "マタイによる福音書 1章 1節",
  ...overrides,
});

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ローディング中に Skeleton を表示する", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true, setUser: vi.fn() });
    render(<ProfilePage />);
    expect(screen.getByTestId("skeleton-list")).toBeInTheDocument();
  });

  it("未ログインの場合 /login にリダイレクトする", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, setUser: vi.fn() });
    render(<ProfilePage />);
    expect(mockPush).toHaveBeenCalledWith("/login?from=/profile");
  });

  it("ユーザー情報が表示される", () => {
    const user = makeUser();
    mockUseAuth.mockReturnValue({ user, loading: false, setUser: vi.fn() });
    render(<ProfilePage />);
    expect(screen.getByText("testuser")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("bio の初期値がフォームに入力されている", () => {
    const user = makeUser({ bio: "初期自己紹介" });
    mockUseAuth.mockReturnValue({ user, loading: false, setUser: vi.fn() });
    render(<ProfilePage />);
    expect(screen.getByRole("textbox", { name: "自己紹介" })).toHaveValue("初期自己紹介");
  });

  it("保存成功時に成功メッセージが表示される", async () => {
    const user = makeUser();
    const setUser = vi.fn();
    mockUseAuth.mockReturnValue({ user, loading: false, setUser });

    const { updateProfile } = await import("@/lib/api");
    vi.mocked(updateProfile).mockResolvedValue({ ...user, bio: "新しい自己紹介" });

    render(<ProfilePage />);
    fireEvent.change(screen.getByRole("textbox", { name: "自己紹介" }), {
      target: { value: "新しい自己紹介" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(screen.getByText("プロフィールを更新しました。")).toBeInTheDocument();
    });
    expect(setUser).toHaveBeenCalledWith({ ...user, bio: "新しい自己紹介" });
  });

  it("保存失敗時にエラーメッセージが表示される", async () => {
    const user = makeUser();
    mockUseAuth.mockReturnValue({ user, loading: false, setUser: vi.fn() });

    const { updateProfile } = await import("@/lib/api");
    vi.mocked(updateProfile).mockRejectedValue(new Error("Network Error"));

    render(<ProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(
        screen.getByText("更新に失敗しました。もう一度お試しください。")
      ).toBeInTheDocument();
    });
  });

  it("保存中はボタンが無効化される", async () => {
    const user = makeUser();
    mockUseAuth.mockReturnValue({ user, loading: false, setUser: vi.fn() });

    const { updateProfile } = await import("@/lib/api");
    vi.mocked(updateProfile).mockReturnValue(new Promise(() => {}));

    render(<ProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(screen.getByRole("button", { name: "保存中..." })).toBeDisabled();
  });

  it("ブックマークタブにブックマーク一覧が表示される", async () => {
    const user = makeUser();
    mockUseAuth.mockReturnValue({ user, loading: false, setUser: vi.fn() });

    const { fetchBookmarks } = await import("@/lib/api");
    vi.mocked(fetchBookmarks).mockResolvedValue([makeBookmark()]);

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText(/マタイによる福音書/)).toBeInTheDocument();
    });
  });

  it("コメントタブに自分のコメントが表示される", async () => {
    const user = makeUser();
    mockUseAuth.mockReturnValue({ user, loading: false, setUser: vi.fn() });

    const { fetchMyComments } = await import("@/lib/api");
    vi.mocked(fetchMyComments).mockResolvedValue([makeMyComment()]);

    render(<ProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: /コメント/ }));

    await waitFor(() => {
      expect(screen.getByText("テストコメント")).toBeInTheDocument();
    });
  });
});
