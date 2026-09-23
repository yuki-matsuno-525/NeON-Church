import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { CommentaryChapterReader } from "./CommentaryChapterReader";
import type { CommentaryChapterDetail, CommentarySection, ListPage } from "@/lib/api";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  const empty = { results: [], count: 0, hasMore: false, counts: undefined };
  return {
    ...actual,
    fetchCommentPage: vi.fn().mockResolvedValue(empty),
    fetchQuestionPage: vi.fn().mockResolvedValue(empty),
    fetchTags: vi.fn().mockResolvedValue([]),
    fetchArticlesCitingVerse: vi.fn(),
    fetchPassageCommentary: vi.fn().mockResolvedValue(empty),
    fetchCommentarySections: vi.fn(),
    createComment: vi.fn(),
  };
});

const chapter: CommentaryChapterDetail = {
  number: 41,
  title: "第41講　救いの完成（八）",
  work: {
    slug: "uchimura-romans", title: "羅馬書之研究", title_ja: "ロマ書の研究", author: "Uchimura", author_ja: "内村鑑三",
    year: 1924, tradition: "mukyokai", language: "ja", translator: "", source_name: "S", source_url: "https://example.org/",
    license: "public-domain", license_note: "", readable: true, section_count: 3, chapter_count: 60,
  },
  links: [{ book: "romans", chapter: 8, verse: 28, chapter_end: 8, verse_end: 30, method: "structure", confidence: null }],
  prev_number: 40,
  next_number: 42,
  section_count: 3,
};

const section = (number: number, text: string): CommentarySection => ({
  id: `s${number}`, chapter_number: 41, number, heading: "", text, source_url: "",
  links: number === 1 ? [{ book: "romans", chapter: 8, verse: 28, chapter_end: 8, verse_end: 28, method: "citation", confidence: null }] : [],
});

const page = (results: CommentarySection[], hasMore = false): ListPage<CommentarySection> => ({
  results, count: 3, hasMore, counts: undefined,
});

describe("解釈書の章のページ", () => {
  beforeEach(() => vi.clearAllMocks());

  it("聖書の章のページと同じく、区切りを並べ、章の論じる箇所・前後の章・章へのコメントを出す", async () => {
    render(<CommentaryChapterReader chapter={chapter} initial={page([section(1, "萬物とクリスチャンと"), section(2, "第二段落")])} initialPage={1} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/第41講\s救いの完成（八）/);
    expect(screen.getByRole("link", { name: "ローマ 8:28–30" })).toHaveAttribute("href", "/romans/8#verse-28");
    expect(screen.getAllByTestId("commentary-section")).toHaveLength(2);
    // 区切りが引く聖書の箇所へのリンク
    expect(screen.getByRole("link", { name: "ローマ 8:28" })).toHaveAttribute("href", "/romans/8#verse-28");
    expect(screen.getByRole("link", { name: /前の章/ })).toHaveAttribute("href", "/commentary/uchimura-romans/40");
    expect(screen.getByRole("link", { name: /次の章/ })).toHaveAttribute("href", "/commentary/uchimura-romans/42");

    // 章へのコメントは解釈書の章の場所で取る
    const { fetchCommentPage } = await import("@/lib/api");
    await waitFor(() =>
      expect(fetchCommentPage).toHaveBeenCalledWith(expect.objectContaining({
        commentary: { work: "uchimura-romans", chapter: 41, number: undefined },
      })),
    );
  });

  it("区切りを押すとパネルが開き、コメント・Q&Aはその区切りの場所で取る（引用した記事・解釈のタブは無い）", async () => {
    render(<CommentaryChapterReader chapter={chapter} initial={page([section(1, "萬物と"), section(2, "第二段落")])} initialPage={1} />);
    fireEvent.click(screen.getAllByTestId("commentary-section")[1]);

    const panel = await screen.findByRole("complementary");
    expect(within(panel).getByRole("heading", { level: 2 })).toHaveTextContent(/第41講\s救いの完成（八） › 2/);

    const { fetchCommentPage, fetchQuestionPage, fetchArticlesCitingVerse } = await import("@/lib/api");
    await waitFor(() =>
      expect(fetchCommentPage).toHaveBeenCalledWith(expect.objectContaining({
        verse_id: undefined,
        commentary: { work: "uchimura-romans", chapter: 41, number: 2 },
      })),
    );
    expect(fetchQuestionPage).toHaveBeenCalledWith({ work_slug: "uchimura-romans", chapter_number: 41, verse_number: 2 });
    expect(fetchArticlesCitingVerse).not.toHaveBeenCalled();
    expect(within(panel).queryByRole("tab", { name: /引用した記事|解釈/ })).not.toBeInTheDocument();
  });

  it("途中のページから開いたら、前の区切りも後ろの区切りも読み足せる", async () => {
    const { fetchCommentarySections } = await import("@/lib/api");
    vi.mocked(fetchCommentarySections).mockImplementation(async (_w, _c, p) =>
      p === 1 ? page([section(1, "一")]) : page([section(3, "三")]),
    );
    render(<CommentaryChapterReader chapter={chapter} initial={page([section(2, "二")], true)} initialPage={2} />);

    fireEvent.click(screen.getByRole("button", { name: "↑ 前の区切りを読む" }));
    await screen.findByText("一");
    expect(fetchCommentarySections).toHaveBeenCalledWith("uchimura-romans", 41, 1, 50);
    expect(screen.queryByRole("button", { name: "↑ 前の区切りを読む" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /もっと見る/ }));
    await screen.findByText("三");
    expect(screen.getAllByTestId("commentary-section").map((el) => el.textContent)).toEqual(["1一", "2二", "3三"]);
  });
});
