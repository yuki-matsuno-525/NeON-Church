import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CommentaryWorkPage from "./page";
import type { CommentaryWorkDetail } from "@/lib/types";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("@/lib/i18nServer", async () => {
  const { translations } = await import("@/lib/i18nDictionary");
  return { getT: async () => translations.ja, getRequestLanguage: async () => "ja" };
});

vi.mock("@/lib/apiServer", () => ({ serverFetch: vi.fn() }));

// 書へのコメント欄と星はブラウザ側の部品。ここでは何の場所で使われるかだけ確かめる。
vi.mock("@/components/reader/ChapterComments", () => ({
  ChapterComments: ({ commentary, label }: { commentary: { work: string }; label: string }) => (
    <div data-testid="comments">{`${label}:${commentary.work}`}</div>
  ),
}));
vi.mock("@/components/commentary/CommentaryBookmarkStar", () => ({ CommentaryBookmarkStar: () => null }));

const base: CommentaryWorkDetail = {
  slug: "calvin-romans", title: "Calvin's Commentary on Romans", title_ja: "カルヴァン ローマ人への手紙注解",
  author: "John Calvin", author_ja: "ジャン・カルヴァン", year: 1555, tradition: "reformation", language: "en",
  translator: "Calvin Translation Society", source_name: "CCEL", source_url: "https://www.ccel.org/",
  license: "public-domain", license_note: "19世紀の英訳。", readable: true, section_count: 3, chapter_count: 2,
  chapters: [
    { number: 1, title: "ローマ人への手紙 1章", section_count: 2 },
    { number: 8, title: "ローマ人への手紙 8章", section_count: 1 },
  ],
};

async function renderPage(work: CommentaryWorkDetail) {
  const { serverFetch } = await import("@/lib/apiServer");
  vi.mocked(serverFetch).mockResolvedValue(work);
  render(await CommentaryWorkPage({ params: Promise.resolve({ slug: work.slug }) }));
}

describe("解釈書の書のページ", () => {
  beforeEach(() => vi.clearAllMocks());

  it("聖書の章ごとの注解は、聖書の書のページと同じ番号の升目で章を選ぶ", async () => {
    await renderPage(base);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("カルヴァン ローマ人への手紙注解");
    expect(screen.getByRole("link", { name: "8" })).toHaveAttribute("href", "/commentary/calvin-romans/8");
    expect(screen.getByRole("link", { name: "CCEL" })).toHaveAttribute("href", "https://www.ccel.org/");
    expect(screen.getByText(/パブリックドメイン/)).toBeInTheDocument();
    // 下に書へのコメント
    expect(screen.getByTestId("comments")).toHaveTextContent("この書へのコメント:calvin-romans");
  });

  it("講や巻で分かれる本は、章の題の一覧で選ぶ", async () => {
    await renderPage({
      ...base,
      slug: "uchimura-romans",
      chapters: [
        { number: 1, title: "第1講 ロマ書の大意", section_count: 12 },
        { number: 2, title: "第2講 パウロの自己紹介（一）", section_count: 20 },
      ],
    });
    const link = screen.getByRole("link", { name: /第2講 パウロの自己紹介/ });
    expect(link).toHaveAttribute("href", "/commentary/uchimura-romans/2");
    expect(link).toHaveTextContent("20 の区切り");
  });
});
