import { describe, it, expect } from "vitest";
import { getBookBySlug, isValidSlug, chapterTitle } from "./books";

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
    expect(getBookBySlug("genesis")).toBeNull();
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
});

describe("isValidSlug", () => {
  it.each(["matthew", "mark", "luke", "john"])("%s はtrue", (slug) => {
    expect(isValidSlug(slug)).toBe(true);
  });

  it.each(["genesis", "", "MATTHEW", "マタイ"])("%s はfalse", (slug) => {
    expect(isValidSlug(slug)).toBe(false);
  });
});
