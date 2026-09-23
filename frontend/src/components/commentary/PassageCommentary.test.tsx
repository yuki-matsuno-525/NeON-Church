import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { CommentPanel } from "@/components/reader/CommentPanel";
import type { CommentaryEntry, CommentaryKind, ListPage, Verse } from "@/lib/api";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/hooks/useComments", () => ({
  useComments: () => ({ comments: [], setComments: vi.fn(), loading: false, reload: vi.fn() }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchArticlesCitingVerse: vi.fn().mockResolvedValue({ count: 0, next: null, previous: null, results: [] }),
    fetchQuestionPage: vi.fn().mockResolvedValue({ results: [], count: 0, hasMore: false }),
    fetchTags: vi.fn().mockResolvedValue([]),
    fetchPassageCommentary: vi.fn(),
  };
});

const verse: Verse = { id: "v1", chapter: "c1", number: 28, text: "神を愛する者たちには、万事が益となる" };

function entry(overrides: Partial<CommentaryEntry> & { id: string }): CommentaryEntry {
  return {
    order: 0,
    heading: "Romans 8:28",
    excerpt: "And we know, etc.",
    truncated: true,
    method: "structure",
    confidence: null,
    work: {
      slug: "calvin-commentaries", title: "Calvin's Commentaries", title_ja: "カルヴァン聖書注解",
      author: "John Calvin", author_ja: "ジャン・カルヴァン", year: 1555, tradition: "reformation", language: "en",
    },
    ...overrides,
  };
}

const page = (results: CommentaryEntry[]): ListPage<CommentaryEntry> => ({
  results, count: results.length, hasMore: false, counts: undefined,
});

async function mockCommentary(byKind: Record<CommentaryKind, CommentaryEntry[]>) {
  const { fetchPassageCommentary } = await import("@/lib/api");
  vi.mocked(fetchPassageCommentary).mockImplementation(async ({ kind }) => page(byKind[kind]));
}

function renderPanel() {
  render(<CommentPanel verse={verse} chapterNumber={8} bookSlug="romans" onClose={vi.fn()} />);
}

describe("節のパネルの「解釈」タブ", () => {
  beforeEach(() => vi.clearAllMocks());

  it("解釈が無ければタブを出さない", async () => {
    await mockCommentary({ discuss: [], broad: [], mention: [] });
    renderPanel();
    const { fetchPassageCommentary } = await import("@/lib/api");
    await vi.waitFor(() => expect(fetchPassageCommentary).toHaveBeenCalledTimes(3));
    expect(screen.queryByRole("tab", { name: /解釈/ })).not.toBeInTheDocument();
  });

  it("論じるもの・章や書全体・触れているだけ、を分けて出す", async () => {
    await mockCommentary({
      discuss: [entry({ id: "s1" })],
      broad: [entry({
        id: "s2", order: 0, heading: "第１講　ロマ書の大意", method: "structure",
        work: { slug: "uchimura-romans", title: "羅馬書之研究", title_ja: "ロマ書の研究", author: "Uchimura Kanzō",
          author_ja: "内村鑑三", year: 1924, tradition: "mukyokai", language: "ja" },
      })],
      mention: [entry({ id: "s3", order: 5, heading: "Genesis 31:14", method: "citation" })],
    });
    renderPanel();

    const tab = await screen.findByRole("tab", { name: "解釈 (3)" });
    fireEvent.click(tab);
    const panel = screen.getByRole("tabpanel");

    // 論じているもの：誰が・いつ・どの立場か、と抜粋。全文へのリンク。
    const cards = within(panel).getAllByTestId("commentary-entry");
    expect(cards[0]).toHaveTextContent("ジャン・カルヴァン");
    expect(cards[0]).toHaveTextContent("宗教改革");
    expect(cards[0]).toHaveTextContent("1555年ごろ");
    expect(cards[0]).toHaveTextContent("英語");
    expect(within(cards[0]).getByRole("link", { name: /全文を読む/ })).toHaveAttribute(
      "href", "/commentary/calvin-commentaries?around=0#s-0",
    );

    // 章・書全体は別枠
    const broad = within(panel).getByRole("region", { name: "章・書全体についての解釈" });
    expect(within(broad).getByRole("link")).toHaveTextContent(/内村鑑三『ロマ書の研究』 第１講\s*ロマ書の大意/);

    // 触れているだけのものは畳んである
    const summary = within(panel).getByText("この節に触れている箇所 (1)");
    const details = summary.closest("details")!;
    expect(details.open).toBe(false);
    expect(within(details).getByText(/Genesis 31:14/)).toBeInTheDocument();
  });

  it("AI判定は印と確からしさを必ず出す", async () => {
    await mockCommentary({
      discuss: [],
      broad: [],
      mention: [entry({ id: "ai", method: "ai", confidence: 0.92 })],
    });
    renderPanel();
    fireEvent.click(await screen.findByRole("tab", { name: "解釈 (1)" }));

    expect(screen.getByText("この節を直接論じた解釈はありません。")).toBeInTheDocument();
    const card = screen.getByTestId("commentary-entry");
    expect(card).toHaveTextContent("AI判定");
    expect(card).toHaveTextContent("AIが推定した結び付きです（確からしさ 92%）");
  });

  it("節ごとの箇所で取りに行く", async () => {
    await mockCommentary({ discuss: [], broad: [], mention: [] });
    renderPanel();
    const { fetchPassageCommentary } = await import("@/lib/api");
    await vi.waitFor(() => expect(fetchPassageCommentary).toHaveBeenCalledTimes(3));
    expect(vi.mocked(fetchPassageCommentary).mock.calls.map(([p]) => [p.book, p.chapter, p.verse, p.kind]).sort()).toEqual([
      ["romans", 8, 28, "broad"],
      ["romans", 8, 28, "discuss"],
      ["romans", 8, 28, "mention"],
    ]);
  });
});
