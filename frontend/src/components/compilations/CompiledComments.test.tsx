import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CompiledComments } from "./CompiledComments";
import { createCompiledComment, fetchCompiledComments, type CompiledComment } from "@/lib/api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchCompiledComments: vi.fn(),
    createCompiledComment: vi.fn(),
  };
});

const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const makeComment = (body: string): CompiledComment => ({
  id: "cc1",
  user: { id: "u1", username: "reader" },
  book: "book1",
  chapter: null,
  verse: null,
  parent: null,
  body,
  is_deleted: false,
  created_at: "2026-07-16T00:00:00Z",
});

describe("CompiledComments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "reader" } });
    vi.mocked(fetchCompiledComments).mockResolvedValue([]);
  });

  it("loads comments for the target", async () => {
    vi.mocked(fetchCompiledComments).mockResolvedValue([makeComment("Book comment")]);

    render(<CompiledComments target={{ kind: "book", id: "book1" }} title="書へのコメント" />);

    expect(await screen.findByText("Book comment")).toBeInTheDocument();
    expect(fetchCompiledComments).toHaveBeenCalledWith({ book: "book1" });
  });

  it("posts a new comment", async () => {
    vi.mocked(createCompiledComment).mockResolvedValue(makeComment("New thought"));

    render(<CompiledComments target={{ kind: "book", id: "book1" }} title="書へのコメント" />);

    fireEvent.change(screen.getByPlaceholderText("コメントを書く..."), {
      target: { value: "New thought" },
    });
    fireEvent.click(screen.getByRole("button", { name: "投稿" }));

    await waitFor(() =>
      expect(createCompiledComment).toHaveBeenCalledWith({ book: "book1", body: "New thought" })
    );
    expect(await screen.findByText("New thought")).toBeInTheDocument();
  });

  it("shows login guidance when signed out", async () => {
    mockUseAuth.mockReturnValue({ user: null });

    render(<CompiledComments target={{ kind: "verse", id: "verse1" }} title="節へのコメント" />);

    expect(await screen.findByText("ログインするとコメントできます。")).toBeInTheDocument();
  });
});
