import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import QuestionDetailPage from "./page";
import type { QAAnswer, QAQuestion } from "@/lib/api";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
  usePathname: () => "/qa/q1",
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

vi.mock("@/lib/i18nServer", async () => {
  const { translations } = await import("@/lib/i18nDictionary");
  return { getT: async () => translations.ja, getRequestLanguage: async () => "ja" };
});

vi.mock("@/lib/apiServer", () => ({
  serverFetch: vi.fn(),
  serverFetchPage: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    createAnswer: vi.fn().mockResolvedValue({ id: "a2" }),
    fetchAnswerPage: vi.fn().mockResolvedValue({
      count: 0,
      hasMore: false,
      results: [],
    }),
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

async function mockServer({ answers = [makeAnswer()] } = {}) {
  const apiServer = await import("@/lib/apiServer");
  vi.mocked(apiServer.serverFetch).mockResolvedValue(makeQuestion());
  vi.mocked(apiServer.serverFetchPage).mockResolvedValue({
    results: answers,
    count: answers.length,
    hasMore: false,
    counts: undefined,
  });
  return apiServer;
}

const renderPage = async () => render(await QuestionDetailPage({ params: Promise.resolve({ id: "q1" }) }));

describe("Q&A 詳細ページ", () => {
  beforeEach(() => vi.clearAllMocks());

  it("質問の全文と回答を、開いた直後から表示する", async () => {
    await mockServer();

    await renderPage();

    expect(screen.getByRole("heading", { name: "山上の説教について" })).toBeInTheDocument();
    expect(screen.getByText("背景を知りたいです。")).toBeInTheDocument();
    expect(screen.getByText("旧約の背景があります")).toBeInTheDocument();
  });

  it("箇所から読書ページへ飛べる", async () => {
    await mockServer();

    await renderPage();

    expect(screen.getByRole("link", { name: /マタイによる福音書 5章3節/ })).toHaveAttribute(
      "href",
      "/matthew/5#verse-3",
    );
  });

  it("回答を投稿できる", async () => {
    await mockServer();

    await renderPage();

    fireEvent.change(screen.getByRole("textbox", { name: "この質問に答える..." }), {
      target: { value: "回答本文" },
    });
    fireEvent.click(screen.getByRole("button", { name: "回答を投稿する" }));

    const { createAnswer } = await import("@/lib/api");
    await waitFor(() => expect(vi.mocked(createAnswer)).toHaveBeenCalledWith("q1", "回答本文"));
  });

  it("質問者はベストアンサーを選べ、質問側の表示も取り直す", async () => {
    await mockServer();

    await renderPage();

    fireEvent.click(screen.getByRole("button", { name: "ベストアンサー" }));

    const { setQuestionBestAnswer } = await import("@/lib/api");
    await waitFor(() => expect(vi.mocked(setQuestionBestAnswer)).toHaveBeenCalledWith("q1", "a1"));
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  it("質問が見つからなければその旨を出す", async () => {
    const apiServer = await mockServer();
    vi.mocked(apiServer.serverFetch).mockRejectedValue(new Error("404"));

    await renderPage();

    expect(screen.getByText("この質問は見つかりませんでした。")).toBeInTheDocument();
  });
});
