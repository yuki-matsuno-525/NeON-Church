import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ApiError,
  buildCommentTree,
  fetchBooks,
  createComment,
  deleteComment,
  upvoteComment,
  removeUpvote,
} from "./apiClient";
import type { Comment } from "./types";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function makeRes(status: number, body?: unknown): Response {
  const text = body !== undefined ? JSON.stringify(body) : "";
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "Error",
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(text),
  } as unknown as Response;
}

function make204(): Response {
  return {
    ok: true,
    status: 204,
    statusText: "No Content",
    json: vi.fn().mockRejectedValue(new Error("no body")),
    text: vi.fn().mockResolvedValue(""),
  } as unknown as Response;
}

function setCookie(value: string) {
  Object.defineProperty(document, "cookie", {
    value,
    writable: true,
    configurable: true,
  });
}

// ------------------------------------------------------------------
// ApiError
// ------------------------------------------------------------------
describe("ApiError", () => {
  it("status と message を保持し Error を継承する", () => {
    const err = new ApiError(404, "Not found");
    expect(err.status).toBe(404);
    expect(err.message).toBe("Not found");
    expect(err).toBeInstanceOf(Error);
  });
});

// ------------------------------------------------------------------
// buildCommentTree
// ------------------------------------------------------------------
describe("buildCommentTree", () => {
  const makeComment = (id: string, parent: string | null = null): Comment => ({
    id,
    user: { id: "u1", username: "alice" },
    verse: "v1",
    chapter: null,
    book: null,
    parent,
    body: "本文",
    is_qa: false,
    is_deleted: false,
    created_at: new Date().toISOString(),
    vote_count: 0,
    tags: [],
  });

  it("空配列 → []", () => {
    expect(buildCommentTree([])).toEqual([]);
  });

  it("親なしコメントはルートになる", () => {
    const roots = buildCommentTree([makeComment("c1"), makeComment("c2")]);
    expect(roots).toHaveLength(2);
    expect(roots.map((r) => r.id)).toEqual(["c1", "c2"]);
  });

  it("子コメントは親の children に入る", () => {
    const roots = buildCommentTree([makeComment("c1"), makeComment("c2", "c1")]);
    expect(roots).toHaveLength(1);
    expect(roots[0].children).toHaveLength(1);
    expect(roots[0].children[0].id).toBe("c2");
  });

  it("存在しない親を持つコメントはルートにも children にも含まれない", () => {
    const roots = buildCommentTree([makeComment("c2", "nonexistent")]);
    expect(roots).toHaveLength(0);
  });

  it("3段ネストが正しく構築される", () => {
    const roots = buildCommentTree([
      makeComment("c1"),
      makeComment("c2", "c1"),
      makeComment("c3", "c2"),
    ]);
    expect(roots[0].children[0].children[0].id).toBe("c3");
  });
});

// ------------------------------------------------------------------
// apiFetch (公開関数経由でテスト)
// ------------------------------------------------------------------
describe("apiFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCookie("");
  });

  it("成功時に JSON をパースして返す", async () => {
    mockFetch.mockResolvedValueOnce(makeRes(200, [{ id: "b1" }]));
    const books = await fetchBooks();
    expect(books).toEqual([{ id: "b1" }]);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/books/",
      expect.objectContaining({ credentials: "include" })
    );
  });

  it("204 応答は undefined を返す", async () => {
    mockFetch.mockResolvedValueOnce(make204());
    const result = await deleteComment("c1");
    expect(result).toBeUndefined();
  });

  it("空ボディ (200) は undefined を返す", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      text: vi.fn().mockResolvedValue(""),
    } as unknown as Response);
    const result = await upvoteComment("c1");
    expect(result).toBeUndefined();
  });

  it("4xx エラーは ApiError(status, detail) をスロー", async () => {
    mockFetch.mockResolvedValueOnce(makeRes(403, { detail: "Forbidden" }));
    const err = await fetchBooks().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(403);
    expect(err.message).toBe("Forbidden");
  });

  it("4xx エラーで detail なし → JSON 全体を message にする", async () => {
    mockFetch.mockResolvedValueOnce(makeRes(400, { error: "bad" }));
    const err = await fetchBooks().catch((e) => e);
    expect(err.message).toBe('{"error":"bad"}');
  });

  it("4xx エラーで JSON パース失敗 → statusText を message にする", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: vi.fn().mockRejectedValue(new Error("parse error")),
      text: vi.fn().mockResolvedValue(""),
    } as unknown as Response);
    const err = await fetchBooks().catch((e) => e);
    expect(err.status).toBe(500);
    expect(err.message).toBe("Internal Server Error");
  });

  it("401 → token refresh → リトライして成功", async () => {
    mockFetch
      .mockResolvedValueOnce(makeRes(401, {}))       // 初回 → 401
      .mockResolvedValueOnce(makeRes(200, undefined)) // refresh エンドポイント
      .mockResolvedValueOnce(makeRes(200, [{ id: "b1" }])); // リトライ → 成功

    const books = await fetchBooks();
    expect(books).toEqual([{ id: "b1" }]);
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch.mock.calls[1][0]).toContain("token/refresh");
  });

  it("401 + refresh 失敗 → ApiError(401) をスロー", async () => {
    mockFetch
      .mockResolvedValueOnce(makeRes(401, {})) // 初回 → 401
      .mockResolvedValueOnce(makeRes(401, {})); // refresh → 失敗

    const err = await fetchBooks().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("CSRF トークンが cookie にある → X-CSRFToken ヘッダーを付与", async () => {
    setCookie("csrftoken=mytoken123");
    mockFetch.mockResolvedValueOnce(makeRes(200, []));
    await fetchBooks();
    const [, init] = mockFetch.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({ "X-CSRFToken": "mytoken123" });
  });

  it("CSRF トークンなし → X-CSRFToken ヘッダーなし", async () => {
    mockFetch.mockResolvedValueOnce(makeRes(200, []));
    await fetchBooks();
    const [, init] = mockFetch.mock.calls[0];
    expect((init as RequestInit).headers).not.toHaveProperty("X-CSRFToken");
  });
});

