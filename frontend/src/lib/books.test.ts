import { describe, it, expect } from "vitest";
import { getBookBySlug, isValidSlug } from "./books";

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

describe("isValidSlug", () => {
  it.each(["matthew", "mark", "luke", "john"])("%s はtrue", (slug) => {
    expect(isValidSlug(slug)).toBe(true);
  });

  it.each(["genesis", "", "MATTHEW", "マタイ"])("%s はfalse", (slug) => {
    expect(isValidSlug(slug)).toBe(false);
  });
});
