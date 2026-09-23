import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import CommentaryWorkPage from "./page";
import { ApiError } from "@/lib/apiClient";
import type { CommentarySection, CommentaryWork } from "@/lib/types";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/commentary/calvin-commentaries",
}));

vi.mock("@/lib/i18nServer", async () => {
  const { translations } = await import("@/lib/i18nDictionary");
  return { getT: async () => translations.ja, getRequestLanguage: async () => "ja" };
});

vi.mock("@/lib/apiServer", () => ({ serverFetch: vi.fn() }));

const work: CommentaryWork = {
  slug: "calvin-commentaries", title: "Calvin's Commentaries", title_ja: "カルヴァン聖書注解",
  author: "John Calvin", author_ja: "ジャン・カルヴァン", year: 1555, tradition: "reformation", language: "en",
  translator: "Calvin Translation Society（1843–1855）", source_name: "Christian Classics Ethereal Library",
  source_url: "https://www.ccel.org/ccel/calvin/commentaries.i.html", license: "public-domain",
  license_note: "19世紀の英訳で米国ではパブリックドメイン。", readable: true, section_count: 45,
};

const section = (order: number): CommentarySection => ({
  id: `s${order}`, order, heading: "Romans 8:28", text: "28. And we know, etc.", source_url: "",
  links: [
    { book: "romans", chapter: 8, verse: 28, chapter_end: 8, verse_end: 28, method: "structure", confidence: null },
    { book: "genesis", chapter: 50, verse: 20, chapter_end: 50, verse_end: 20, method: "citation", confidence: null },
  ],
});

async function mockApi(sections: CommentarySection[], count = sections.length) {
  const { serverFetch } = await import("@/lib/apiServer");
  vi.mocked(serverFetch).mockImplementation(async (path: string) =>
    path.includes("/sections/") ? { count, next: null, results: sections } : work,
  );
  return vi.mocked(serverFetch);
}

const params = Promise.resolve({ slug: "calvin-commentaries" });

describe("解釈書を読むページ", () => {
  beforeEach(() => vi.clearAllMocks());

  it("出典と権利を出し、区切りごとに論じる箇所と引く箇所を分ける", async () => {
    await mockApi([section(0)]);
    render(await CommentaryWorkPage({ params, searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("カルヴァン聖書注解");
    expect(screen.getByRole("link", { name: "Christian Classics Ethereal Library" })).toHaveAttribute(
      "href", work.source_url,
    );
    expect(screen.getByText(/パブリックドメイン/)).toBeInTheDocument();

    const block = document.getElementById("s-0")!;
    expect(within(block).getByText("28. And we know, etc.")).toHaveAttribute("lang", "en");
    expect(within(block).getByRole("link", { name: "ローマ 8:28" })).toHaveAttribute("href", "/romans/8#verse-28");
    expect(within(block).getByText("論じている箇所")).toBeInTheDocument();
    expect(within(block).getByRole("link", { name: "創世記 50:20" })).toBeInTheDocument();
    expect(within(block).getByText("引いている箇所")).toBeInTheDocument();
  });

  it("?around= はその区切りを含むページを取りに行き、?page= があればそちらを使う", async () => {
    const serverFetch = await mockApi([section(40)], 100);
    render(await CommentaryWorkPage({ params, searchParams: Promise.resolve({ around: "40" }) }));
    expect(serverFetch).toHaveBeenCalledWith("/commentary/works/calvin-commentaries/sections/?around=40");
    // 20件ずつなので、40番は3ページ目
    expect(screen.getByRole("button", { name: "3" })).toHaveAttribute("aria-current", "page");

    serverFetch.mockClear();
    render(await CommentaryWorkPage({ params, searchParams: Promise.resolve({ around: "40", page: "2" }) }));
    expect(serverFetch).toHaveBeenCalledWith("/commentary/works/calvin-commentaries/sections/?page=2");
  });

  it("無い本は一覧へ戻る導線を出す", async () => {
    const { serverFetch } = await import("@/lib/apiServer");
    vi.mocked(serverFetch).mockRejectedValue(new ApiError(404, "not found"));
    render(await CommentaryWorkPage({ params, searchParams: Promise.resolve({}) }));
    expect(screen.getByText("ページが見つかりません")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "解釈書の一覧へ" })).toHaveAttribute("href", "/commentary");
  });
});
