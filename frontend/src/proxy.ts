import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { toCookieHeader } from "@/lib/cookieHeader";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/** 期限がこの秒数より近ければ、画面を出す前に更新しておく。 */
const REFRESH_MARGIN_SECONDS = 60;

/**
 * ログイン用トークンの残り時間（秒）を読む。
 *
 * トークンは「ヘッダー.中身.署名」を . でつないだ形で、中身に期限（exp）が入っている。
 * ここでは中身を読むだけで、正しいトークンかどうかは確かめない。
 * 検証は Django 側が必ず行うので、ここで通してしまっても素通りにはならない。
 * 形が読めなければ「期限切れ扱い」にして更新を試みる。
 */
function secondsUntilExpiry(token: string): number {
  const payload = token.split(".")[1];
  if (!payload) return 0;
  try {
    const json = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    ) as { exp?: number };
    if (typeof json.exp !== "number") return 0;
    return json.exp - Math.floor(Date.now() / 1000);
  } catch {
    return 0;
  }
}

/**
 * ページを出す前に、ログイン用トークンの期限が近ければ先に更新しておく。
 *
 * なぜここでやるのか:
 * サーバー側で画面を組み立てるとき、Cookie は読めるが書けない。つまり画面を
 * 描いている最中に期限切れに気づいても、その場で新しいトークンを受け取れない。
 * ここ（proxy）は Cookie を書ける数少ない場所なので、画面が始まる前に済ませる。
 *
 * 失敗したときは何もしない。ここで Cookie を消すと、通信が一瞬途切れただけで
 * ログアウトさせてしまう。更新できなければ、これまでどおりブラウザ側が
 * 401 を受けて処理する。
 */
export async function proxy(request: NextRequest) {
  // 先読み（リンクにカーソルを載せた時などに裏で取りに行く分）では更新しない。
  // Django は更新のたびに古い合鍵を無効にするので、画面に反映されない先読みで
  // 更新してしまうと、ブラウザが持っている合鍵だけが使えなくなる。
  if (request.headers.get("next-router-prefetch") === "1") return NextResponse.next();
  if (request.headers.get("purpose") === "prefetch") return NextResponse.next();

  const refreshToken = request.cookies.get("refresh_token")?.value;
  if (!refreshToken) return NextResponse.next();

  const accessToken = request.cookies.get("access_token")?.value;
  // まだ十分に余裕があるなら、何もしないのが一番速い。
  if (accessToken && secondsUntilExpiry(accessToken) > REFRESH_MARGIN_SECONDS) {
    return NextResponse.next();
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/api/auth/token/refresh/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // HTTP-only Cookie はそのまま転送する。Django はこれを見て本人か判断する。
        cookie: request.headers.get("cookie") ?? "",
      },
      body: "{}",
    });
  } catch {
    return NextResponse.next();
  }

  if (!upstream.ok) return NextResponse.next();

  // Django が返した Set-Cookie を、そのままブラウザへ渡す。
  // 新しいトークンは、この直後に始まる画面の組み立てからも読める。
  const setCookies = upstream.headers.getSetCookie();
  if (setCookies.length === 0) return NextResponse.next();

  const response = NextResponse.next({
    request: { headers: rewriteRequestCookies(request, setCookies) },
  });
  for (const cookie of setCookies) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}

/**
 * この先の画面が読む Cookie も新しいものに差し替える。
 * ブラウザに返すだけでは、いま組み立てている画面は古いトークンを見てしまう。
 */
function rewriteRequestCookies(request: NextRequest, setCookies: string[]): Headers {
  const headers = new Headers(request.headers);
  const jar = new Map<string, string>();
  for (const cookie of request.cookies.getAll()) jar.set(cookie.name, cookie.value);
  for (const raw of setCookies) {
    const [pair] = raw.split(";");
    const index = pair.indexOf("=");
    if (index > 0) jar.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
  }
  headers.set("cookie", toCookieHeader(Array.from(jar, ([name, value]) => ({ name, value }))));
  return headers;
}

export const config = {
  // 画面の表示だけを対象にする。/api は Django へそのまま流すので触らない。
  // 画像やアイコン、Next.js が配る静的ファイルも対象外。
  matcher: [
    "/((?!api|_next/static|_next/image|img|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
