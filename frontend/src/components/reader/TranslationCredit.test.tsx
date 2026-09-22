import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TranslationCredit } from "./TranslationCredit";

describe("TranslationCredit", () => {
  it("訳の出典と権利の状態、ライセンスページへのリンクを出す", () => {
    render(<TranslationCredit translationId="KJV" lang="ja" />);
    expect(screen.getByText(/欽定訳聖書/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "出典について" })).toHaveAttribute("href", "/licenses");
  });

  it("英語表示では英語の出典を出す", () => {
    render(<TranslationCredit translationId="KJV" lang="en" />);
    expect(screen.getByText(/King James Version/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "About sources" })).toBeInTheDocument();
  });

  it("口語訳では注記も出す", () => {
    render(<TranslationCredit translationId="口語訳" lang="ja" />);
    expect(screen.getByText(/改変せずに掲載/)).toBeInTheDocument();
  });

  it("出典が無い訳では何も出さない", () => {
    const { container } = render(<TranslationCredit translationId="unknown" lang="ja" />);
    expect(container).toBeEmptyDOMElement();
  });
});
