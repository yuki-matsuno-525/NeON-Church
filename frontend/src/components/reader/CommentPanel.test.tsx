import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
    fetchArticlesCitingVerse: vi.fn(),
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

    expect(await screen.findByRole("button", { name: "引用した記事 (1)" })).toBeInTheDocument();
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
    expect(screen.queryByRole("button", { name: /引用した記事/ })).not.toBeInTheDocument();
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

    const tab = await screen.findByRole("button", { name: "引用した記事 (1)" });
    expect(screen.queryByText("断食について")).not.toBeInTheDocument();

    tab.click();

    expect(await screen.findByText("断食について")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /断食について/ })).toHaveAttribute(
      "href",
      "/articles/a1",
    );
  });
});
