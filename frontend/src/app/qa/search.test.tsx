import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import QAPage from "./page";
import type { ListPage, QAQuestion } from "@/lib/api";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/hooks/useIsMobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/lib/bookCatalog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bookCatalog")>();
  return {
    ...actual,
    useBookCatalogState: () => ({ catalog: [], loading: false, error: false, retry: vi.fn() }),
  };
});

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchQuestionPage: vi.fn(),
    fetchTags: vi.fn(),
  };
});

const makeQuestion = (): QAQuestion => ({
  id: "q1",
  user: { id: "u1", username: "alice" },
  title: "山上の説教について",
  body: "背景を知りたいです。",
  created_at: new Date().toISOString(),
  is_deleted: false,
  book_slug: "matthew",
  book_name: "マタイによる福音書",
  chapter_number: 5,
  verse_number: 3,
  location_label: "マタイによる福音書 5章 3節",
  version_label: "口語訳",
  tags: [],
  best_answer: null,
  answer_count: 0,
});

const makePage = (results: QAQuestion[]): ListPage<QAQuestion> => ({
  results, count: results.length, hasMore: false, counts: undefined,
});

describe("QAPage search", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { fetchQuestionPage, fetchTags } = await import("@/lib/api");
    vi.mocked(fetchQuestionPage).mockResolvedValue(makePage([makeQuestion()]));
    vi.mocked(fetchTags).mockResolvedValue([]);
  });

  it("clears the question search term", async () => {
    render(<QAPage />);

    const searchBox = screen.getByRole("searchbox", { name: "質問を検索" });
    fireEvent.change(searchBox, { target: { value: "山上" } });

    const { fetchQuestionPage } = await import("@/lib/api");
    await waitFor(() => {
      expect(vi.mocked(fetchQuestionPage)).toHaveBeenCalledWith(expect.objectContaining({ q: "山上" }));
    });

    const callsBeforeClear = vi.mocked(fetchQuestionPage).mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "入力をクリア" }));

    expect(searchBox).toHaveValue("");
    await waitFor(() => {
      expect(vi.mocked(fetchQuestionPage).mock.calls.length).toBeGreaterThan(callsBeforeClear);
    });
    expect(vi.mocked(fetchQuestionPage).mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({ q: "" }));
  });
});
