import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useParams } from "next/navigation";
import ChapterPage from "./page";

vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/matthew/4",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    title,
    children,
    ...props
  }: {
    href: string;
    title?: string;
    children: React.ReactNode;
  }) => (
    <a href={href} title={title} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchBooks: vi.fn().mockResolvedValue([
      { id: "book1", name: "マタイによる福音書", translation: "口語訳", order: 1 },
    ]),
    fetchChapters: vi.fn().mockResolvedValue([
      { id: "ch4", book: "book1", number: 4 },
    ]),
    fetchVerses: vi.fn().mockResolvedValue([]),
    fetchBookmarks: vi.fn().mockResolvedValue([]),
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", username: "alice" } }),
}));

vi.mock("@/components/reader/VerseList", () => ({
  VerseList: () => <div data-testid="verse-list" />,
}));

vi.mock("@/components/reader/CommentPanel", () => ({
  CommentPanel: () => <div data-testid="comment-panel" />,
}));

vi.mock("@/components/reader/ChapterComments", () => ({
  ChapterComments: () => <div data-testid="chapter-comments" />,
}));

describe("ChapterPage - 章ナビゲーション", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルト: 4章
    vi.mocked(useParams).mockReturnValue({ book: "matthew", chapter: "4" });
  });

  const prevLink = () => screen.queryByRole("link", { name: /前の章/ });
  const nextLink = () => screen.queryByRole("link", { name: /次の章/ });

  it("中間の章のとき前後両方のリンクが表示される", async () => {
    render(<ChapterPage />);
    await waitFor(() => {
      expect(prevLink()).toBeInTheDocument();
      expect(nextLink()).toBeInTheDocument();
    });
    expect(prevLink()).toHaveAttribute("aria-label", expect.stringContaining("3"));
    expect(nextLink()).toHaveAttribute("aria-label", expect.stringContaining("5"));
  });

  it("前後のリンクが正しいURLを持つ", async () => {
    render(<ChapterPage />);
    await waitFor(() => {
      expect(prevLink()).toHaveAttribute("href", "/matthew/3");
      expect(nextLink()).toHaveAttribute("href", "/matthew/5");
    });
  });

  it("1章のとき前の章リンクが表示されない", async () => {
    vi.mocked(useParams).mockReturnValue({ book: "matthew", chapter: "1" });
    const { fetchChapters } = await import("@/lib/api");
    vi.mocked(fetchChapters).mockResolvedValue([{ id: "ch1", book: "book1", number: 1 }]);

    render(<ChapterPage />);

    await waitFor(() => expect(nextLink()).toBeInTheDocument());
    expect(prevLink()).not.toBeInTheDocument();
  });

  it("最終章（マタイ28章）のとき次の章リンクが表示されない", async () => {
    vi.mocked(useParams).mockReturnValue({ book: "matthew", chapter: "28" });
    const { fetchChapters } = await import("@/lib/api");
    vi.mocked(fetchChapters).mockResolvedValue([{ id: "ch28", book: "book1", number: 28 }]);

    render(<ChapterPage />);

    await waitFor(() => expect(prevLink()).toBeInTheDocument());
    expect(nextLink()).not.toBeInTheDocument();
  });

  it("書ごとの最終章が正しく制御される（マルコ16章）", async () => {
    vi.mocked(useParams).mockReturnValue({ book: "mark", chapter: "16" });
    const { fetchBooks, fetchChapters } = await import("@/lib/api");
    vi.mocked(fetchBooks).mockResolvedValue([
      { id: "book2", name: "マルコによる福音書", translation: "口語訳", order: 2 },
    ]);
    vi.mocked(fetchChapters).mockResolvedValue([{ id: "ch16", book: "book2", number: 16 }]);

    render(<ChapterPage />);

    await waitFor(() => expect(prevLink()).toBeInTheDocument());
    expect(nextLink()).not.toBeInTheDocument();
  });
});
