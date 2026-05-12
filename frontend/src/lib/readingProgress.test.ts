import { describe, it, expect, beforeEach } from "vitest";
import { saveLocalProgress, getLocalProgress, getLastBookSlug } from "./readingProgress";
import type { LocalProgress } from "./readingProgress";

const makeProgress = (overrides: Partial<LocalProgress> = {}): LocalProgress => ({
  bookId: "book-1",
  chapterId: "ch-1",
  chapterNumber: 1,
  updatedAt: "2024-01-01T00:00:00Z",
  ...overrides,
});

describe("readingProgress", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("saveLocalProgress", () => {
    it("進捗を localStorage に保存する", () => {
      const p = makeProgress();
      saveLocalProgress("matthew", p);
      expect(localStorage.getItem("neon_progress_matthew")).toBeTruthy();
    });

    it("最後に読んだ書のスラッグを保存する", () => {
      saveLocalProgress("mark", makeProgress());
      expect(localStorage.getItem("neon_last_book")).toBe("mark");
    });

    it("同じスラッグを2回保存すると上書きされる", () => {
      saveLocalProgress("matthew", makeProgress({ chapterNumber: 1 }));
      saveLocalProgress("matthew", makeProgress({ chapterNumber: 5 }));
      const result = getLocalProgress("matthew");
      expect(result?.chapterNumber).toBe(5);
    });
  });

  describe("getLocalProgress", () => {
    it("保存された進捗を返す", () => {
      const p = makeProgress({ chapterNumber: 3 });
      saveLocalProgress("luke", p);
      const result = getLocalProgress("luke");
      expect(result).toEqual(p);
    });

    it("存在しないスラッグで null を返す", () => {
      expect(getLocalProgress("nonexistent")).toBeNull();
    });

    it("LocalProgress の全フィールドが正しく復元される", () => {
      const p: LocalProgress = {
        bookId: "book-abc",
        chapterId: "ch-xyz",
        chapterNumber: 7,
        updatedAt: "2025-05-13T12:00:00Z",
      };
      saveLocalProgress("john", p);
      expect(getLocalProgress("john")).toEqual(p);
    });
  });

  describe("getLastBookSlug", () => {
    it("最後に保存したスラッグを返す", () => {
      saveLocalProgress("matthew", makeProgress());
      saveLocalProgress("mark", makeProgress());
      expect(getLastBookSlug()).toBe("mark");
    });

    it("何も保存されていないとき null を返す", () => {
      expect(getLastBookSlug()).toBeNull();
    });
  });
});
