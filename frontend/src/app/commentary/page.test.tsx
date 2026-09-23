import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import CommentaryListPage from "./page";
import type { CommentaryWork } from "@/lib/types";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("@/lib/i18nServer", async () => {
  const { translations } = await import("@/lib/i18nDictionary");
  return { getT: async () => translations.ja, getRequestLanguage: async () => "ja" };
});

vi.mock("@/lib/apiServer", () => ({ serverFetchList: vi.fn() }));

const work = (overrides: Partial<CommentaryWork>): CommentaryWork => ({
  slug: "w", title: "W", title_ja: "", author: "A", author_ja: "", year: null, tradition: "patristic", language: "en",
  translator: "", source_name: "S", source_url: "https://example.org/", license: "public-domain", license_note: "",
  readable: true, section_count: 10, ...overrides,
});

describe("解釈書の一覧", () => {
  beforeEach(() => vi.clearAllMocks());

  it("立場ごとに分け、古い立場から並べる", async () => {
    const { serverFetchList } = await import("@/lib/apiServer");
    vi.mocked(serverFetchList).mockResolvedValue([
      work({ slug: "uchimura-romans", title_ja: "ロマ書の研究", author_ja: "内村鑑三", tradition: "mukyokai", year: 1924, language: "ja" }),
      work({ slug: "rashi-on-torah", title_ja: "ラシのトーラー注解", author_ja: "ラシ", tradition: "jewish", year: 1100 }),
    ]);
    render(await CommentaryListPage());

    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["ユダヤ教", "無教会"]);

    const rashi = screen.getByRole("link", { name: /ラシのトーラー注解/ });
    expect(rashi).toHaveAttribute("href", "/commentary/rashi-on-torah");
    expect(rashi).toHaveTextContent("1100年ごろ");
    expect(rashi).toHaveTextContent("英語");
    // 日本語の本には言語を書かない
    expect(within(screen.getByRole("link", { name: /ロマ書の研究/ })).queryByText("日本語")).not.toBeInTheDocument();
  });

  it("取れなかったときは、その旨を出す", async () => {
    const { serverFetchList } = await import("@/lib/apiServer");
    vi.mocked(serverFetchList).mockRejectedValue(new Error("down"));
    render(await CommentaryListPage());
    expect(screen.getByText("読み込めませんでした")).toBeInTheDocument();
  });
});
