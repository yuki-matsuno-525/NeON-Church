import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "./Footer";

vi.mock("@/contexts/LanguageContext", () => ({
  useLang: () => ({ lang: "ja", setLang: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("Footer", () => {
  it("信頼性ページへのリンクが全て揃っている", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: "NeON Church について" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: "コミュニティガイドライン" })).toHaveAttribute("href", "/guidelines");
    expect(screen.getByRole("link", { name: "ライセンス" })).toHaveAttribute("href", "/licenses");
    expect(screen.getByRole("link", { name: "利用規約" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "プライバシー" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "フィードバック" })).toHaveAttribute("href", "/feedback");
  });

  it("GitHub リンクは外部リンクとして rel=noopener noreferrer が付く", () => {
    render(<Footer />);
    const github = screen.getByRole("link", { name: "GitHub" });
    expect(github).toHaveAttribute("target", "_blank");
    expect(github).toHaveAttribute("rel", "noopener noreferrer");
    expect(github.getAttribute("href")).toMatch(/^https:\/\//);
  });

  it("role=contentinfo を持ち nav に aria-label が付く", () => {
    render(<Footer />);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "サイト全体のリンク" })).toBeInTheDocument();
  });
});
