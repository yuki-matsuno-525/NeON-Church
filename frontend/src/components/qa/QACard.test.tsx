import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QACard } from "./QACard";
import type { QAComment } from "@/lib/api";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const makeQuestion = (overrides: Partial<QAComment> = {}): QAComment => ({
  id: "q1",
  user: { id: "u1", username: "alice" },
  title: "山上の説教の『心の貧しい人』とは？",
  body: "この表現の背景を知りたいです。",
  created_at: new Date().toISOString(),
  vote_count: 4,
  tags: [{ id: "tag1", name: "解説" }],
  location_label: "マタイ 5:3",
  book_name: "マタイによる福音書",
  chapter_number: 5,
  verse_number: 3,
  reply_count: 2,
  best_answer: null,
  ...overrides,
});

describe("QACard", () => {
  it("質問の見出し・状態・場所リンク・返信数を表示する", () => {
    render(
      <QACard
        comment={makeQuestion()}
        currentUserId={null}
        onBestAnswerChange={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { level: 2, name: "山上の説教の『心の貧しい人』とは？" })).toBeInTheDocument();
    expect(screen.getByLabelText("未解決")).toBeInTheDocument();
    expect(screen.getByText("解説")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /返信 2件/ })).toHaveAttribute("aria-expanded", "false");

    const locationLink = screen.getByRole("link", { name: "マタイ 5:3" });
    expect(locationLink).toHaveAttribute("href", "/matthew/5#verse-3");
  });
});
