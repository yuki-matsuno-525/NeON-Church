import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CitationPanel, buildMark } from "./CitationPanel";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchVerseBookmarks: vi.fn().mockResolvedValue([]),
    fetchCommentarySectionBookmarks: vi.fn().mockResolvedValue([]),
    fetchCommentaryWorks: vi.fn().mockResolvedValue([]),
    fetchCommentaryWork: vi.fn(),
    fetchCommentarySections: vi.fn(),
    fetchBooks: vi.fn().mockResolvedValue([]),
    fetchChapters: vi.fn().mockResolvedValue([]),
    fetchVerses: vi.fn().mockResolvedValue([]),
  };
});

describe("buildMark", () => {
  it("文中の参照は角括弧、引用ブロックは波括弧になる", () => {
    expect(buildMark({ kind: "inline", slug: "matthew", chapter: 6, verseStart: 16 })).toBe(
      "[[matthew 6:16]]",
    );
    expect(buildMark({ kind: "block", slug: "matthew", chapter: 6, verseStart: 16 })).toBe(
      "{{matthew 6:16}}",
    );
  });

  it("範囲は始まりと終わりをつなぐ", () => {
    expect(
      buildMark({ kind: "inline", slug: "matthew", chapter: 6, verseStart: 16, verseEnd: 18 }),
    ).toBe("[[matthew 6:16-18]]");
  });

  it("始まりと終わりが同じなら1節として書く", () => {
    expect(
      buildMark({ kind: "inline", slug: "matthew", chapter: 6, verseStart: 16, verseEnd: 16 }),
    ).toBe("[[matthew 6:16]]");
  });

  it("節を指定しなければ章まるごとの参照になる", () => {
    expect(buildMark({ kind: "inline", slug: "matthew", chapter: 6 })).toBe("[[matthew 6]]");
  });

  it("既定の訳のときは訳を書かない", () => {
    expect(
      buildMark({ kind: "block", slug: "matthew", chapter: 6, verseStart: 16, translation: "口語訳" }),
    ).toBe("{{matthew 6:16}}");
  });

  it("別の訳を選んだときだけ訳が印に残る", () => {
    expect(
      buildMark({
        kind: "block",
        slug: "matthew",
        chapter: 6,
        verseStart: 16,
        translation: "Nestle 1904 (GRC)",
      }),
    ).toBe("{{matthew 6:16|Nestle 1904 (GRC)}}");
  });
});

describe("CitationPanel", () => {
  it("さがすタブから書をえらべる", () => {
    render(<CitationPanel onInsert={vi.fn()} />);

    expect(screen.getByPlaceholderText("書をさがす")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "マタイによる福音書" })).toBeInTheDocument();
  });

  it("お気に入りが無いときは読む画面でお気に入りをつけるよう案内する", async () => {
    render(<CitationPanel onInsert={vi.fn()} />);

    screen.getByRole("tab", { name: "お気に入り" }).click();

    expect(
      await screen.findByText(/節のお気に入りがありません/),
    ).toBeInTheDocument();
  });
});


describe("解釈書から引く", () => {
  const work = {
    slug: "uchimura-romans", title: "羅馬書之研究", title_ja: "ロマ書の研究", author: "Uchimura", author_ja: "内村鑑三",
    year: 1924, tradition: "mukyokai" as const, language: "ja", translator: "", source_name: "S", source_url: "https://example.org/",
    license: "public-domain", license_note: "", readable: true, section_count: 2, chapter_count: 1,
  };

  it("解釈書 → 章 → 区切りとたどり、@ で始まる印を入れる", async () => {
    const api = await import("@/lib/api");
    vi.mocked(api.fetchCommentaryWorks).mockResolvedValue([work]);
    vi.mocked(api.fetchCommentaryWork).mockResolvedValue({
      ...work, chapters: [{ number: 41, title: "第41講", section_count: 2 }],
    });
    vi.mocked(api.fetchCommentarySections).mockResolvedValue({
      results: [
        { id: "s1", chapter_number: 41, number: 1, heading: "", text: "一段落目", source_url: "", links: [] },
        { id: "s2", chapter_number: 41, number: 2, heading: "", text: "二段落目", source_url: "", links: [] },
      ],
      count: 2, hasMore: false, counts: undefined,
    });
    const onInsert = vi.fn();
    render(<CitationPanel onInsert={onInsert} />);

    fireEvent.click(screen.getByRole("tab", { name: "解釈書" }));
    fireEvent.click(await screen.findByRole("button", { name: /ロマ書の研究/ }));

    // 章まるごとの参照
    fireEvent.click(await screen.findByRole("button", { name: "第41講 文中に入れる" }));
    expect(onInsert).toHaveBeenLastCalledWith("[[@uchimura-romans 41]]");

    fireEvent.click(screen.getByRole("button", { name: "第41講" }));
    await screen.findByText("二段落目");
    fireEvent.click(screen.getAllByRole("button", { name: "引用して入れる" })[1]);
    expect(onInsert).toHaveBeenLastCalledWith("{{@uchimura-romans 41:2}}");
  });
});
