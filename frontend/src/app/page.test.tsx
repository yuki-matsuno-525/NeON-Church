import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "./page";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/lib/i18nServer", async () => {
  const { translations } = await import("@/lib/i18nDictionary");
  return { getT: async () => translations.ja, getRequestLanguage: async () => "ja" };
});

// データ欄の中身は HomeSections.test.tsx で確かめる。ここでは骨組みだけを見る。
vi.mock("./HomeSections", () => ({
  VerseCard: () => <p>聖句の欄</p>,
  VerseCardFallback: () => <p>聖句を待つ枠</p>,
  HomeActivity: () => <p>一覧の欄</p>,
}));

describe("表紙", () => {
  it("記事のカードから記事一覧へ行ける（ログインは要らない）", async () => {
    render(await Home());

    expect(screen.getByRole("link", { name: "記事" })).toHaveAttribute("href", "/articles");
  });

  it("見出しとパネルに加えて、聖句と一覧の欄を置く", async () => {
    render(await Home());

    expect(screen.getByRole("link", { name: "読む" })).toBeInTheDocument();
    expect(screen.getByText("聖句の欄")).toBeInTheDocument();
    expect(screen.getByText("一覧の欄")).toBeInTheDocument();
  });
});
