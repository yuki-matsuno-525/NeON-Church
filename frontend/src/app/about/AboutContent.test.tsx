import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AboutContent } from "./AboutContent";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

// この画面はサーバー側で描くので、表示文言も言語もサーバー用の入口から取る。
vi.mock("@/lib/i18nServer", () => ({
  getRequestLanguage: async () => "ja",
  getT: async () => ({
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
  it("いまの状態と、何ができる場所かを示す", async () => {
    // サーバーコンポーネントは呼び出すと Promise を返すので、待ってから描く。
    render(await AboutContent());

    expect(screen.getByRole("status")).toHaveTextContent("ベータ版");
    expect(screen.getByRole("heading", { name: "概要" })).toBeInTheDocument();
    expect(screen.getByText("読む")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "トップへ戻る" })).toHaveAttribute("href", "/");
  });

  it("目次のパネルは置かない", async () => {
    render(await AboutContent());

    // 節が 3 つしかないので目次は出さない（規約など長い画面では引き続き使う）。
    expect(screen.queryByText("このページの内容")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
