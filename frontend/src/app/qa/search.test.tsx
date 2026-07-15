import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import QAPage from "./page";
import type { QAComment } from "@/lib/api";

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
    useBookCatalog: () => [],
  };
});

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchQAComments: vi.fn(),
    fetchTags: vi.fn(),
    fetchCommentReplies: vi.fn().mockResolvedValue([]),
  };
});

const makeQuestion = (): QAComment => ({
  id: "q1",
  user: { id: "u1", username: "alice" },
  title: "山上の説教について",
  body: "背景を知りたいです。",
  created_at: new Date().toISOString(),
  vote_count: 0,
  tags: [],
  location_label: "マタイ 5:3",
  book_name: "マタイによる福音書",
  chapter_number: 5,
  verse_number: 3,
  reply_count: 0,
  best_answer: null,
});

describe("QAPage search", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { fetchQAComments, fetchTags } = await import("@/lib/api");
    vi.mocked(fetchQAComments).mockResolvedValue([makeQuestion()]);
    vi.mocked(fetchTags).mockResolvedValue([]);
  });

  it("clears the question search term", async () => {
    render(<QAPage />);

    const searchBox = screen.getByRole("searchbox", { name: "質問を検索" });
    fireEvent.change(searchBox, { target: { value: "山上" } });

    const { fetchQAComments } = await import("@/lib/api");
    await waitFor(() => {
      expect(vi.mocked(fetchQAComments)).toHaveBeenCalledWith(expect.objectContaining({ q: "山上" }));
    });

    const callsBeforeClear = vi.mocked(fetchQAComments).mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "入力をクリア" }));

    expect(searchBox).toHaveValue("");
    await waitFor(() => {
      expect(vi.mocked(fetchQAComments).mock.calls.length).toBeGreaterThan(callsBeforeClear);
    });
    expect(vi.mocked(fetchQAComments).mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({ q: "" }));
  });
});
