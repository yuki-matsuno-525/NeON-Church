import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArticleBody } from "./ArticleBody";
import type { ArticleCitation } from "@/lib/types";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const inlineCitation: ArticleCitation = {
  raw: "[[matthew 6:16]]",
  kind: "inline",
  found: true,
  label: "マタイによる福音書 6:16",
  book_slug: "matthew",
  book_name: "マタイによる福音書",
  chapter_number: 6,
  verse_number_start: 16,
  verse_number_end: 16,
  translation: "口語訳",
  verses: [],
};

const blockCitation: ArticleCitation = {
  ...inlineCitation,
  raw: "{{matthew 6:17-18}}",
  kind: "block",
  label: "マタイによる福音書 6:17-18",
  verse_number_start: 17,
  verse_number_end: 18,
  verses: [
    { number: 17, text: "あなたは断食するとき、頭に油をつけ" },
    { number: 18, text: "顔を洗いなさい" },
  ],
};

describe("ArticleBody", () => {
  it("文中の参照がその節へのリンクになる", () => {
    render(<ArticleBody body="断食について [[matthew 6:16]] と書かれている。" citations={[inlineCitation]} />);

    const link = screen.getByRole("link", { name: "（マタイによる福音書 6:16）" });
    expect(link).toHaveAttribute("href", "/matthew/6?translation=%E5%8F%A3%E8%AA%9E%E8%A8%B3#verse-16");
  });

  it("引用ブロックは節の本文と出典を出す", () => {
    render(<ArticleBody body="{{matthew 6:17-18}}" citations={[blockCitation]} />);

    expect(screen.getByText("あなたは断食するとき、頭に油をつけ")).toBeInTheDocument();
    expect(screen.getByText("顔を洗いなさい")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /マタイによる福音書 6:17-18（口語訳（日本語））/ })).toBeInTheDocument();
  });

  it("段落の途中にある引用ブロックはそこで段落を切る", () => {
    render(
      <ArticleBody body={"前の文。{{matthew 6:17-18}}あとの文。"} citations={[blockCitation]} />,
    );

    expect(screen.getByText("前の文。")).toBeInTheDocument();
    expect(screen.getByText("あとの文。")).toBeInTheDocument();
  });

  it("解決できない印は確認できない参照として印も出す", () => {
    render(<ArticleBody body="[[nosuchbook 1:1]]" citations={[]} />);

    expect(screen.getByRole("note")).toHaveTextContent("参照先を確認できませんでした");
    expect(screen.getByRole("note")).toHaveTextContent("[[nosuchbook 1:1]]");
  });

  it("見出し・箇条書き・太字を表示できる", () => {
    render(
      <ArticleBody
        body={"## 見出し\n\n- ひとつめ\n- ふたつめ\n\n**強い**言葉。"}
        citations={[]}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "見出し" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("強い").tagName).toBe("STRONG");
  });

  it("危ないリンクは踏ませない", () => {
    render(<ArticleBody body={"[押すな](javascript:alert(1))"} citations={[]} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("押すな")).toBeInTheDocument();
  });

  it("本文が空のときは何も書かれていないと出す", () => {
    render(<ArticleBody body="" citations={[]} />);

    expect(screen.getByText("まだ何も書かれていません。")).toBeInTheDocument();
  });
});
