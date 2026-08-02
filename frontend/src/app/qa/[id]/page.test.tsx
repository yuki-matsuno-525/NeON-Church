import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import QuestionDetailPage from "./page";
import type { ListPage, QAAnswer, QAQuestion } from "@/lib/api";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "q1" }),
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// 質問者本人としてログインしている状態にする（ベストアンサーを選べる側）。
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", username: "alice" } }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchQuestion: vi.fn(),
    fetchAnswerPage: vi.fn(),
    createAnswer: vi.fn().mockResolvedValue({ id: "a2" }),
    setQuestionBestAnswer: vi.fn().mockResolvedValue(undefined),
  };
});

const makeQuestion = (overrides: Partial<QAQuestion> = {}): QAQuestion => ({
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
  answer_count: 1,
  ...overrides,
});

const makeAnswer = (overrides: Partial<QAAnswer> = {}): QAAnswer => ({
  id: "a1",
  user: { id: "u2", username: "bob" },
  body: "旧約の背景があります",
  is_deleted: false,
  is_best: false,
  created_at: new Date().toISOString(),
  ...overrides,
});

const makePage = (results: QAAnswer[]): ListPage<QAAnswer> => ({
  results,
  count: results.length,
  hasMore: false,
  counts: undefined,
});

describe("Q&A 詳細ページ", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { fetchQuestion, fetchAnswerPage } = await import("@/lib/api");
    vi.mocked(fetchQuestion).mockResolvedValue(makeQuestion());
    vi.mocked(fetchAnswerPage).mockResolvedValue(makePage([makeAnswer()]));
  });

  it("質問の全文と回答を表示する", async () => {
    render(<QuestionDetailPage />);

    expect(await screen.findByRole("heading", { name: "山上の説教について" })).toBeInTheDocument();
    expect(screen.getByText("背景を知りたいです。")).toBeInTheDocument();
    expect(screen.getByText("旧約の背景があります")).toBeInTheDocument();
  });

  it("箇所から読書ページへ飛べる", async () => {
    render(<QuestionDetailPage />);
    const link = await screen.findByRole("link", { name: /マタイによる福音書 5章3節/ });
    expect(link).toHaveAttribute("href", "/matthew/5#verse-3");
  });

  it("回答を投稿できる", async () => {
    render(<QuestionDetailPage />);
    await screen.findByRole("heading", { name: "山上の説教について" });

    const textbox = screen.getByRole("textbox", { name: "この質問に答える..." });
    fireEvent.change(textbox, { target: { value: "回答本文" } });
    fireEvent.click(screen.getByRole("button", { name: "回答を投稿する" }));

    const { createAnswer } = await import("@/lib/api");
    await waitFor(() => {
      expect(vi.mocked(createAnswer)).toHaveBeenCalledWith("q1", "回答本文");
    });
  });

  it("質問者はベストアンサーを選べる", async () => {
    render(<QuestionDetailPage />);
    const button = await screen.findByRole("button", { name: "ベストアンサー" });
    fireEvent.click(button);

    const { setQuestionBestAnswer } = await import("@/lib/api");
    await waitFor(() => {
      expect(vi.mocked(setQuestionBestAnswer)).toHaveBeenCalledWith("q1", "a1");
    });
  });

  it("質問が見つからなければその旨を出す", async () => {
    const { fetchQuestion } = await import("@/lib/api");
    vi.mocked(fetchQuestion).mockRejectedValue(new Error("404"));

    render(<QuestionDetailPage />);
    expect(await screen.findByText("この質問は見つかりませんでした。")).toBeInTheDocument();
  });
});
