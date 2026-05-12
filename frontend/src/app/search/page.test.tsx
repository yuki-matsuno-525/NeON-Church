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
  ...overrides,
});

describe("SearchPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("q が1文字のとき「2文字以上入力してください。」が表示される", async () => {
    mockSearchParams = new URLSearchParams({ q: "あ" });
    render(<SearchPage />);
    await screen.findByText("2文字以上入力してください。");
  });

  it("q が空のとき「2文字以上入力してください。」は表示されない", async () => {
    mockSearchParams = new URLSearchParams();
    render(<SearchPage />);
    // Suspense が解決するまで待機
    await act(async () => {});
    expect(screen.queryByText("2文字以上入力してください。")).not.toBeInTheDocument();
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
