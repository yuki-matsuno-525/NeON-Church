import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useComments } from "./useComments";
import type { Comment, ListPage } from "@/lib/api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, fetchCommentPage: vi.fn() };
});

const makeComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: "c1",
  user: { id: "u1", username: "alice" },
  translation_project: null,
  version_label: "口語訳",
  parent: null,
  body: "テストコメント",
  is_deleted: false,
  created_at: new Date().toISOString(),
  vote_count: 0,
  reply_count: 0,
  tags: [],
  ...overrides,
});

const makePage = (
  results: Comment[],
  overrides: Partial<ListPage<Comment>> = {}
): ListPage<Comment> => ({
  results, count: results.length, hasMore: false, counts: undefined, ...overrides,
});

describe("useComments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("初期状態: loading=true, comments=[]", async () => {
    const { fetchCommentPage } = await import("@/lib/api");
    vi.mocked(fetchCommentPage).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useComments({ verse_id: "v1" }));
    expect(result.current.loading).toBe(true);
    expect(result.current.comments).toEqual([]);
  });

  it("成功時: comments がセットされ loading=false", async () => {
    const { fetchCommentPage } = await import("@/lib/api");
    const comments = [makeComment()];
    vi.mocked(fetchCommentPage).mockResolvedValue(makePage(comments));

    const { result } = renderHook(() => useComments({ verse_id: "v1" }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.comments).toEqual(comments);
  });

  it("失敗時: comments=[] で loading=false", async () => {
    const { fetchCommentPage } = await import("@/lib/api");
    vi.mocked(fetchCommentPage).mockRejectedValue(new Error("Network Error"));

    const { result } = renderHook(() => useComments({ verse_id: "v1" }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.comments).toEqual([]);
  });

  it("verse_id が渡される", async () => {
    const { fetchCommentPage } = await import("@/lib/api");
    vi.mocked(fetchCommentPage).mockResolvedValue(makePage([]));

    renderHook(() => useComments({ verse_id: "verse-abc" }));

    await waitFor(() => expect(fetchCommentPage).toHaveBeenCalledWith(
      expect.objectContaining({ verse_id: "verse-abc", page: 1 })
    ));
  });

  it("reload() を呼ぶと再フェッチされる", async () => {
    const { fetchCommentPage } = await import("@/lib/api");
    vi.mocked(fetchCommentPage).mockResolvedValue(makePage([]));

    const { result } = renderHook(() => useComments({ verse_id: "v1" }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.reload());
    await waitFor(() => expect(fetchCommentPage).toHaveBeenCalledTimes(2));
  });

  it("setComments で直接 comments を更新できる", async () => {
    const { fetchCommentPage } = await import("@/lib/api");
    vi.mocked(fetchCommentPage).mockResolvedValue(makePage([]));

    const { result } = renderHook(() => useComments({ verse_id: "v1" }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const newComments = [makeComment({ id: "c2" })];
    act(() => result.current.setComments(newComments));
    await waitFor(() => expect(result.current.comments).toEqual(newComments));
  });

  // ------------------------------------------------------------------
  // もっと見る
  // ------------------------------------------------------------------
  it("loadMore で次のページを足す（前のページは消えない）", async () => {
    const { fetchCommentPage } = await import("@/lib/api");
    vi.mocked(fetchCommentPage)
      .mockResolvedValueOnce(makePage([makeComment({ id: "c1" })], { hasMore: true }))
      .mockResolvedValueOnce(makePage([makeComment({ id: "c2" })]));

    const { result } = renderHook(() => useComments({ verse_id: "v1" }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasMore).toBe(true);

    await act(async () => { await result.current.loadMore(); });

    await waitFor(() => expect(result.current.comments.map((c) => c.id)).toEqual(["c1", "c2"]));
    expect(result.current.hasMore).toBe(false);
    expect(fetchCommentPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
  });
});
