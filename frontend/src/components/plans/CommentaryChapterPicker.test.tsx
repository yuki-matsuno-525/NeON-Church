import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CommentaryChapterPicker } from "./CommentaryChapterPicker";
import { readingHref, readingLabel } from "./ReadingChips";
import { translations } from "@/lib/i18nDictionary";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

const work = vi.hoisted(() => ({
  slug: "uchimura-romans", title: "羅馬書之研究", title_ja: "ロマ書の研究", author: "Uchimura", author_ja: "内村鑑三",
  year: 1924, tradition: "mukyokai" as const, language: "ja", translator: "", source_name: "S", source_url: "https://example.org/",
  license: "public-domain", license_note: "", readable: true, section_count: 3, chapter_count: 2,
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchCommentaryWorks: vi.fn().mockResolvedValue([work]),
    fetchCommentaryWork: vi.fn().mockResolvedValue({
      ...work,
      chapters: [
        { number: 0, title: "序", section_count: 1 },
        { number: 41, title: "第41講　救いの完成", section_count: 2 },
      ],
    }),
  };
});

describe("プランに解釈書の章を足す", () => {
  it("解釈書を選び、章を ＋ で足す（入っている章は足せない）", async () => {
    const onPick = vi.fn();
    render(
      <CommentaryChapterPicker
        picked={[{ book: null, work: "uchimura-romans", chapter_number: 0 }]}
        canAdd
        onPick={onPick}
      />,
    );
    fireEvent.click(await screen.findByRole("button", { name: /ロマ書の研究/ }));
    const add = await screen.findByRole("button", { name: /第41講/ });
    fireEvent.click(add);
    expect(onPick).toHaveBeenCalledWith({
      book: null, work: "uchimura-romans", book_name: "ロマ書の研究", chapter_number: 41,
      chapter_title: "第41講　救いの完成", translation: "",
    });
    // 序はもう入っている
    expect(screen.getByRole("button", { name: /序/ })).toBeDisabled();
    expect(screen.getAllByRole("link", { name: /第41講/ })[0]).toHaveAttribute("href", "/commentary/uchimura-romans/41");
  });

  it("解釈書の章のリンクと表示名", () => {
    const reading = { book: null, work: "uchimura-romans", book_name: "ロマ書の研究", chapter_number: 41, chapter_title: "第41講", translation: "" };
    expect(readingHref(reading)).toBe("/commentary/uchimura-romans/41");
    expect(readingLabel(reading, translations.ja)).toBe("ロマ書の研究 第41講");
  });
});
