import { describe, it, expect } from "vitest";
import { getBookBySlug, isValidSlug, chapterTitle, firstChapterOf } from "./books";

describe("getBookBySlug", () => {
  it("有効なスラッグでbookオブジェクトを返す", () => {
    const book = getBookBySlug("matthew");
    expect(book).not.toBeNull();
    expect(book?.name).toBe("マタイによる福音書");
    expect(book?.short).toBe("マタイ");
  });

  it("4冊すべてが取得できる", () => {
    expect(getBookBySlug("mark")?.name).toBe("マルコによる福音書");
    expect(getBookBySlug("luke")?.name).toBe("ルカによる福音書");
    expect(getBookBySlug("john")?.name).toBe("ヨハネによる福音書");
  });

  it("無効なスラッグでnullを返す", () => {
    expect(getBookBySlug("not-a-real-book")).toBeNull();
    expect(getBookBySlug("")).toBeNull();
    expect(getBookBySlug("MATTHEW")).toBeNull();
  });
});

describe("chapterTitle", () => {
  it("マリアの福音書はセクション見出しを章名として返す", () => {
    expect(getBookBySlug("mary")?.name).toBe("マリアの福音書");
    expect(chapterTitle("mary", 1)).toBe("An Eternal Perspective");
    expect(chapterTitle("mary", 5)).toBe("Conflict over Authority");
  });

  it("章名を持たない本・範囲外は null", () => {
    expect(chapterTitle("matthew", 1)).toBeNull();
    expect(chapterTitle("mary", 6)).toBeNull();
    expect(chapterTitle("mary", 0)).toBeNull();
  });

  it("トマスの福音書は Prologue が第0章、語番号と章番号が一致する", () => {
    expect(chapterTitle("thomas", 0)).toBe("Prologue");
    expect(chapterTitle("thomas", 1)).toBe("True Meaning");
    expect(chapterTitle("thomas", 114)).toBe("Peter and Mary");
    expect(chapterTitle("thomas", 115)).toBeNull();
    expect(chapterTitle("thomas", -1)).toBeNull();
  });
});

describe("firstChapterOf", () => {
  it("既定は 1、トマスの福音書だけ 0", () => {
    expect(firstChapterOf("mary")).toBe(1);
    expect(firstChapterOf("matthew")).toBe(1);
    expect(firstChapterOf("thomas")).toBe(0);
  });
});

describe("isValidSlug", () => {
  it.each(["matthew", "mark", "luke", "john"])("%s はtrue", (slug) => {
    expect(isValidSlug(slug)).toBe(true);
  });

  it.each(["not-a-real-book", "", "MATTHEW", "マタイ"])("%s はfalse", (slug) => {
    expect(isValidSlug(slug)).toBe(false);
  });
});
