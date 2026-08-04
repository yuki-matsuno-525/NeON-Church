// @vitest-environment node
// proxy はサーバー側だけで動くので、ブラウザを模した環境ではなく node で試す。
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

/** exp（期限）だけを持つ、形だけのトークンを作る。署名は見ないので不要。 */
function tokenExpiringIn(seconds: number): string {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds })).toString("base64url");
  return `header.${payload}.signature`;
}

function makeRequest(cookies: Record<string, string>, headers: Record<string, string> = {}) {
  const request = new NextRequest("http://localhost:3000/articles", { headers });
  for (const [name, value] of Object.entries(cookies)) request.cookies.set(name, value);
  return request;
}

function refreshResponse(setCookies: string[]) {
  const headers = new Headers();
  for (const cookie of setCookies) headers.append("set-cookie", cookie);
  return new Response("{}", { status: 200, headers });
}

describe("proxy（画面を出す前のトークン更新）", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ログインしていなければ何もしない", async () => {
    await proxy(makeRequest({}));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("期限にまだ余裕があれば更新しない", async () => {
    await proxy(makeRequest({ refresh_token: "r", access_token: tokenExpiringIn(600) }));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("期限が近ければ更新し、新しい Cookie をブラウザへ渡す", async () => {
    vi.mocked(fetch).mockResolvedValue(
      refreshResponse(["access_token=new; HttpOnly; Path=/", "refresh_token=newr; HttpOnly; Path=/"])
    );

    const response = await proxy(makeRequest({ refresh_token: "r", access_token: tokenExpiringIn(5) }));

    expect(fetch).toHaveBeenCalledOnce();
    expect(response.headers.getSetCookie()).toEqual([
      "access_token=new; HttpOnly; Path=/",
      "refresh_token=newr; HttpOnly; Path=/",
    ]);
  });

  it("アクセス用トークンが無くても、合鍵があれば更新する", async () => {
    vi.mocked(fetch).mockResolvedValue(refreshResponse(["access_token=new; Path=/"]));

    await proxy(makeRequest({ refresh_token: "r" }));

    expect(fetch).toHaveBeenCalledOnce();
  });

  it("先読みでは更新しない（合鍵を使い捨てにしないため）", async () => {
    await proxy(
      makeRequest({ refresh_token: "r", access_token: tokenExpiringIn(5) }, { "next-router-prefetch": "1" })
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("更新に失敗してもログアウトさせない", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network Error"));

    const response = await proxy(makeRequest({ refresh_token: "r", access_token: tokenExpiringIn(5) }));

    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("更新が拒否されたときも Cookie は消さない", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 401 }));

    const response = await proxy(makeRequest({ refresh_token: "r", access_token: tokenExpiringIn(5) }));

    expect(response.headers.getSetCookie()).toEqual([]);
  });
});
