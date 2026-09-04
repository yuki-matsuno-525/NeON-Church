import "server-only";

import { cookies } from "next/headers";
import { ApiError, extractErrorCode, type ListPage } from "./apiClient";
import { toCookieHeader } from "./cookieHeader";
import { getRequestLanguage } from "./serverLanguage";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/**
 * サーバー側（画面を組み立てる最中）から Django を呼ぶための入口。
 *
 * ブラウザ側の apiClient と役割は同じだが、次の 2 点が違う:
 *
 * 1. Cookie を自分で持ち回る。サーバーには「ログイン中のブラウザ」が無いので、
 *    受け取ったリクエストの Cookie をそのまま転送する。
 * 2. 期限切れの更新をしない。サーバー側は Cookie を書けないため、ここで
 *    更新しても新しいトークンを誰にも渡せない。更新は画面が始まる前に
 *    proxy.ts が済ませてある。
 *
 * 失敗したときは apiClient と同じ ApiError を投げる。区画ごとの error.tsx が
 * 受け止めて「読み込めませんでした」を出す。
 */
export async function serverFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const jar = await cookies();
  const cookieHeader = toCookieHeader(jar.getAll());

  const res = await fetch(`${API_BASE_URL}/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": await getRequestLanguage(),
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...init?.headers,
    },
    // 人によって中身が変わるので、取り置きはしない。
    cache: "no-store",
    ...init,
  });

  if (!res.ok) {
    // サーバーが理由を機械可読に添えていれば拾う（「その訳に書が無い」「章が無い」など）。
    let code: string | undefined;
    try {
      code = extractErrorCode(await res.json());
    } catch {
      // 本文が JSON でないことはある。その場合は code 無しで扱う。
    }
    throw new ApiError(res.status, `Request failed: ${path}`, code);
  }
  return (await res.json()) as T;
}

/**
 * 誰が見ても同じ中身（聖書の本文まわり）をサーバー側から取る。
 *
 * serverFetch との違いは2つ。Cookie を送らないことと、取り置きをすること。
 * ログイン状態で答えが変わらないものに限って使う。Cookie を送ると人ごとに
 * 別の取り置きになってしまうので、あえて外している。
 */
export async function serverFetchPublic<T>(path: string, revalidateSeconds: number): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": await getRequestLanguage(),
    },
    cache: "force-cache",
    next: { revalidate: revalidateSeconds },
  });

  if (!res.ok) throw new ApiError(res.status, `Request failed: ${path}`);
  return (await res.json()) as T;
}

type Paginated<T> = { results: T[]; count: number; next: string | null };

/**
 * 一覧の 1 ページ目だけをサーバー側で取る。続きはブラウザ側が読み足す。
 *
 * 戻りの形はブラウザ側の ListPage と同じにしてある。そのまま
 * useLoadMore の initial に渡せるようにするため。
 */
export async function serverFetchPage<T, C = undefined>(path: string): Promise<ListPage<T, C>> {
  const data = await serverFetch<Paginated<T> & { counts?: C }>(path);
  return {
    results: data.results,
    count: data.count,
    hasMore: data.next !== null,
    counts: data.counts as C,
  };
}

/** ページ分けされていない一覧（タグなど）をサーバー側で取る。 */
export async function serverFetchList<T>(path: string): Promise<T[]> {
  const data = await serverFetch<Paginated<T> | T[]>(path);
  return Array.isArray(data) ? data : data.results;
}

// ページを辿る回数の上限。壊れた next が返ってきても止まらなくならないようにする。
const MAX_PAGES = 20;

/**
 * ページ分けされた一覧を、最後まで辿って取り切る。
 * 本棚のように「全部そろっていないと絞り込めない」ものだけに使う。
 */
export async function serverFetchAll<T>(path: string): Promise<T[]> {
  const separator = path.includes("?") ? "&" : "?";
  const all: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const data = await serverFetch<Paginated<T> | T[]>(`${path}${separator}page=${page}&page_size=100`);
    // ページ分けされていない一覧は配列がそのまま返る。
    if (Array.isArray(data)) return data;
    all.push(...data.results);
    if (!data.next) break;
  }
  return all;
}

/** ログインしているかどうかだけを、サーバー側で確かめる。 */
export async function serverIsSignedIn(): Promise<boolean> {
  return Boolean((await cookies()).get("access_token")?.value);
}
