// @vitest-environment node
// サーバー側だけで動くので node で試す。
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const cookieStore = { getAll: vi.fn(), get: vi.fn() };
vi.mock("next/headers", () => ({ cookies: () => Promise.resolve(cookieStore) }));
vi.mock("./serverLanguage", () => ({ getRequestLanguage: () => Promise.resolve("ja") }));

const { serverFetch, serverFetchPage, serverIsSignedIn } = await import("./apiServer");
const { ApiError } = await import("./apiClient");

describe("serverFetch", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    cookieStore.getAll.mockReturnValue([
      { name: "access_token", value: "a" },
      { name: "neon_lang", value: "ja" },
    ]);
    cookieStore.get.mockReturnValue({ value: "a" });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("ブラウザの Cookie をそのまま Django へ転送する", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await serverFetch("/articles/");

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).cookie).toBe("access_token=a; neon_lang=ja");
    expect(init.cache).toBe("no-store");
  });

  it("失敗は ApiError にして投げ、区画のエラー表示に任せる", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("nope", { status: 500 }));

    await expect(serverFetch("/articles/")).rejects.toBeInstanceOf(ApiError);
  });

  it("一覧は続きがあるかどうかを添えて返す", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ results: [1, 2], count: 5, next: "?page=2" }), { status: 200 })
    );

    expect(await serverFetchPage("/articles/")).toEqual({ results: [1, 2], count: 5, hasMore: true });
  });

  it("ログインしていなければ signed in ではない", async () => {
    cookieStore.get.mockReturnValue(undefined);
    expect(await serverIsSignedIn()).toBe(false);
  });
});
