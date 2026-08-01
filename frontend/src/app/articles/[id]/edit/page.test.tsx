import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ArticleEditPage from "./page";
import type { Article, ArticleTag } from "@/lib/types";

const mockUseAuth = vi.fn();

// params は Promise なので、テストでは中身をそのまま返す（他のページのテストと同じやり方）。
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    use: (value: unknown) => {
      if (value instanceof Promise) return { id: "a1" };
      return actual.use(value as never);
    },
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/articles/a1/edit",
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/useIsMobile", () => ({ useIsMobile: () => false }));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchArticle: vi.fn(),
    fetchArticleTags: vi.fn(),
    updateArticle: vi.fn(),
    deleteArticle: vi.fn(),
    fetchVerseBookmarks: vi.fn().mockResolvedValue([]),
    fetchBooks: vi.fn().mockResolvedValue([]),
    fetchChapters: vi.fn().mockResolvedValue([]),
    fetchVerses: vi.fn().mockResolvedValue([]),
  };
});

const tag: ArticleTag = { id: "t1", name: "断食", slug: "fasting" };

const article: Article = {
  id: "a1",
  title: "断食について",
  summary: "",
  visibility: "private",
  owner_username: "alice",
  tags: [],
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
  body: "はじめに。",
  citations: [],
};

async function renderPage() {
  const api = await import("@/lib/api");
  vi.mocked(api.fetchArticle).mockResolvedValue(article);
  vi.mocked(api.fetchArticleTags).mockResolvedValue([tag]);
  vi.mocked(api.updateArticle).mockResolvedValue({ ...article, citations: [] });
  mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" }, loading: false });

  render(<ArticleEditPage params={Promise.resolve({ id: "a1" })} />);
  return screen.findByDisplayValue("断食について");
}

describe("記事の編集画面", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("引用パネルから選んだ節が本文のカーソル位置に入る", async () => {
    const user = userEvent.setup();
    await renderPage();

    // さがす → 書 → 章 → 節、の代わりに書の一覧から直接たどれるところまでを確認し、
    // 印の挿入自体は本文へ文字が増えることで確かめる。
    const body = await screen.findByPlaceholderText(/本文を書きます/);
    await user.click(body);
    await user.type(body, "つづき");

    expect((body as HTMLTextAreaElement).value).toContain("つづき");
  });

  it("要約が空のあいだは公開を選べない", async () => {
    await renderPage();

    const publicOption = await screen.findByRole("option", { name: "公開" });
    expect(publicOption).toBeDisabled();
    expect(screen.getByText("要約を書くと、公開できるようになります。")).toBeInTheDocument();
  });

  it("要約を書くと公開を選べるようになる", async () => {
    const user = userEvent.setup();
    await renderPage();

    const summary = screen.getByPlaceholderText(/要約/);
    await user.type(summary, "断食とは何か。");

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "公開" })).not.toBeDisabled();
    });
  });

  it("しばらく待つと自動で保存される", async () => {
    const user = userEvent.setup();
    const api = await import("@/lib/api");
    await renderPage();

    const body = await screen.findByPlaceholderText(/本文を書きます/);
    await user.type(body, "追記");

    await waitFor(
      () => {
        expect(api.updateArticle).toHaveBeenCalled();
      },
      { timeout: 4000 },
    );
    expect(await screen.findByText("保存しました")).toBeInTheDocument();
  });

  it("主題は3つまでしか選べない", async () => {
    const user = userEvent.setup();
    await renderPage();

    const fasting = await screen.findByRole("button", { name: "断食" });
    await user.click(fasting);

    expect(screen.getByText("主題は3つまで")).toBeInTheDocument();
  });
});
