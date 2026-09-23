import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ReadPage from "./page";
import type { CommentaryWork } from "@/lib/types";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/read",
}));

vi.mock("@/lib/i18nServer", async () => {
  const { translations } = await import("@/lib/i18nDictionary");
  return { getT: async () => translations.ja, getRequestLanguage: async () => "ja" };
});

vi.mock("@/lib/apiServer", () => ({
  serverFetchPublic: vi.fn(),
  serverFetchAll: vi.fn(),
  serverIsSignedIn: vi.fn(),
}));

const work = (overrides: Partial<CommentaryWork>): CommentaryWork => ({
  slug: "w", title: "W", title_ja: "", author: "A", author_ja: "", year: null, tradition: "patristic", language: "en",
  translator: "", source_name: "S", source_url: "https://example.org/", license: "public-domain", license_note: "",
  readable: true, section_count: 10, chapter_count: 1, ...overrides,
});

const works = [
  work({ slug: "rashi-genesis", title_ja: "ラシ 創世記注解", author_ja: "ラシ", tradition: "jewish", year: 1100, chapter_count: 50 }),
  work({ slug: "calvin-romans", title_ja: "カルヴァン ローマ人への手紙注解", author_ja: "ジャン・カルヴァン", tradition: "reformation", year: 1555 }),
  work({ slug: "uchimura-romans", title_ja: "ロマ書の研究", author_ja: "内村鑑三", tradition: "mukyokai", year: 1924, language: "ja", chapter_count: 61 }),
];

async function renderPage(result: CommentaryWork[] | Error = works) {
  const { serverFetchPublic } = await import("@/lib/apiServer");
  if (result instanceof Error) vi.mocked(serverFetchPublic).mockRejectedValue(result);
  else vi.mocked(serverFetchPublic).mockResolvedValue(result);
  render(await ReadPage({ searchParams: Promise.resolve({ tab: "commentary" }) }));
}

describe("「読む」の解釈書タブ", () => {
  beforeEach(() => vi.clearAllMocks());

  it("立場のチップで絞り、最初は一番古い立場の本を出す", async () => {
    await renderPage();
    // 「聖書」「解釈書」のタブで、解釈書が選ばれている
    expect(screen.getByRole("tab", { name: "解釈書" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "聖書" })).toHaveAttribute("href", "/read");
    // 出てくる立場だけがチップになる
    expect(screen.getAllByRole("button", { pressed: false }).map((b) => b.textContent)).toEqual(["宗教改革 (1)", "無教会 (1)"]);
    expect(screen.getByRole("button", { pressed: true })).toHaveTextContent("ユダヤ教 (1)");

    const rashi = screen.getByRole("link", { name: /ラシ 創世記注解/ });
    expect(rashi).toHaveAttribute("href", "/commentary/rashi-genesis");
    expect(rashi).toHaveTextContent("1100年ごろ");
    expect(rashi).toHaveTextContent("全50章");
    expect(rashi).toHaveTextContent("英語");

    fireEvent.click(screen.getByRole("button", { name: "無教会 (1)" }));
    const uchimura = screen.getByRole("link", { name: /ロマ書の研究/ });
    expect(uchimura).not.toHaveTextContent("日本語");
    expect(screen.queryByRole("link", { name: /ラシ/ })).not.toBeInTheDocument();
  });

  it("書名・著者・立場で検索できる", async () => {
    await renderPage();
    const search = screen.getByRole("searchbox", { name: "解釈書を検索" });

    fireEvent.change(search, { target: { value: "カルヴァン" } });
    expect(await screen.findByRole("link", { name: /ローマ人への手紙注解/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /ラシ/ })).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "無教会" } });
    expect(await screen.findByRole("link", { name: /ロマ書の研究/ })).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "該当なし" } });
    expect(await screen.findByText("一致する解釈書がありません。")).toBeInTheDocument();
  });

  it("取れなかったときは、その旨を出す", async () => {
    await renderPage(new Error("down"));
    expect(screen.getByText("読み込めませんでした")).toBeInTheDocument();
  });
});
