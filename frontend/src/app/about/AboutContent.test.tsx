import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AboutContent } from "./AboutContent";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

// この画面はサーバー側で描くので、表示文言もサーバー用の入口から取る。
vi.mock("@/lib/i18nServer", () => ({
  getT: async () => ({
    aboutTitle: "NeON Churchについて",
    aboutSubtitle: "古代文書を読む場所です。",
    aboutBetaNoteBefore: "ベータ版として公開中です。気づいたことは、",
    aboutBetaNoteLink: "フィードバックのページ",
    aboutBetaNoteAfter: "からお寄せください。",
    aboutSection1Title: "概要",
    aboutSection1Body: "本文",
    aboutSection2Title: "できること",
    aboutFeatures: ["読む"],
    aboutSection3Title: "これから",
    aboutPlanned: ["改善"],
    aboutSection4Title: "ご利用にあたって",
    aboutNotices: ["教会組織ではありません"],
    homeStartReading: "登録せずに読んでみる",
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
    expect(screen.getByRole("heading", { name: "ご利用にあたって" })).toBeInTheDocument();
    expect(screen.getByText("教会組織ではありません")).toBeInTheDocument();
  });

  it("ベータ版の知らせから、フィードバックのページへ行ける", async () => {
    render(await AboutContent());

    expect(screen.getByRole("link", { name: "フィードバックのページ" })).toHaveAttribute("href", "/feedback");
  });

  it("読み終えた人に、読み始める入口とトップへの道を出す", async () => {
    render(await AboutContent());

    expect(screen.getByRole("link", { name: "登録せずに読んでみる →" })).toHaveAttribute("href", "/read");
    expect(screen.getByRole("link", { name: "トップへ戻る" })).toHaveAttribute("href", "/");
  });

  it("目次のパネルは置かない", async () => {
    render(await AboutContent());

    // 節が 4 つしかないので目次は出さない（規約など長い画面では引き続き使う）。
    expect(screen.queryByText("このページの内容")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
