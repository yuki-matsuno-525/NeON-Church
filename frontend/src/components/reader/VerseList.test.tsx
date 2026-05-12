import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VerseList } from "./VerseList";
import type { Verse, Bookmark } from "@/lib/api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    createBookmark: vi.fn(),
    removeBookmark: vi.fn(),
  };
});

const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const makeVerse = (overrides: Partial<Verse> = {}): Verse => ({
  id: "v1",
  chapter: "c1",
  number: 1,
  text: "テスト節テキスト",
  ...overrides,
});

const makeBookmark = (verseId: string, overrides: Partial<Bookmark> = {}): Bookmark => ({
  id: "bm1",
  verse_detail: {
    id: verseId,
    number: 1,
    text: "テスト節テキスト",
    chapter_number: 1,
    book_name: "マタイによる福音書",
  },
  comment_detail: null,
  target_type: "verse",
  created_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

const defaultProps = {
  verses: [makeVerse()],
  selectedVerseId: null as string | null,
  onSelectVerse: vi.fn(),
  bookmarks: [] as Bookmark[],
  onBookmarksChange: vi.fn(),
};

describe("VerseList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" } });
  });

  // --- 基本表示 ---
  it("節テキストと節番号を表示する", () => {
    render(<VerseList {...defaultProps} />);
    expect(screen.getByText("テスト節テキスト")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("節をクリックすると onSelectVerse が呼ばれる", () => {
    const onSelectVerse = vi.fn();
    render(<VerseList {...defaultProps} onSelectVerse={onSelectVerse} />);
    fireEvent.click(screen.getByTestId("verse-item"));
    expect(onSelectVerse).toHaveBeenCalledWith("v1");
  });

  // --- ブックマークボタン表示制御 ---
  it("選択されていない節にはブックマークボタンが表示されない", () => {
    render(<VerseList {...defaultProps} selectedVerseId={null} />);
    expect(screen.queryByRole("button", { name: /お気に入り/ })).not.toBeInTheDocument();
  });

  it("選択された節にブックマークボタンが表示される（ログイン時）", () => {
    render(<VerseList {...defaultProps} selectedVerseId="v1" />);
    expect(screen.getByRole("button", { name: /お気に入り/ })).toBeInTheDocument();
  });

  it("未ログイン時はブックマークボタンが表示されない", () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<VerseList {...defaultProps} selectedVerseId="v1" />);
    expect(screen.queryByRole("button", { name: /お気に入り/ })).not.toBeInTheDocument();
  });

  it("ブックマーク済みの節には「解除」ボタンが表示される", () => {
    render(
      <VerseList
        {...defaultProps}
        selectedVerseId="v1"
        bookmarks={[makeBookmark("v1")]}
      />
    );
    expect(screen.getByRole("button", { name: /解除/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /🔖 お気に入り/ })).not.toBeInTheDocument();
  });

  // --- ブックマーク追加 ---
  it("ブックマークボタン押下で createBookmark が呼ばれる", async () => {
    const { createBookmark } = await import("@/lib/api");
    vi.mocked(createBookmark).mockResolvedValue(makeBookmark("v1"));

    render(<VerseList {...defaultProps} selectedVerseId="v1" />);
    fireEvent.click(screen.getByRole("button", { name: /お気に入り/ }));

    await waitFor(() => expect(createBookmark).toHaveBeenCalledWith("v1"));
  });

  it("ブックマーク追加成功時に onBookmarksChange が新しいブックマークで呼ばれる", async () => {
    const bm = makeBookmark("v1");
    const { createBookmark } = await import("@/lib/api");
    vi.mocked(createBookmark).mockResolvedValue(bm);
    const onBookmarksChange = vi.fn();

    render(
      <VerseList {...defaultProps} selectedVerseId="v1" onBookmarksChange={onBookmarksChange} />
    );
    fireEvent.click(screen.getByRole("button", { name: /お気に入り/ }));

    await waitFor(() => expect(onBookmarksChange).toHaveBeenCalledWith([bm]));
  });

  // --- ブックマーク解除 ---
  it("解除ボタン押下で removeBookmark が呼ばれる", async () => {
    const bm = makeBookmark("v1");
    const { removeBookmark } = await import("@/lib/api");
    vi.mocked(removeBookmark).mockResolvedValue(undefined);

    render(
      <VerseList {...defaultProps} selectedVerseId="v1" bookmarks={[bm]} />
    );
    fireEvent.click(screen.getByRole("button", { name: /解除/ }));

    await waitFor(() => expect(removeBookmark).toHaveBeenCalledWith("bm1"));
  });

  it("ブックマーク解除成功時に onBookmarksChange でブックマークが除去される", async () => {
    const bm = makeBookmark("v1");
    const { removeBookmark } = await import("@/lib/api");
    vi.mocked(removeBookmark).mockResolvedValue(undefined);
    const onBookmarksChange = vi.fn();

    render(
      <VerseList
        {...defaultProps}
        selectedVerseId="v1"
        bookmarks={[bm]}
        onBookmarksChange={onBookmarksChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /解除/ }));

    await waitFor(() => expect(onBookmarksChange).toHaveBeenCalledWith([]));
  });

  // --- エラー表示 ---
  it("ブックマーク操作失敗時にエラーメッセージが表示される", async () => {
    const { createBookmark } = await import("@/lib/api");
    vi.mocked(createBookmark).mockRejectedValue(new Error("Network Error"));

    render(<VerseList {...defaultProps} selectedVerseId="v1" />);
    fireEvent.click(screen.getByRole("button", { name: /お気に入り/ }));

    await waitFor(() =>
      expect(screen.getByText("ブックマークの操作に失敗しました")).toBeInTheDocument()
    );
  });

  // --- イベント伝播 ---
  it("ブックマークボタン押下で onSelectVerse が呼ばれない（stopPropagation）", async () => {
    const { createBookmark } = await import("@/lib/api");
    vi.mocked(createBookmark).mockResolvedValue(makeBookmark("v1"));
    const onSelectVerse = vi.fn();

    render(
      <VerseList {...defaultProps} selectedVerseId="v1" onSelectVerse={onSelectVerse} />
    );
    fireEvent.click(screen.getByRole("button", { name: /お気に入り/ }));

    expect(onSelectVerse).not.toHaveBeenCalled();
    // 非同期の state 更新を act 内で消化する
    await waitFor(() => expect(createBookmark).toHaveBeenCalled());
  });

  // --- ローディング ---
  it("ブックマーク処理中はボタンが disabled になる", async () => {
    const { createBookmark } = await import("@/lib/api");
    vi.mocked(createBookmark).mockReturnValue(new Promise(() => {}));

    render(<VerseList {...defaultProps} selectedVerseId="v1" />);
    fireEvent.click(screen.getByRole("button", { name: /お気に入り/ }));

    expect(screen.getByRole("button", { name: /お気に入り/ })).toBeDisabled();
  });
});
