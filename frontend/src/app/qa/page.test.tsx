import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QAPage from "./page";
import type { Book, QAQuestion } from "@/lib/api";

const replace = vi.fn();
const refresh = vi.fn();
let currentSearch = "";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
  useSearchParams: () => new URLSearchParams(currentSearch),
  usePathname: () => "/qa",
}));

vi.mock("@/hooks/useIsMobile", () => ({ useIsMobile: () => false }));

vi.mock("@/lib/i18nServer", async () => {
  const { translations } = await import("@/lib/i18nDictionary");
  return { getT: async () => translations.ja, getRequestLanguage: async () => "ja" };
});

vi.mock("@/lib/apiServer", () => ({
  serverFetchPage: vi.fn(),
  serverFetchList: vi.fn(),
  serverIsSignedIn: vi.fn(),
}));

const books: Book[] = [
  { id: "book-1", name: "マタイによる福音書", translation: "口語訳", order: 1 },
  { id: "book-2", name: "マタイによる福音書", translation: "KJV", order: 1 },
];

const question = (overrides: Partial<QAQuestion> = {}): QAQuestion => ({
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
  ...overrides,
});

/** 解決済み / 未解決の 2 列ぶんを、問い合わせ先の answered で振り分けて返す。 */
async function mockServer({ signedIn = false, answered = [] as QAQuestion[], unanswered = [] as QAQuestion[] } = {}) {
  const apiServer = await import("@/lib/apiServer");
  vi.mocked(apiServer.serverIsSignedIn).mockResolvedValue(signedIn);
  vi.mocked(apiServer.serverFetchList).mockImplementation(async (path: string) =>
    path.startsWith("/books/") ? books : []
  );
  vi.mocked(apiServer.serverFetchPage).mockImplementation(async (path: string) => {
    const results = path.includes("answered=true") ? answered : unanswered;
    return { results, count: results.length, hasMore: false, counts: undefined };
  });
  return apiServer;
}

describe("Q&A 一覧", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSearch = "";
  });

  it("サーバーが取った質問を、開いた直後から並べる", async () => {
    await mockServer({ unanswered: [question()] });

    render(await QAPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("link", { name: /山上の説教について/ })).toHaveAttribute("href", "/qa/q1");
    expect(screen.getByText("1件")).toBeInTheDocument();
  });

  it("書だけを選んだときは、その書の全訳をまとめて絞る", async () => {
    const apiServer = await mockServer({ unanswered: [question()] });
    currentSearch = "book=matthew";

    render(await QAPage({ searchParams: Promise.resolve({ book: "matthew" }) }));

    const paths = vi.mocked(apiServer.serverFetchPage).mock.calls.map(([path]) => path);
    expect(paths).toHaveLength(2);
    for (const path of paths) expect(path).toContain("book_id=book-1%2Cbook-2");
  });

  it("取得失敗を空一覧と誤表示せず、再試行できる", async () => {
    const user = userEvent.setup();
    const apiServer = await mockServer();
    vi.mocked(apiServer.serverFetchPage).mockRejectedValue(new Error("Network Error"));

    render(await QAPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("alert")).toHaveTextContent("読み込めませんでした");
    expect(screen.queryByText("質問はまだありません。")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "もう一度試す" }));
    expect(refresh).toHaveBeenCalled();
  });

  it("1件も無いときは、質問する導線を出す", async () => {
    await mockServer();

    render(await QAPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("質問はまだありません。")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "質問する" })[0]).toHaveAttribute("href", "/qa?ask=1");
  });

  it("ask=1 で開くと投稿フォームが出て、未ログインならログインの案内になる", async () => {
    await mockServer({ signedIn: true, unanswered: [question()] });
    currentSearch = "ask=1";

    const { unmount } = render(await QAPage({ searchParams: Promise.resolve({ ask: "1" }) }));
    expect(screen.getByRole("button", { name: "質問を投稿する" })).toBeInTheDocument();
    unmount();

    await mockServer({ signedIn: false, unanswered: [question()] });
    render(await QAPage({ searchParams: Promise.resolve({ ask: "1" }) }));
    expect(screen.getByRole("dialog")).toHaveTextContent("ログイン");
  });
});
