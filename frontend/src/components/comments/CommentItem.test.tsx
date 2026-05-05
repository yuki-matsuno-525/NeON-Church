import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CommentItem } from "./CommentItem";
import type { CommentNode } from "@/lib/api";

// next/link をシンプルな <a> にスタブ
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// api モジュールをモック
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    formatRelativeTime: () => "たった今",
    deleteComment: vi.fn().mockResolvedValue(undefined),
    upvoteComment: vi.fn().mockResolvedValue(undefined),
    removeUpvote: vi.fn().mockResolvedValue(undefined),
  };
});

// AuthContext をモック
const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const makeComment = (overrides: Partial<CommentNode> = {}): CommentNode => ({
  id: "c1",
  user: { id: "u1", username: "alice" },
  verse: "v1",
  chapter: null,
  book: null,
  parent: null,
  body: "テストコメント本文",
  is_deleted: false,
  created_at: new Date().toISOString(),
  vote_count: 3,
  children: [],
  ...overrides,
});

describe("CommentItem", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null });
  });

  it("コメント本文・ユーザー名・投票数を表示する", () => {
    render(<CommentItem comment={makeComment()} />);
    expect(screen.getByText("テストコメント本文")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText(/▲\s*3/)).toBeInTheDocument();
  });

  it("アバターにユーザー名の頭文字を表示する", () => {
    render(<CommentItem comment={makeComment()} />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("未ログインのとき削除ボタンが表示されない", () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<CommentItem comment={makeComment()} />);
    expect(screen.queryByTestId("delete-comment")).not.toBeInTheDocument();
  });

  it("自分のコメントに削除ボタンが表示される", () => {
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" } });
    render(<CommentItem comment={makeComment()} />);
    expect(screen.getByTestId("delete-comment")).toBeInTheDocument();
  });

  it("他人のコメントに削除ボタンが表示されない", () => {
    mockUseAuth.mockReturnValue({ user: { id: "u2", username: "bob" } });
    render(<CommentItem comment={makeComment()} />);
    expect(screen.queryByTestId("delete-comment")).not.toBeInTheDocument();
  });

  it("削除済みコメントに削除ボタンが表示されない", () => {
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" } });
    render(<CommentItem comment={makeComment({ is_deleted: true })} />);
    expect(screen.queryByTestId("delete-comment")).not.toBeInTheDocument();
  });

  it("削除ボタン押下でonRefreshが呼ばれる", async () => {
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" } });
    const onRefresh = vi.fn();
    render(<CommentItem comment={makeComment()} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByTestId("delete-comment"));
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
  });

  it("未ログインのとき投票ボタンがdisabled", () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<CommentItem comment={makeComment()} />);
    expect(screen.getByRole("button", { name: /▲/ })).toBeDisabled();
  });

  it("onReplyがあるとき返信ボタンが表示される", () => {
    mockUseAuth.mockReturnValue({ user: { id: "u2", username: "bob" } });
    const onReply = vi.fn();
    render(<CommentItem comment={makeComment()} onReply={onReply} />);
    expect(screen.getByRole("button", { name: "返信" })).toBeInTheDocument();
  });

  it("削除済みコメントには返信ボタンが表示されない", () => {
    mockUseAuth.mockReturnValue({ user: { id: "u2", username: "bob" } });
    const onReply = vi.fn();
    render(
      <CommentItem comment={makeComment({ is_deleted: true })} onReply={onReply} />
    );
    expect(screen.queryByRole("button", { name: "返信" })).not.toBeInTheDocument();
  });

  it("返信ボタン押下で返信フォームが表示される", () => {
    mockUseAuth.mockReturnValue({ user: { id: "u2", username: "bob" } });
    const onReply = vi.fn();
    render(<CommentItem comment={makeComment()} onReply={onReply} />);
    fireEvent.click(screen.getByRole("button", { name: "返信" }));
    expect(screen.getByPlaceholderText("返信を入力...")).toBeInTheDocument();
  });

  it("depth >= 2 のとき返信ボタンが表示されない", () => {
    mockUseAuth.mockReturnValue({ user: { id: "u2", username: "bob" } });
    const onReply = vi.fn();
    render(<CommentItem comment={makeComment()} onReply={onReply} depth={2} />);
    expect(screen.queryByRole("button", { name: "返信" })).not.toBeInTheDocument();
  });
});
