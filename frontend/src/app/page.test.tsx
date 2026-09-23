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
  it("押すものは「登録せずに読んでみる」で、書の一覧へ行く（ログインは要らない）", async () => {
    render(await Home());

    expect(screen.getByRole("link", { name: "登録せずに読んでみる →" })).toHaveAttribute("href", "/read");
    expect(screen.getByText(/読むだけなら登録は要りません/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "NeON Church とは" })).toHaveAttribute("href", "/about");
  });

  it("初めての3冊は、正典2冊と外典1冊をそれぞれ最初の章へつなぐ", async () => {
    render(await Home());

    expect(screen.getByRole("link", { name: /ヨハネ/ })).toHaveAttribute("href", "/john/1");
    expect(screen.getByRole("link", { name: /マルコ/ })).toHaveAttribute("href", "/mark/1");
    // トマスの福音書は冒頭の Prologue が第0章
    expect(screen.getByRole("link", { name: /トマス/ })).toHaveAttribute("href", "/thomas/0");
  });

  it("読む以外の機能へも一番下から行ける", async () => {
    render(await Home());

    const nav = screen.getByRole("navigation", { name: "そのほかの入口" });
    expect(nav.querySelector('a[href="/articles"]')).not.toBeNull();
    expect(nav.querySelector('a[href="/qa"]')).not.toBeNull();
  });

  it("聖句と一覧の欄を置く", async () => {
    render(await Home());

    expect(screen.getByText("聖句の欄")).toBeInTheDocument();
    expect(screen.getByText("一覧の欄")).toBeInTheDocument();
  });
});
