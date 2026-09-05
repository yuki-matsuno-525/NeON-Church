import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CommentPanel } from "./CommentPanel";
import type { Article, Verse } from "@/lib/types";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/hooks/useComments", () => ({
  useComments: () => ({ comments: [], setComments: vi.fn(), loading: false, reload: vi.fn() }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchBooks: vi.fn().mockResolvedValue([]),
    fetchArticlesCitingVerse: vi.fn(),
    fetchQuestionPage: vi.fn().mockResolvedValue({
      count: 0,
      hasMore: false,
      results: [],
    }),
    fetchTags: vi.fn().mockResolvedValue([]),
  };
});

const verse: Verse = { id: "v1", chapter: "c1", number: 16, text: "断食するときには" };

const article: Article = {
  id: "a1",
  title: "断食について",
  summary: "断食とは何かをまとめた。",
  visibility: "public",
  owner_username: "alice",
  tags: [],
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
};

function renderPanel() {
  render(
    <CommentPanel verse={verse} chapterNumber={6} bookSlug="matthew" onClose={vi.fn()} />,
  );
}

describe("CommentPanel の「引用した記事」タブ", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("引用した記事があるとタブが出る", async () => {
    const { fetchArticlesCitingVerse } = await import("@/lib/api");
    vi.mocked(fetchArticlesCitingVerse).mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [article],
    });

    renderPanel();

    expect(await screen.findByRole("tab", { name: "引用した記事 (1)" })).toBeInTheDocument();
  });

  it("記事が1件も無いときはタブごと出さない", async () => {
    const { fetchArticlesCitingVerse } = await import("@/lib/api");
    vi.mocked(fetchArticlesCitingVerse).mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    renderPanel();

    await waitFor(() => {
      expect(fetchArticlesCitingVerse).toHaveBeenCalled();
    });
    expect(screen.queryByRole("tab", { name: /引用した記事/ })).not.toBeInTheDocument();
  });

  it("タブを押すと記事の一覧が出る（既定はコメント）", async () => {
    const { fetchArticlesCitingVerse } = await import("@/lib/api");
    vi.mocked(fetchArticlesCitingVerse).mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [article],
    });

    renderPanel();

    const tab = await screen.findByRole("tab", { name: "引用した記事 (1)" });
    expect(screen.queryByText("断食について")).not.toBeInTheDocument();

    tab.click();

    expect(await screen.findByText("断食について")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /断食について/ })).toHaveAttribute(
      "href",
      "/articles/a1",
    );
  });

  it("閉じるボタンへフォーカスし、Escapeでパネルを閉じる", async () => {
    const { fetchArticlesCitingVerse } = await import("@/lib/api");
    vi.mocked(fetchArticlesCitingVerse).mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
    const onClose = vi.fn();
    render(<CommentPanel verse={verse} chapterNumber={6} bookSlug="matthew" onClose={onClose} />);

    const close = screen.getByRole("button", { name: "コメントパネルを閉じる" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("並び替えと検索は畳んであり、絞り込みボタンで開く", async () => {
    const { fetchArticlesCitingVerse } = await import("@/lib/api");
    vi.mocked(fetchArticlesCitingVerse).mockResolvedValue({ count: 0, next: null, previous: null, results: [] });

    renderPanel();

    expect(screen.queryByRole("searchbox", { name: "表示中のコメントを絞り込む" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "新しい順" })).not.toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: "並び替えと検索" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("searchbox", { name: "表示中のコメントを絞り込む" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新しい順" })).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.queryByRole("searchbox", { name: "表示中のコメントを絞り込む" })).not.toBeInTheDocument();
  });

  it("区切り線をキーボードでリサイズできる", async () => {
    const { fetchArticlesCitingVerse } = await import("@/lib/api");
    vi.mocked(fetchArticlesCitingVerse).mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    renderPanel();
    const separator = screen.getByRole("separator", { name: "コメントパネルの幅を変更" });

    fireEvent.keyDown(separator, { key: "Home" });
    expect(separator).toHaveAttribute("aria-valuenow", "280");
    fireEvent.keyDown(separator, { key: "End" });
    expect(separator).toHaveAttribute("aria-valuenow", "640");
  });
});
