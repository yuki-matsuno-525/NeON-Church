import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QACard } from "./QACard";
import type { QAQuestion } from "@/lib/api";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const makeQuestion = (overrides: Partial<QAQuestion> = {}): QAQuestion => ({
  id: "q1",
  user: { id: "u1", username: "alice" },
  title: "山上の説教の『心の貧しい人』とは？",
  body: "この表現の背景を知りたいです。",
  created_at: new Date().toISOString(),
  is_deleted: false,
  book_slug: "matthew",
  book_name: "マタイによる福音書",
  chapter_number: 5,
  verse_number: 3,
  location_label: "マタイによる福音書 5章 3節",
  version_label: "口語訳",
  tags: [{ id: "tag1", name: "解説" }],
  best_answer: null,
  answer_count: 2,
  ...overrides,
});

describe("QACard", () => {
  it("カード全体が詳細ページへのリンクになる", () => {
    render(<QACard question={makeQuestion()} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/qa/q1");
  });

  it("題・状態・箇所・タグ・回答件数を表示する", () => {
    render(<QACard question={makeQuestion()} />);

    expect(
      screen.getByRole("heading", { name: "山上の説教の『心の貧しい人』とは？" })
    ).toBeInTheDocument();
    expect(screen.getByText("未解決")).toBeInTheDocument();
    expect(screen.getByText("マタイによる福音書 5章3節")).toBeInTheDocument();
    expect(screen.getByText("解説")).toBeInTheDocument();
    expect(screen.getByText("回答 2件")).toBeInTheDocument();
  });

  it("ベストアンサーがあれば解決済みと出す", () => {
    render(
      <QACard
        question={makeQuestion({
          best_answer: {
            id: "a1",
            user: { id: "u2", username: "bob" },
            body: "旧約の背景があります",
            created_at: new Date().toISOString(),
          },
        })}
      />
    );
    expect(screen.getByText("解決済み")).toBeInTheDocument();
  });

  it("本文が長いときは省略する（一覧の高さを揃えるため）", () => {
    render(<QACard question={makeQuestion({ body: "あ".repeat(200) })} />);
    expect(screen.getByText(/…$/)).toBeInTheDocument();
  });

  it("showLocation=false では箇所を出さない（読書ページのパネル用）", () => {
    render(<QACard question={makeQuestion()} showLocation={false} />);
    expect(screen.queryByText("マタイによる福音書 5章3節")).not.toBeInTheDocument();
  });
});
