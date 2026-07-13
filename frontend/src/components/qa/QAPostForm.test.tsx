import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QAPostForm } from "./QAPostForm";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    createComment: vi.fn(),
    fetchChapters: vi.fn(),
    fetchVerses: vi.fn(),
  };
});

describe("QAPostForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("必須入力がそろうまで投稿ボタンを無効にする", () => {
    render(
      <QAPostForm
        catalog={[]}
        tags={[]}
        onSubmitted={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const submit = screen.getByRole("button", { name: "質問を投稿する" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("質問のタイトル（必須）"), { target: { value: "質問タイトル" } });
    fireEvent.change(screen.getByPlaceholderText("質問の詳細を入力..."), { target: { value: "質問本文" } });

    expect(submit).toBeEnabled();
  });

  it("タグ選択状態を aria-pressed に反映して投稿する", async () => {
    const { createComment } = await import("@/lib/api");
    vi.mocked(createComment).mockResolvedValue({ id: "c1" } as never);
    const onSubmitted = vi.fn();

    render(
      <QAPostForm
        catalog={[]}
        tags={[{ id: "tag1", name: "解説" }]}
        onSubmitted={onSubmitted}
        onCancel={vi.fn()}
      />
    );

    const tagButton = screen.getByRole("button", { name: "解説" });
    expect(tagButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(tagButton);
    expect(tagButton).toHaveAttribute("aria-pressed", "true");

    fireEvent.change(screen.getByPlaceholderText("質問のタイトル（必須）"), { target: { value: "質問タイトル" } });
    fireEvent.change(screen.getByPlaceholderText("質問の詳細を入力..."), { target: { value: "質問本文" } });
    fireEvent.click(screen.getByRole("button", { name: "質問を投稿する" }));

    await waitFor(() => {
      expect(createComment).toHaveBeenCalledWith({
        title: "質問タイトル",
        body: "質問本文",
        is_qa: true,
        tag_ids: ["tag1"],
      });
    });
    expect(onSubmitted).toHaveBeenCalled();
  });
});
