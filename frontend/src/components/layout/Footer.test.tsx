import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "./Footer";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// この部品はサーバー側で描くので、表示文言もサーバー用の入口から取る。
vi.mock("@/lib/i18nServer", () => ({
  getT: async () => ({
    footerAbout: "NeON Church について",
    footerGuidelines: "コミュニティガイドライン",
    footerLicenses: "ライセンス",
    footerTerms: "利用規約",
    footerPrivacy: "プライバシー",
    footerFeedback: "フィードバック",
    footerNavLabel: "サイト全体のリンク",
    footerBetaNote: "ベータ版です。",
  }),
}));

describe("Footer", () => {
  it("信頼性ページへのリンクが全て揃っている", async () => {
    // サーバーコンポーネントは呼び出すと Promise を返すので、待ってから描く。
    render(await Footer());

    expect(screen.getByRole("link", { name: "NeON Church について" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: "コミュニティガイドライン" })).toHaveAttribute("href", "/guidelines");
    expect(screen.getByRole("link", { name: "ライセンス" })).toHaveAttribute("href", "/licenses");
    expect(screen.getByRole("link", { name: "利用規約" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "プライバシー" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "フィードバック" })).toHaveAttribute("href", "/feedback");
  });

  it("role=contentinfo を持ち nav に aria-label が付く", async () => {
    render(await Footer());

    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "サイト全体のリンク" })).toBeInTheDocument();
  });
});
