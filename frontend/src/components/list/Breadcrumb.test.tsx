import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Breadcrumb } from "./Breadcrumb";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe("パンくず", () => {
  it("上の階層はリンクにし、いまいる場所はリンクにしない", () => {
    render(
      <Breadcrumb
        items={[
          { label: "記事", href: "/articles" },
          { label: "エノク書の見張る者" },
        ]}
      />,
    );

    // 「記事」へのリンクは 2 本ある（広い画面用の並びと、狭い画面用の 1 段）。
    for (const link of screen.getAllByRole("link", { name: "記事" })) {
      expect(link).toHaveAttribute("href", "/articles");
    }
    expect(screen.queryByRole("link", { name: "エノク書の見張る者" })).not.toBeInTheDocument();
    expect(screen.getByText("エノク書の見張る者")).toHaveAttribute("aria-current", "page");
  });

  it("狭い画面向けに、すぐ上の階層へ戻る1段も持つ", () => {
    render(
      <Breadcrumb
        items={[
          { label: "翻訳", href: "/translations" },
          { label: "口語訳エノク書", href: "/translations/p1" },
          { label: "第1章" },
        ]}
      />,
    );

    // いまいる場所のすぐ上へ戻る 1 段。広い画面では CSS で隠す。
    const back = screen
      .getAllByRole("link", { name: "口語訳エノク書" })
      .find((link) => link.classList.contains("breadcrumb-back"));
    expect(back).toHaveAttribute("href", "/translations/p1");
  });

  it("離れる前の確認が要る画面では、その処理を呼ぶ", () => {
    const onNavigate = vi.fn();
    render(
      <Breadcrumb
        items={[
          { label: "翻訳", href: "/translations", onNavigate },
          { label: "口語訳エノク書" },
        ]}
      />,
    );

    screen.getAllByRole("link", { name: /翻訳/ })[0].click();
    expect(onNavigate).toHaveBeenCalled();
  });

  it("何も渡されなければ何も描かない", () => {
    const { container } = render(<Breadcrumb items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
