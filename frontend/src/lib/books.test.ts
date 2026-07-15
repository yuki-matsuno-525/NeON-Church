import { describe, it, expect } from "vitest";
import { getBookBySlug, isValidSlug, chapterTitle, firstChapterOf, chapterNumbersOf, adjacentChapter } from "./books";

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

  it("章が飛び飛びの本は最初の章番号", () => {
    expect(firstChapterOf("quelle")).toBe(3);
  });
});

describe("chapterNumbersOf", () => {
  it("連番の本は 1..totalChapters", () => {
    expect(chapterNumbersOf("mary")).toEqual([1, 2, 3, 4, 5]);
  });

  it("トマスの福音書は 0..114（Prologue を含む115章）", () => {
    const nums = chapterNumbersOf("thomas");
    expect(nums[0]).toBe(0);
    expect(nums[nums.length - 1]).toBe(114);
    expect(nums).toHaveLength(115);
  });

  it("Q資料はルカ由来の飛び飛びの章番号", () => {
    expect(chapterNumbersOf("quelle")).toEqual([3, 4, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 22]);
  });

  it("知らない slug は空", () => {
    expect(chapterNumbersOf("nope")).toEqual([]);
  });
});

describe("adjacentChapter", () => {
  it("連番の本は前後の章", () => {
    expect(adjacentChapter("mary", 3)).toEqual({ prev: 2, next: 4 });
    expect(adjacentChapter("mary", 1)).toEqual({ prev: null, next: 2 });
    expect(adjacentChapter("mary", 5)).toEqual({ prev: 4, next: null });
  });

  it("トマスの福音書は第1章から第0章へ戻れる", () => {
    expect(adjacentChapter("thomas", 1)).toEqual({ prev: 0, next: 2 });
    expect(adjacentChapter("thomas", 0)).toEqual({ prev: null, next: 1 });
    expect(adjacentChapter("thomas", 114).next).toBeNull();
  });

  it("Q資料は存在する章だけを飛ばして送る", () => {
    // 4 の次は 5 ではなく 6
    expect(adjacentChapter("quelle", 4)).toEqual({ prev: 3, next: 6 });
    expect(adjacentChapter("quelle", 3)).toEqual({ prev: null, next: 4 });
    expect(adjacentChapter("quelle", 22)).toEqual({ prev: 19, next: null });
  });

  it("存在しない章は前後とも null", () => {
    expect(adjacentChapter("quelle", 5)).toEqual({ prev: null, next: null });
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
