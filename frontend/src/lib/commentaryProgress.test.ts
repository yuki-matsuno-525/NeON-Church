import { beforeEach, describe, expect, it } from "vitest";
import { getCommentaryProgress, getLastCommentary, saveCommentaryProgress } from "./commentaryProgress";

const resume = {
  work: "uchimura-romans",
  chapter: 41,
  number: 3,
  title: { ja: "ロマ書の研究", en: "Studies in Romans" },
  chapterTitle: { ja: "第41講", en: "Lecture 41" },
};

describe("解釈書をどこまで読んだかの控え", () => {
  beforeEach(() => localStorage.clear());

  it("本ごとの章と、最後に読んだ場所を残す", () => {
    saveCommentaryProgress(resume);
    saveCommentaryProgress({ ...resume, work: "calvin-romans", chapter: 8, number: null });
    expect(getCommentaryProgress("uchimura-romans")).toEqual({ chapter: 41, number: 3 });
    expect(getCommentaryProgress("calvin-romans")).toEqual({ chapter: 8, number: null });
    expect(getLastCommentary()).toMatchObject({ work: "calvin-romans", chapter: 8 });
  });

  it("無い・壊れているときは null", () => {
    expect(getLastCommentary()).toBeNull();
    localStorage.setItem("neon_commentary_last", "{broken");
    expect(getLastCommentary()).toBeNull();
    expect(getCommentaryProgress("nope")).toBeNull();
  });
});
