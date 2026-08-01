import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { CommentItem } from "./CommentItem";
import type { Comment } from "@/lib/api";

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
    fetchCommentReplies: vi.fn().mockResolvedValue([]),
  };
});

// AuthContext をモック
const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const makeComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: "c1",
  user: { id: "u1", username: "alice" },
  translation_project: null,
  version_label: "新共同訳",
  parent: null,
  body: "テストコメント本文",
  is_qa: false,
  is_deleted: false,
  created_at: new Date().toISOString(),
  vote_count: 3,
  // 返信は持たず件数だけ。開いたときに fetchCommentReplies で取りに行く。
  reply_count: 0,
  tags: [],
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

  it("削除は確認してから消す", async () => {
    // 削除は取り消せないので、押しただけでは消さず一度確認する。
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" } });
    const onRefresh = vi.fn();
    render(<CommentItem comment={makeComment()} onRefresh={onRefresh} />);

    fireEvent.click(screen.getByTestId("delete-comment"));
    expect(onRefresh).not.toHaveBeenCalled();

    // 「削除」は一覧側のボタンと確認ダイアログの実行ボタンの2つあるので、ダイアログ内から選ぶ。
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "削除" }));
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
  });

  it("確認をやめれば消さない", async () => {
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" } });
    const onRefresh = vi.fn();
    render(<CommentItem comment={makeComment()} onRefresh={onRefresh} />);

    fireEvent.click(screen.getByTestId("delete-comment"));
    fireEvent.click(await screen.findByRole("button", { name: "キャンセル" }));

    expect(screen.queryByText("このコメントを削除しますか？")).not.toBeInTheDocument();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("未ログインのとき投票ボタンがdisabled", () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<CommentItem comment={makeComment()} />);
    expect(screen.getByRole("button", { name: /承認/ })).toBeDisabled();
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

// ------------------------------------------------------------------
// 返信は親を開いたときに取る
//
// 以前は親と返信をまとめて受け取って画面側で組み直していたため、ページで区切ると
// 親と返信が別ページに分かれ、親が見つからない返信が何も言わずに消えていた。
// ------------------------------------------------------------------
describe("CommentItem の返信", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null });
  });

  const makeReply = (id: string, body: string): Comment =>
    makeComment({ id, body, parent: "c1", reply_count: 0 });

  it("返信が無いときは「返信を表示」を出さない", () => {
    render(<CommentItem comment={makeComment({ reply_count: 0 })} />);
    expect(screen.queryByRole("button", { name: /返信を表示/ })).not.toBeInTheDocument();
  });

  it("返信の件数を先に出し、最初は取りに行かない", async () => {
    const { fetchCommentReplies } = await import("@/lib/api");
    render(<CommentItem comment={makeComment({ reply_count: 2 })} />);

    expect(screen.getByRole("button", { name: "返信を表示（2件）" })).toBeInTheDocument();
    expect(fetchCommentReplies).not.toHaveBeenCalled();
  });

  it("押すと返信を取って表示する", async () => {
    const { fetchCommentReplies } = await import("@/lib/api");
    vi.mocked(fetchCommentReplies).mockResolvedValue([
      makeReply("r1", "ひとつめの返信"),
      makeReply("r2", "ふたつめの返信"),
    ]);

    render(<CommentItem comment={makeComment({ reply_count: 2 })} />);
    fireEvent.click(screen.getByRole("button", { name: "返信を表示（2件）" }));

    await screen.findByText("ひとつめの返信");
    expect(screen.getByText("ふたつめの返信")).toBeInTheDocument();
    expect(fetchCommentReplies).toHaveBeenCalledWith("c1");
  });

  it("2回目の開閉では取り直さない", async () => {
    const { fetchCommentReplies } = await import("@/lib/api");
    vi.mocked(fetchCommentReplies).mockResolvedValue([makeReply("r1", "返信本文")]);

    render(<CommentItem comment={makeComment({ reply_count: 1 })} />);
    fireEvent.click(screen.getByRole("button", { name: "返信を表示（1件）" }));
    await screen.findByText("返信本文");

    // 折りたたみトグルで閉じて開く
    fireEvent.click(screen.getByRole("button", { name: "折り畳む" }));
    await waitFor(() => expect(fetchCommentReplies).toHaveBeenCalledTimes(1));
  });

  it("返信の取得に失敗しても本体は消えない", async () => {
    const { fetchCommentReplies } = await import("@/lib/api");
    vi.mocked(fetchCommentReplies).mockRejectedValue(new Error("Network Error"));

    render(<CommentItem comment={makeComment({ reply_count: 1 })} />);
    fireEvent.click(screen.getByRole("button", { name: "返信を表示（1件）" }));

    await waitFor(() => expect(fetchCommentReplies).toHaveBeenCalled());
    expect(screen.getByText("テストコメント本文")).toBeInTheDocument();
  });
});
