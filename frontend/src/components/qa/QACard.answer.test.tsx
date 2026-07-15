import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QACard } from "./QACard";
import type { QAComment } from "@/lib/api";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchCommentReplies: vi.fn().mockResolvedValue([]),
    createComment: vi.fn().mockResolvedValue({ id: "a1" }),
    setBestAnswer: vi.fn().mockResolvedValue(undefined),
  };
});

const makeQuestion = (): QAComment => ({
  id: "q1",
  user: { id: "u1", username: "alice" },
  title: "山上の説教について",
  body: "背景を知りたいです。",
  created_at: new Date().toISOString(),
  vote_count: 0,
  tags: [],
  location_label: "マタイ 5:3",
  book_name: "マタイによる福音書",
  chapter_number: 5,
  verse_number: 3,
  reply_count: 0,
  best_answer: null,
});

describe("QACard answer form", () => {
  it("posts an answer from the list card", async () => {
    const onAnswerPosted = vi.fn();
    render(
      <QACard
        comment={makeQuestion()}
        currentUserId="u2"
        onBestAnswerChange={vi.fn()}
        onAnswerPosted={onAnswerPosted}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /回答する/ }));
    const textbox = await screen.findByRole("textbox");
    fireEvent.change(textbox, { target: { value: "回答本文" } });
    fireEvent.submit(textbox.closest("form")!);

    const { createComment } = await import("@/lib/api");
    await waitFor(() => {
      expect(vi.mocked(createComment)).toHaveBeenCalledWith({ parent: "q1", body: "回答本文" });
      expect(onAnswerPosted).toHaveBeenCalled();
    });
  });
});
