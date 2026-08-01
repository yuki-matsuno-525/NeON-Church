import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CitationPanel, buildMark } from "./CitationPanel";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchBookmarks: vi.fn().mockResolvedValue([]),
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

  it("栞が無いときは読む画面で栞をつけるよう案内する", async () => {
    render(<CitationPanel onInsert={vi.fn()} />);

    screen.getByRole("tab", { name: "栞" }).click();

    expect(
      await screen.findByText(/節の栞がありません/),
    ).toBeInTheDocument();
  });
});
