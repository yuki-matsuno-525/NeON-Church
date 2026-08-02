import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContentPageMeta } from "./ContentPageMeta";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

describe("ContentPageMeta", () => {
  it("更新日、ページ内目次、関連導線を意味のあるリンクとして表示する", () => {
    render(
      <ContentPageMeta
        updatedAt="2026-08-01"
        sections={["1. 概要", "2. 詳細"]}
        relatedLinks={[{ href: "/feedback", label: "お問い合わせ" }]}
        labels={{ updated: "更新日", contents: "目次", related: "関連ページ" }}
      />,
    );

    expect(screen.getByText("2026-08-01").closest("time")).toHaveAttribute("datetime", "2026-08-01");
    expect(screen.getByRole("link", { name: "概要" })).toHaveAttribute("href", "#section-1");
    expect(screen.getByRole("link", { name: "お問い合わせ" })).toHaveAttribute("href", "/feedback");
  });
});
