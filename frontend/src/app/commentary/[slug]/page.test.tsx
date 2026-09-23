import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CommentaryWorkPage from "./page";
import type { CommentaryWorkDetail } from "@/lib/types";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

const language = vi.hoisted(() => ({ current: "ja" as "ja" | "en" }));
vi.mock("@/lib/i18nServer", async () => {
  const { translations } = await import("@/lib/i18nDictionary");
  return {
    getT: async () => translations[language.current],
    getRequestLanguage: async () => language.current,
  };
});

vi.mock("@/lib/apiServer", () => ({ serverFetchPublic: vi.fn() }));

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
  license: "public-domain", license_note: "19世紀の英訳。", license_note_en: "A 19th-century translation.", readable: true, section_count: 3, chapter_count: 2,
  chapters: [
    { number: 1, title: "ローマ人への手紙 1章", title_en: "Romans 1", section_count: 2 },
    { number: 8, title: "ローマ人への手紙 8章", title_en: "Romans 8", section_count: 1 },
  ],
};

async function renderPage(work: CommentaryWorkDetail) {
  const { serverFetchPublic } = await import("@/lib/apiServer");
  vi.mocked(serverFetchPublic).mockResolvedValue(work);
  render(await CommentaryWorkPage({ params: Promise.resolve({ slug: work.slug }) }));
}

describe("解釈書の書のページ", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    language.current = "ja";
    localStorage.clear();
  });

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

  it("英語の画面では、題・権利の説明を英語で出し、和題を添える", async () => {
    language.current = "en";
    await renderPage(base);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Calvin's Commentary on Romans");
    expect(screen.getByText("カルヴァン ローマ人への手紙注解", { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/A 19th-century translation\./)).toBeInTheDocument();
  });

  it("最後に開いた章に印を付ける", async () => {
    localStorage.setItem("neon_commentary_progress_calvin-romans", JSON.stringify({ chapter: 8, number: 3 }));
    await renderPage(base);
    expect(await screen.findByLabelText("読書中")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^8/ })).toHaveClass("chapter-cell-current");
    expect(screen.getByRole("link", { name: "1" })).not.toHaveClass("chapter-cell-current");
  });
});
