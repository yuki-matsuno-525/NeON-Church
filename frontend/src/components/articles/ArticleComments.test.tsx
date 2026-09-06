import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ArticleComments } from "./ArticleComments";
import type { ArticleComment } from "@/lib/api";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    createArticleComment: vi.fn(),
    deleteArticleComment: vi.fn(),
    fetchArticleComments: vi.fn(),
  };
});

describe("記事コメント", () => {
  beforeEach(() => vi.clearAllMocks());

  it("非同期のコメント読込が終わるまで領域をbusyとして公開する", async () => {
    const api = await import("@/lib/api");
    let finish!: (comments: ArticleComment[]) => void;
    vi.mocked(api.fetchArticleComments).mockReturnValue(
      new Promise<ArticleComment[]>((resolve) => {
        finish = resolve;
      }),
    );

    const { container } = render(<ArticleComments articleId="article-1" />);
    const section = container.querySelector("section");
    expect(section).toHaveAttribute("aria-busy", "true");

    finish([
      {
        id: "comment-1",
        username: "reader",
        body: "読みました",
        parent: null,
        is_deleted: false,
        created_at: "2026-08-01T00:00:00Z",
      },
    ]);

    expect(await screen.findByText("読みました")).toBeInTheDocument();
    await waitFor(() => expect(section).toHaveAttribute("aria-busy", "false"));
  });
});
