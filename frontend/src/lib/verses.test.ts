import { describe, it, expect } from "vitest";
import { arrangeVerses, isMarkShorterEnding } from "@/lib/verses";
import type { Verse } from "@/lib/api";

const GREEK = "Nestle 1904 (GRC)";

// 番号だけ与えてダミーの Verse を作る（表示順の検証には id/number があれば十分）。
function mkVerses(nums: number[]): Verse[] {
  return nums.map((n) => ({ id: `v${n}`, number: n, text: `t${n}` }) as Verse);
}

describe("isMarkShorterEnding", () => {
  it("ギリシャ語マルコの節99だけ true", () => {
    expect(isMarkShorterEnding("mark", GREEK, 99)).toBe(true);
    expect(isMarkShorterEnding("mark", GREEK, 8)).toBe(false);
    expect(isMarkShorterEnding("mark", "KJV", 99)).toBe(false);
    expect(isMarkShorterEnding("matthew", GREEK, 99)).toBe(false);
  });
});

describe("arrangeVerses", () => {
  it("マルコ16(ギリシャ語)は99を8節の直後へ移動する", () => {
    const input = mkVerses([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 99]);
    const out = arrangeVerses("mark", 16, GREEK, input).map((v) => v.number);
    expect(out).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 99, 9, 10, 20]);
  });

  it("対象外（別の章・訳・書）はそのまま返す", () => {
    const input = mkVerses([1, 2, 3]);
    expect(arrangeVerses("mark", 15, GREEK, input)).toBe(input);
    expect(arrangeVerses("mark", 16, "KJV", input)).toBe(input);
    expect(arrangeVerses("john", 16, GREEK, input)).toBe(input);
  });

  it("99が無ければそのまま返す", () => {
    const input = mkVerses([1, 2, 8, 9]);
    expect(arrangeVerses("mark", 16, GREEK, input)).toBe(input);
  });

  it("8節が無くても99を落とさず末尾に残す", () => {
    const input = mkVerses([1, 2, 9, 99]);
    const out = arrangeVerses("mark", 16, GREEK, input).map((v) => v.number);
    expect(out).toEqual([1, 2, 9, 99]);
  });
});
