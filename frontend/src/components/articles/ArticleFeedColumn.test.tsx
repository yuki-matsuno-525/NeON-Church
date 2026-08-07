import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArticleFeedColumn } from "./ArticleFeedColumn";
import type { Article, ListPage } from "@/lib/api";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, fetchArticlePage: vi.fn() };
});

const article = (id: string, title: string): Article => ({
  id,
  title,
  summary: `${title}の要約`,
  visibility: "public",
  owner_username: "bob",
  tags: [],
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
});

const page = (items: Article[], hasMore = false): ListPage<Article> => ({
  results: items,
  count: items.length,
  hasMore,
  counts: undefined,
});

function renderColumn(initial?: ListPage<Article>) {
  return render(
    <ArticleFeedColumn
      title="公開記事"
      description="みんなが読める記事"
      icon="globe"
      tone="ok"
      empty="まだありません"
      excludeMine
      initial={initial}
    />,
  );
}

describe("記事一覧の列", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("サーバーが渡した1ページ目は取り直さずに出す", async () => {
    const api = await import("@/lib/api");
    renderColumn(page([article("a", "最初の記事")]));

    expect(screen.getByRole("link", { name: "最初の記事" })).toHaveAttribute("href", "/articles/a");
    expect(api.fetchArticlePage).not.toHaveBeenCalled();
  });

  it("もっと見るで続きを読み足す", async () => {
    const user = userEvent.setup();
    const api = await import("@/lib/api");
    vi.mocked(api.fetchArticlePage).mockResolvedValue(page([article("b", "次の記事")]));

    renderColumn(page([article("a", "最初の記事")], true));
    await user.click(screen.getByRole("button", { name: /もっと見る/ }));

    expect(await screen.findByRole("link", { name: "次の記事" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "最初の記事" })).toBeInTheDocument();
    expect(api.fetchArticlePage).toHaveBeenCalledWith({ mine: undefined, excludeMine: true, tag: undefined, page: 2 });
  });

  it("サーバー側で取れていなければブラウザ側が取りに行く", async () => {
    const api = await import("@/lib/api");
    vi.mocked(api.fetchArticlePage).mockResolvedValue(page([article("a", "あとから届いた記事")]));

    renderColumn(undefined);

    expect(await screen.findByRole("link", { name: "あとから届いた記事" })).toBeInTheDocument();
    expect(api.fetchArticlePage).toHaveBeenCalledWith({ mine: undefined, excludeMine: true, tag: undefined, page: 1 });
  });

  it("サーバー側でもブラウザ側でも取れなければ、空ではなく失敗として出す", async () => {
    const api = await import("@/lib/api");
    vi.mocked(api.fetchArticlePage).mockRejectedValue(new Error("offline"));

    renderColumn(undefined);

    await waitFor(() => expect(screen.getByRole("button", { name: /もう一度|再/ })).toBeInTheDocument());
    expect(screen.queryByText("まだありません")).not.toBeInTheDocument();
  });
});
