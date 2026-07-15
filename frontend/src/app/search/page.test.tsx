import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import SearchPage from "./page";
import type { SearchResult } from "@/lib/api";

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    searchBible: vi.fn(),
  };
});

const makeSearchResult = (overrides: Partial<SearchResult> = {}): SearchResult => ({
  verses: [],
  books: [],
  comments: [],
  verse_total: 0,
  has_more: false,
  ...overrides,
});

describe("SearchPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("1文字の日本語でも検索を実行する（CJKは1文字可・件数判定は backend）", async () => {
    const { searchBible } = await import("@/lib/api");
    vi.mocked(searchBible).mockResolvedValue(makeSearchResult());
    mockSearchParams = new URLSearchParams({ q: "神" });
    render(<SearchPage />);
    await waitFor(() => expect(vi.mocked(searchBible)).toHaveBeenCalledWith("神", 1, "all", ""));
  });

  it("UI 言語を検索に渡さない（言語を切り替えても結果が変わらない）", async () => {
    const { searchBible } = await import("@/lib/api");
    vi.mocked(searchBible).mockResolvedValue(makeSearchResult());
    mockSearchParams = new URLSearchParams({ q: "神" });
    render(<SearchPage />);
    await waitFor(() => expect(vi.mocked(searchBible)).toHaveBeenCalled());
    // 引数は q/page/kind/book だけ。lang が混じっていると英語 UI で「神」が 0 件になる。
    expect(vi.mocked(searchBible).mock.calls[0]).toEqual(["神", 1, "all", ""]);
  });

  it("q が空のとき検索を実行しない", async () => {
    const { searchBible } = await import("@/lib/api");
    mockSearchParams = new URLSearchParams();
    render(<SearchPage />);
    await act(async () => {});
    expect(vi.mocked(searchBible)).not.toHaveBeenCalled();
  });

  it("searchBible 成功: 節結果が表示される", async () => {
    const { searchBible } = await import("@/lib/api");
    vi.mocked(searchBible).mockResolvedValue(
      makeSearchResult({
        verses: [
          {
            id: "v1",
            number: 1,
            text: "アブラハムの子であるダビデの子、イエス・キリストの系図。",
            chapter_number: 1,
            chapter_id: "ch1",
            book_name: "マタイによる福音書",
            book_id: "b1",
            book_slug: "matthew",
            translation: "口語訳",
          },
        ],
      })
    );
    mockSearchParams = new URLSearchParams({ q: "アブラハム" });
    render(<SearchPage />);
    // 書名ラベルが表示されることを確認（ハイライト対象外のため分割されない）
    await screen.findByText(/マタイによる福音書/);
    // ハイライトされたキーワードは mark 要素に入るため getAllByText を使用
    expect(screen.getAllByText(/アブラハム/).length).toBeGreaterThan(0);
  });

  it("節結果に、当たった本文の訳が表示される", async () => {
    const { searchBible } = await import("@/lib/api");
    vi.mocked(searchBible).mockResolvedValue(
      makeSearchResult({
        verses: [
          {
            id: "v1",
            number: 1,
            text: "The book of the generation of Jesus Christ.",
            chapter_number: 1,
            chapter_id: "ch1",
            book_name: "Matthew",
            book_id: "b1",
            book_slug: "matthew",
            translation: "KJV",
          },
        ],
      })
    );
    mockSearchParams = new URLSearchParams({ q: "Jesus" });
    render(<SearchPage />);
    await screen.findByText(/KJV（英語）/);
  });

  it("searchBible 成功: 書名結果が表示される", async () => {
    const { searchBible } = await import("@/lib/api");
    vi.mocked(searchBible).mockResolvedValue(
      makeSearchResult({
        books: [{ id: "b1", name: "マタイによる福音書", translation: "口語訳", order: 1 }],
      })
    );
    mockSearchParams = new URLSearchParams({ q: "マタイ" });
    render(<SearchPage />);
    await screen.findByText("マタイによる福音書");
  });

  it("searchBible 成功: コメント結果が表示される", async () => {
    const { searchBible } = await import("@/lib/api");
    vi.mocked(searchBible).mockResolvedValue(
      makeSearchResult({
        comments: [
          {
            id: "c1",
            // ハイライト分割を避けるため検索キーワードを含まない本文
            body: "これは大切なコメントです。",
            username: "alice",
            created_at: "2024-01-01T00:00:00Z",
            location: "マタイ 1章 1節",
          },
        ],
      })
    );
    mockSearchParams = new URLSearchParams({ q: "大切" });
    render(<SearchPage />);
    // ハイライト処理で本文が span/mark に分割されるため、ユーザー名で検索
    await screen.findByText("alice");
    // p要素全体のテキストコンテンツに本文が含まれることを確認
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("結果が50件を超えるとページネーションが出て、番号を押すと page 付きで遷移する", async () => {
    const { searchBible } = await import("@/lib/api");
    const verse = (id: string, ch: number) => ({
      id, number: 1, text: `結果${id}`, chapter_number: ch, chapter_id: `c${id}`,
      book_name: "マタイによる福音書", book_id: "b1", book_slug: "matthew", translation: "口語訳",
    });
    // verse_total=120 → 50件ずつで3ページ。
    vi.mocked(searchBible).mockResolvedValue(
      makeSearchResult({ verses: [verse("A", 1)], verse_total: 120, has_more: true })
    );
    mockSearchParams = new URLSearchParams({ q: "テスト" });
    render(<SearchPage />);

    await screen.findByText("結果A");
    // 2ページ目のボタンを押すと URL に page=2 が付く。
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(mockPush).toHaveBeenCalledWith("/search?q=%E3%83%86%E3%82%B9%E3%83%88&page=2");
  });

  it("URL の種別・書フィルタを searchBible に渡す", async () => {
    const { searchBible } = await import("@/lib/api");
    vi.mocked(searchBible).mockResolvedValue(makeSearchResult());
    mockSearchParams = new URLSearchParams({ q: "イエス", kind: "comments", book: "mark" });
    render(<SearchPage />);
    await waitFor(() => expect(vi.mocked(searchBible)).toHaveBeenCalledWith("イエス", 1, "comments", "mark"));
  });

  it("種別フィルタを押すと URL が更新される", async () => {
    const { searchBible } = await import("@/lib/api");
    vi.mocked(searchBible).mockResolvedValue(makeSearchResult());
    mockSearchParams = new URLSearchParams({ q: "イエス" });
    render(<SearchPage />);

    await screen.findByText(/「イエス」の検索結果/);
    fireEvent.click(screen.getByRole("button", { name: "節" }));

    expect(mockPush).toHaveBeenCalledWith("/search?q=%E3%82%A4%E3%82%A8%E3%82%B9&kind=verses");
  });

  it("書フィルタを選ぶと URL が更新される", async () => {
    const { searchBible } = await import("@/lib/api");
    vi.mocked(searchBible).mockResolvedValue(makeSearchResult());
    mockSearchParams = new URLSearchParams({ q: "イエス" });
    render(<SearchPage />);

    const select = await screen.findByRole("combobox", { name: "すべての書" });
    fireEvent.change(select, { target: { value: "mark" } });

    expect(mockPush).toHaveBeenCalledWith("/search?q=%E3%82%A4%E3%82%A8%E3%82%B9&book=mark");
  });

  it("0件のとき「一致する結果が見つかりませんでした。」が表示される", async () => {
    const { searchBible } = await import("@/lib/api");
    vi.mocked(searchBible).mockResolvedValue(makeSearchResult());
    mockSearchParams = new URLSearchParams({ q: "xxxxxxxxxx" });
    render(<SearchPage />);
    await screen.findByText(/一致する結果が見つかりませんでした。/);
  });

  it("searchBible 失敗時もクラッシュしない", async () => {
    const { searchBible } = await import("@/lib/api");
    vi.mocked(searchBible).mockRejectedValue(new Error("Network Error"));
    mockSearchParams = new URLSearchParams({ q: "エラー検索" });
    render(<SearchPage />);
    // エラー時は空結果として処理されるため「一致する結果が見つかりませんでした。」が表示される
    await screen.findByText(/一致する結果が見つかりませんでした。/);
  });

  it("検索フォーム送信で router.push が呼ばれる", async () => {
    const { searchBible } = await import("@/lib/api");
    vi.mocked(searchBible).mockResolvedValue(makeSearchResult());
    mockSearchParams = new URLSearchParams();
    render(<SearchPage />);

    // Suspense が解決するまで待機
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "検索" })).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("キーワードを入力...");
    fireEvent.change(input, { target: { value: "恵み" } });
    fireEvent.click(screen.getByRole("button", { name: "検索" }));

    expect(mockPush).toHaveBeenCalledWith("/search?q=%E6%81%B5%E3%81%BF");
  });
});
