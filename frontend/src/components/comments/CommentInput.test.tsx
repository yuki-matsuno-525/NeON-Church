import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CommentInput } from "./CommentInput";

const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, fetchTags: vi.fn().mockResolvedValue([]) };
});

describe("CommentInput", () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" } });
  });

  it("未ログイン時はログインリンクを表示する", () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<CommentInput onSubmit={mockOnSubmit} />);
    const link = screen.getByRole("link", { name: "ログイン" });
    expect(link.getAttribute("href")).toMatch(/^\/login\?from=/);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("ログイン時はテキストエリアと投稿ボタンを表示する", () => {
    render(<CommentInput onSubmit={mockOnSubmit} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "投稿する" })).toBeInTheDocument();
  });

  it("カスタム submitLabel を表示する", () => {
    render(<CommentInput onSubmit={mockOnSubmit} submitLabel="返信する" />);
    expect(screen.getByRole("button", { name: "返信する" })).toBeInTheDocument();
  });

  it("空のまま投稿すると、本文が要ることを伝える", async () => {
    render(<CommentInput onSubmit={mockOnSubmit} />);
    // ボタンは押せる。押せなくすると「なぜ押せないのか」が伝わらない。
    const submit = screen.getByRole("button", { name: "投稿する" });
    expect(submit).toBeEnabled();

    fireEvent.click(submit);
    expect(await screen.findByRole("alert")).toHaveTextContent("本文を入力してください。");
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("Q&A のタイトルが空のときは、タイトルも名指しする", async () => {
    render(<CommentInput onSubmit={mockOnSubmit} showQaOption />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "投稿する" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("タイトル・本文を入力してください。");
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("投稿成功時に onSubmit が呼ばれてフォームがリセットされる", async () => {
    mockOnSubmit.mockResolvedValue(undefined);
    render(<CommentInput onSubmit={mockOnSubmit} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "テストコメント" } });
    fireEvent.click(screen.getByRole("button", { name: "投稿する" }));

    await waitFor(() => expect(mockOnSubmit).toHaveBeenCalledWith("テストコメント", undefined, undefined, undefined));
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("投稿失敗時にエラーメッセージを表示する", async () => {
    mockOnSubmit.mockRejectedValue(new Error("投稿エラー"));
    render(<CommentInput onSubmit={mockOnSubmit} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "テストコメント" } });
    fireEvent.click(screen.getByRole("button", { name: "投稿する" }));

    await waitFor(() => expect(screen.getByText("投稿エラー")).toBeInTheDocument());
  });

  it("投稿中はボタンが「投稿中...」になる", async () => {
    mockOnSubmit.mockReturnValue(new Promise(() => {}));
    render(<CommentInput onSubmit={mockOnSubmit} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "テスト" } });
    fireEvent.click(screen.getByRole("button", { name: "投稿する" }));

    expect(await screen.findByRole("button", { name: "投稿中..." })).toBeDisabled();
  });

  it("showQaOption=true のとき Q&A チェックボックスが表示される", () => {
    render(<CommentInput onSubmit={mockOnSubmit} showQaOption />);
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(screen.getByText("Q&A")).toBeInTheDocument();
  });

  it("showQaOption=false のとき Q&A チェックボックスが表示されない", () => {
    render(<CommentInput onSubmit={mockOnSubmit} />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("空白のみのボディは送信されない", async () => {
    render(<CommentInput onSubmit={mockOnSubmit} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "投稿する" }));

    await waitFor(() => expect(mockOnSubmit).not.toHaveBeenCalled());
  });
});
