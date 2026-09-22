import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "./page";
import type { QAQuestion, TrendingComment, VerseOfDay } from "@/lib/api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/lib/i18nServer", async () => {
  const { translations } = await import("@/lib/i18nDictionary");
  return { getT: async () => translations.ja, getRequestLanguage: async () => "ja" };
});

vi.mock("@/lib/apiServer", () => ({
  serverFetch: vi.fn(),
  serverFetchPage: vi.fn(),
}));

const verse: VerseOfDay = {
  id: "v1",
  number: 16,
  text: "神はそのひとり子を賜わったほどに、この世を愛して下さった。",
  book_name: "ヨハネによる福音書",
  chapter_number: 3,
  translation: "口語訳",
};

const question: QAQuestion = {
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
};

const trending: TrendingComment = {
  id: "c1",
  user: { id: "u2", username: "bob" },
  body: "ここは原語だと別の意味になります",
  created_at: new Date().toISOString(),
  vote_count: 5,
  location_label: "マタイによる福音書 5章",
  book_name: "マタイによる福音書",
  chapter_number: 5,
  verse_number: null,
  reply_count: 0,
};

async function mockServer({ ok = true } = {}) {
  const apiServer = await import("@/lib/apiServer");
  vi.mocked(apiServer.serverFetch).mockImplementation(async (path: string) => {
    if (!ok) throw new Error("Network Error");
    return (path.startsWith("/verse-of-the-day/") ? verse : [trending]) as never;
  });
  vi.mocked(apiServer.serverFetchPage).mockImplementation(async () => {
    if (!ok) throw new Error("Network Error");
    return { results: [question], count: 1, hasMore: false, counts: undefined };
  });
  return apiServer;
}

describe("表紙", () => {
  beforeEach(() => vi.clearAllMocks());

  it("記事のカードから記事一覧へ行ける（ログインは要らない）", async () => {
    await mockServer();

    render(await Home());

    expect(screen.getByRole("link", { name: "記事" })).toHaveAttribute("href", "/articles");
  });

  it("今日の聖句・盛り上がっている意見・最近の質問を、開いた直後から出す", async () => {
    await mockServer();

    render(await Home());

    expect(screen.getByText(/神はそのひとり子を賜わった/)).toBeInTheDocument();
    expect(screen.getByText("ここは原語だと別の意味になります")).toBeInTheDocument();
    expect(screen.getByText("背景を知りたいです。")).toBeInTheDocument();
  });

  it("取れなかったときも表紙は出し、聖句の欄はその旨にする", async () => {
    await mockServer({ ok: false });

    render(await Home());

    expect(screen.getByRole("link", { name: "記事" })).toBeInTheDocument();
    expect(screen.getByText("本日の聖句を取得できませんでした")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("読み込めませんでした");
  });
});
