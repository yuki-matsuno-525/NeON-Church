import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ArticlesPage from "./page";
import type { Article } from "@/lib/types";

const mockUseAuth = vi.fn();

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => mockUseAuth() }));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, fetchArticles: vi.fn(), fetchArticleTags: vi.fn() };
});

const mine: Article = {
  id: "mine",
  title: "自分の記事",
  summary: "自分の下書き",
  visibility: "private",
  owner_username: "alice",
  tags: [],
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
};

const published: Article = {
  ...mine,
  id: "public",
  title: "公開記事",
  summary: "公開された記事",
  visibility: "public",
  owner_username: "bob",
};

describe("記事一覧", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    window.history.replaceState(null, "", "/articles");
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" }, loading: false });
    const api = await import("@/lib/api");
    vi.mocked(api.fetchArticleTags).mockResolvedValue([{ id: "t1", name: "断食", slug: "fasting", article_count: 1 }]);
    vi.mocked(api.fetchArticles).mockImplementation(async (params) => ({
      count: 1,
      next: null,
      previous: null,
      results: params?.mine ? [mine] : [published],
    }));
  });

  it("自分の記事では閲覧と編集を選べ、公開一覧から自分を除外して取得する", async () => {
    const api = await import("@/lib/api");
    render(<ArticlesPage />);

    expect(await screen.findByRole("link", { name: "自分の記事" })).toHaveAttribute("href", "/articles/mine");
    expect(screen.getByRole("link", { name: "編集" })).toHaveAttribute("href", "/articles/mine/edit");
    expect(await screen.findByRole("link", { name: "公開記事" })).toHaveAttribute("href", "/articles/public");
    expect(api.fetchArticles).toHaveBeenCalledWith(expect.objectContaining({ excludeMine: true }));
  });

  it("主題をURLへ同期して一覧を再取得する", async () => {
    const user = userEvent.setup();
    const api = await import("@/lib/api");
    render(<ArticlesPage />);

    await user.click(await screen.findByRole("button", { name: /断食/ }));

    await waitFor(() => expect(window.location.search).toBe("?tag=fasting"));
    await waitFor(() => expect(api.fetchArticles).toHaveBeenCalledWith(expect.objectContaining({ tag: "fasting" })));
  });

  it("未ログインでも記事を書くためのログイン導線を示す", async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(<ArticlesPage />);

    expect(await screen.findByRole("link", { name: "ログインして記事を書く" })).toHaveAttribute(
      "href",
      "/login?from=%2Farticles%2Fnew",
    );
  });
});
