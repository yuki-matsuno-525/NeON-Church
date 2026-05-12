import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useComments } from "./useComments";
import type { Comment } from "@/lib/api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, fetchComments: vi.fn() };
});

const makeComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: "c1",
  user: { id: "u1", username: "alice" },
  verse: "v1",
  chapter: null,
  book: null,
  parent: null,
  body: "テストコメント",
  is_qa: false,
  is_deleted: false,
  created_at: new Date().toISOString(),
  vote_count: 0,
  tags: [],
  ...overrides,
});

describe("useComments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("初期状態: loading=true, comments=[]", async () => {
    const { fetchComments } = await import("@/lib/api");
    vi.mocked(fetchComments).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useComments({ verse_id: "v1" }));
    expect(result.current.loading).toBe(true);
    expect(result.current.comments).toEqual([]);
  });

  it("fetchComments 成功時: comments がセットされ loading=false", async () => {
    const { fetchComments } = await import("@/lib/api");
    const comments = [makeComment()];
    vi.mocked(fetchComments).mockResolvedValue(comments);

    const { result } = renderHook(() => useComments({ verse_id: "v1" }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.comments).toEqual(comments);
  });

  it("fetchComments 失敗時: comments=[] で loading=false", async () => {
    const { fetchComments } = await import("@/lib/api");
    vi.mocked(fetchComments).mockRejectedValue(new Error("Network Error"));

    const { result } = renderHook(() => useComments({ verse_id: "v1" }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.comments).toEqual([]);
  });

  it("fetchComments に verse_id が渡される", async () => {
    const { fetchComments } = await import("@/lib/api");
    vi.mocked(fetchComments).mockResolvedValue([]);

    renderHook(() => useComments({ verse_id: "verse-abc" }));

    await waitFor(() => expect(fetchComments).toHaveBeenCalledWith(
      expect.objectContaining({ verse_id: "verse-abc" })
    ));
  });

  it("reload() を呼ぶと再フェッチされる", async () => {
    const { fetchComments } = await import("@/lib/api");
    vi.mocked(fetchComments).mockResolvedValue([]);

    const { result } = renderHook(() => useComments({ verse_id: "v1" }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    result.current.reload();
    await waitFor(() => expect(fetchComments).toHaveBeenCalledTimes(2));
  });

  it("setComments で直接 comments を更新できる", async () => {
    const { fetchComments } = await import("@/lib/api");
    vi.mocked(fetchComments).mockResolvedValue([]);

    const { result } = renderHook(() => useComments({ verse_id: "v1" }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const newComments = [makeComment({ id: "c2" })];
    result.current.setComments(newComments);
    await waitFor(() => expect(result.current.comments).toEqual(newComments));
  });
});
