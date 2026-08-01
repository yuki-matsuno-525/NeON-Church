import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AboutContent } from "./AboutContent";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));
vi.mock("@/contexts/LanguageContext", () => ({ useLang: () => ({ lang: "ja" }) }));
vi.mock("@/lib/i18n", () => ({
  useT: () => ({
    aboutTitle: "NeON Churchについて",
    aboutSubtitle: "古代文書を読む場所です。",
    aboutSection1Title: "概要",
    aboutSection1Body: "本文",
    aboutSection2Title: "できること",
    aboutFeatures: ["読む"],
    aboutSection3Title: "これから",
    aboutPlanned: ["改善"],
    backToHome: "トップへ戻る",
  }),
}));

describe("AboutContent", () => {
  it("現在の状態と主要な次アクションを示す", () => {
    render(<AboutContent />);

    expect(screen.getByRole("status")).toHaveTextContent("ベータ版");
    expect(screen.getByRole("link", { name: "書を読む" })).toHaveAttribute("href", "/read");
    expect(screen.getByRole("link", { name: "Q&A" })).toHaveAttribute("href", "/qa");
    expect(screen.getByRole("link", { name: "翻訳に参加" })).toHaveAttribute("href", "/translations");
  });
});
