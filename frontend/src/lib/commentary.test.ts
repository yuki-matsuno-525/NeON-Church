import { describe, expect, it } from "vitest";
import { commentaryLinkHref, commentaryLinkLabel, commentaryPlaceHref, commentarySectionHref } from "./commentary";
import type { CommentaryLink } from "./types";

const link = (overrides: Partial<CommentaryLink>): CommentaryLink => ({
  book: "romans", chapter: 8, verse: 28, chapter_end: 8, verse_end: 28, method: "structure", confidence: null,
  ...overrides,
});

describe("解釈書の箇所の書き方", () => {
  it("節・節の範囲・章をまたぐ範囲", () => {
    expect(commentaryLinkLabel(link({}), "ja")).toBe("ローマ 8:28");
    expect(commentaryLinkLabel(link({ verse_end: 30 }), "ja")).toBe("ローマ 8:28–30");
    expect(commentaryLinkLabel(link({ chapter: 7, verse: 20, chapter_end: 8, verse_end: 2 }), "ja")).toBe("ローマ 7:20–8:2");
  });

  it("章・章の範囲・書全体", () => {
    expect(commentaryLinkLabel(link({ verse: null, verse_end: null }), "ja")).toBe("ローマ 8章");
    expect(commentaryLinkLabel(link({ chapter: 9, verse: null, chapter_end: 10, verse_end: null }), "ja")).toBe("ローマ 9–10章");
    expect(commentaryLinkLabel(link({ chapter: null, verse: null, chapter_end: null, verse_end: null }), "ja")).toBe("ローマ");
  });

  it("英語の画面では英語の書名", () => {
    expect(commentaryLinkLabel(link({}), "en")).toBe("Romans 8:28");
    expect(commentaryLinkLabel(link({ verse: null, verse_end: null }), "en")).toBe("Romans 8");
  });

  it("読書画面と解釈書ページへのリンク", () => {
    expect(commentaryLinkHref(link({}))).toBe("/romans/8#verse-28");
    expect(commentaryLinkHref(link({ verse: null }))).toBe("/romans/8");
    expect(commentarySectionHref("calvin-romans", 8, 12)).toBe("/commentary/calvin-romans/8?s=12#s-12");
    // 章（講）そのものなら章のページ
    expect(commentarySectionHref("uchimura-romans", 41, null)).toBe("/commentary/uchimura-romans/41");
    expect(commentaryPlaceHref({ work: "uchimura-romans" })).toBe("/commentary/uchimura-romans");
  });
});
