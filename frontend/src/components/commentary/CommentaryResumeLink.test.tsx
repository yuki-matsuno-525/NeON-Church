import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CommentaryResumeLink } from "./CommentaryResumeLink";
import { saveCommentaryProgress } from "@/lib/commentaryProgress";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

describe("解釈書の「続きから読む」", () => {
  beforeEach(() => localStorage.clear());

  it("最後に読んだ区切りへ送る", async () => {
    saveCommentaryProgress({
      work: "uchimura-romans", chapter: 41, number: 3,
      title: { ja: "ロマ書の研究", en: "Studies in Romans" }, chapterTitle: { ja: "第41講", en: "Lecture 41" },
    });
    render(<CommentaryResumeLink />);
    const link = await screen.findByRole("link");
    expect(link).toHaveTextContent("続きから読む — ロマ書の研究 第41講");
    expect(link).toHaveAttribute("href", "/commentary/uchimura-romans/41?s=3#s-3");
  });

  it("まだ読んでいなければ何も出さない", () => {
    const { container } = render(<CommentaryResumeLink />);
    expect(container).toBeEmptyDOMElement();
  });
});