// ------------------------------------------------------------------
// 複数同時 401 → refresh は1回だけ実行される
// ------------------------------------------------------------------
describe("同時 401 の deduplication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCookie("");
  });

  it("2 リクエストが同時に 401 を受けても refresh は1回だけ呼ばれる", async () => {
    mockFetch
      .mockResolvedValueOnce(makeRes(401, {}))        // req1 → 401
      .mockResolvedValueOnce(makeRes(401, {}))        // req2 → 401
      .mockResolvedValueOnce(makeRes(200, undefined)) // refresh (1回のみ)
      .mockResolvedValueOnce(makeRes(200, []))        // req1 retry
      .mockResolvedValueOnce(makeRes(200, []));       // req2 retry

    await Promise.all([fetchBooks(), fetchBooks()]);

    const refreshCalls = mockFetch.mock.calls.filter(([url]) =>
      (url as string).includes("token/refresh")
    );
    expect(refreshCalls).toHaveLength(1);
  });
});

// ------------------------------------------------------------------
// 代表的な API 関数
// ------------------------------------------------------------------
describe("個別 API 関数", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCookie("");
  });

  it("fetchBooks: translation パラメータが URL に付く", async () => {
    mockFetch.mockResolvedValueOnce(makeRes(200, []));
    await fetchBooks("KJV");
    expect(mockFetch.mock.calls[0][0]).toContain("translation=KJV");
  });

  it("fetchBooks: translation なしのとき ? が付かない", async () => {
    mockFetch.mockResolvedValueOnce(makeRes(200, []));
    await fetchBooks();
    expect(mockFetch.mock.calls[0][0]).toBe("/api/books/");
  });

  it("createComment: POST + 正しい JSON body", async () => {
    mockFetch.mockResolvedValueOnce(makeRes(201, { id: "c1", body: "本文" }));
    await createComment({ verse: "v1", body: "本文" });
    const [, init] = mockFetch.mock.calls[0];
    expect((init as RequestInit).method).toBe("POST");
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
      verse: "v1",
      body: "本文",
    });
  });

  it("upvoteComment: 正しい URL に POST", async () => {
    mockFetch.mockResolvedValueOnce(make204());
    await upvoteComment("c99");
    expect(mockFetch.mock.calls[0][0]).toContain("/comments/c99/upvote/");
    expect((mockFetch.mock.calls[0][1] as RequestInit).method).toBe("POST");
  });

  it("removeUpvote: 正しい URL に DELETE", async () => {
    mockFetch.mockResolvedValueOnce(make204());
    await removeUpvote("c99");
    expect(mockFetch.mock.calls[0][0]).toContain("/comments/c99/upvote/");
    expect((mockFetch.mock.calls[0][1] as RequestInit).method).toBe("DELETE");
  });

  it("deleteComment: 正しい URL に DELETE", async () => {
    mockFetch.mockResolvedValueOnce(make204());
    await deleteComment("c42");
    expect(mockFetch.mock.calls[0][0]).toContain("/comments/c42/");
    expect((mockFetch.mock.calls[0][1] as RequestInit).method).toBe("DELETE");
  });
});
