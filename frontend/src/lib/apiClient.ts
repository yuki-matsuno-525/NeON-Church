import type {
  Book,
  Chapter,
  Verse,
  Comment,
  Bookmark,
  Notification,
  User,
  Tag,
  VerseOfDay,
  MyComment,
  ReadingProgress,
  QAComment,
  TranslationLanguage,
  TranslationProject,
  TranslationMembership,
  TranslationUnit,
  TranslationComment,
  SearchResult,
  PublicUser,
  Article,
  ArticleComment,
  ArticleTag,
  ArticleVisibility,
} from "./types";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// DRF 等のエラーレスポンスから人間可読な1行を取り出す。
// 想定形: { detail: "..." } | { field: ["msg1", "msg2"], ... } | "string" | ["msg"]
function extractErrorMessage(body: unknown): string | null {
  if (body == null) return null;
  if (typeof body === "string") return body;
  if (Array.isArray(body)) {
    for (const item of body) {
      const msg = extractErrorMessage(item);
      if (msg) return msg;
    }
    return null;
  }
  if (typeof body === "object") {
    const obj = body as Record<string, unknown>;
    if (typeof obj.detail === "string") return obj.detail;
    for (const value of Object.values(obj)) {
      const msg = extractErrorMessage(value);
      if (msg) return msg;
    }
  }
  return null;
}

// 常に相対パスで Next.js rewrites を経由する（クロスドメイン Cookie 問題を回避）
const API_BASE = "";

function getCsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

// 認証不要／401 が通常の入力エラーとして起こり得るパス。ここでの 401 は
// 「セッション切れ」として扱わない（refresh もしない）。
const AUTH_EXEMPT_PATH = /^\/auth\/(login|register|logout|token\/refresh)\b/;

// セッション切れ通知の多重発火を防ぐフラグ。認証済みリクエストが 401 かつ refresh も
// 失敗したとき一度だけ window イベントを発火する。成功レスポンスで false に戻す。
let sessionExpiredEmitted = false;

function notifySessionExpired(): void {
  if (sessionExpiredEmitted || typeof window === "undefined") return;
  sessionExpiredEmitted = true;
  window.dispatchEvent(new CustomEvent("auth:session-expired"));
}

// 複数リクエストが同時に 401 を受けても refresh は1回だけ実行する
let refreshPromise: Promise<void> | null = null;

async function doRefresh(): Promise<void> {
  const csrfToken = getCsrfToken();
  const res = await fetch(`${API_BASE}/api/auth/token/refresh/`, {
    method: "POST",
    credentials: "include",
    headers: csrfToken ? { "X-CSRFToken": csrfToken } : {},
  });
  if (!res.ok) throw new ApiError(res.status, "Token refresh failed");
}

function refreshToken(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// バックエンドのページネーション付きレスポンス形式。
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * 「もっと見る」で読み足す一覧の1ページ分。
 *
 * next の URL をそのまま持ち回らず「まだ続きがあるか（hasMore）」に畳んで返す。
 * counts は種類ごとのタブに出す件数で、対応するエンドポイントだけが返す。
 */
export interface ListPage<T, C = undefined> {
  results: T[];
  /** 絞り込み後の総件数 */
  count: number;
  /** 「もっと見る」を出すかどうか */
  hasMore: boolean;
  counts: C;
}

async function apiFetchPage<T, C = undefined>(path: string): Promise<ListPage<T, C>> {
  const data = await apiFetch<PaginatedResponse<T> & { counts?: C }>(path);
  return {
    results: data.results,
    count: data.count,
    hasMore: data.next !== null,
    counts: data.counts as C,
  };
}

// 取り切りの上限。1ページ100件なので 100 ページ＝10000 件。
// サーバーが next を返し続ける不具合が起きても無限ループにならないようにするための保険。
const MAX_PAGES = 100;

/**
 * 全ページを辿って取り切る。
 *
 * 「この節に栞が付いているか」の判定のように、一部だけでは正しく判断できない用途に限って使う。
 * 画面に並べる一覧では使わないこと（件数が増えるほど遅くなる）。そちらは apiFetchPage を使い、
 * 「もっと見る」で読み足す。
 */
async function apiFetchAll<T>(path: string): Promise<T[]> {
  const separator = path.includes("?") ? "&" : "?";
  const all: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const data = await apiFetch<PaginatedResponse<T> | T[]>(
      `${path}${separator}page=${page}&page_size=100`
    );
    // paginate されていないエンドポイント（タグ等）は配列を直接返す
    if (Array.isArray(data)) return data;
    all.push(...data.results);
    if (!data.next) break;
  }
  return all;
}

async function apiFetchList<T>(path: string): Promise<T[]> {
  const data = await apiFetch<PaginatedResponse<T> | T[]>(path);
  // paginate されていないエンドポイント（タグ等）は配列を直接返す
  if (Array.isArray(data)) return data;
  return data.results;
}

async function apiFetch<T>(path: string, init?: RequestInit, isRetry = false): Promise<T> {
  const csrfToken = getCsrfToken();
  const res = await fetch(`${API_BASE}/api${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
      ...init?.headers,
    },
    ...init,
  });

  // 認証済みリクエストが 401 → refresh を1回試す。失敗したらセッション切れとして通知する。
  // ログイン/登録などの auth 系パスは通常の 401（入力エラー等）なので巻き込まない。
  if (res.status === 401 && !isRetry && !AUTH_EXEMPT_PATH.test(path)) {
    try {
      await refreshToken();
    } catch {
      notifySessionExpired();
      throw new ApiError(401, "Unauthorized");
    }
    return apiFetch<T>(path, init, true);
  }

  if (res.ok) {
    // セッションが生きていることが確認できたので次の切れを再び通知できるようにする。
    sessionExpiredEmitted = false;
  }

  if (!res.ok) {
    let message: string;
    if (res.status >= 500) {
      // 5xx ではサーバー由来の詳細をユーザーに見せず、汎用文言に固定する。
      // 実際のエラー詳細は Sentry / バックエンドログから追える。
      message = "予期しないエラーが発生しました。時間を置いて再度お試しください。";
    } else {
      message = res.statusText;
      try {
        const body = await res.json();
        message = extractErrorMessage(body) ?? res.statusText;
      } catch {
        // ignore parse failure
      }
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export function fetchBooks(translation?: string): Promise<Book[]> {
  const qs = translation ? `?translation=${encodeURIComponent(translation)}` : "";
  return apiFetch(`/books/${qs}`);
}

export function fetchChapters(bookId: string): Promise<Chapter[]> {
  return apiFetch(`/books/${bookId}/chapters/`);
}

export function fetchVerses(chapterId: string): Promise<Verse[]> {
  return apiFetch(`/chapters/${chapterId}/verses/`);
}

// 箇所（canonical slug）→ 各版の書/章/節をまとめて1回で取得する（N+1 解消）。
export type ReferenceItem = { id: string; translation: string };

export function fetchReferenceBooks(slug: string): Promise<ReferenceItem[]> {
  return apiFetch<{ books: ReferenceItem[] }>(`/references/${slug}/books/`).then((r) => r.books);
}

export function fetchReferenceChapters(slug: string, chapter: number): Promise<ReferenceItem[]> {
  return apiFetch<{ chapters: ReferenceItem[] }>(`/references/${slug}/chapters/${chapter}/`).then((r) => r.chapters);
}

export function fetchReferenceVerses(slug: string, chapter: number, verse: number): Promise<ReferenceItem[]> {
  return apiFetch<{ verses: ReferenceItem[] }>(`/references/${slug}/verses/${chapter}/${verse}/`).then((r) => r.verses);
}

/**
 * 箇所に付いた**親コメント**の1ページ分。
 *
 * 返信はここには入らない（fetchCommentReplies で親ごとに取る）。以前は親と返信を
 * 混ぜた1本の列を受け取って画面側で組み直していたが、ページで区切ると親と返信が
 * 別ページに分かれ、親が見つからない返信が何も言わずに消えていた。
 */
export function fetchCommentPage(params: {
  // 段階6F: 単一 id（verse_id/chapter_id/book_id）は backend が「その箇所」へ解決し、
  // 訳をまたいで同じ箇所のコメントを集約して返す（全訳 id の集約パラメータは廃止）。
  verse_id?: string;
  chapter_id?: string;
  book_id?: string;
  ordering?: "new" | "votes";
  tag_id?: string;
  translation_project?: string;
  page?: number;
}): Promise<ListPage<Comment>> {
  const q = new URLSearchParams();
  if (params.verse_id) q.set("verse_id", params.verse_id);
  if (params.chapter_id) q.set("chapter_id", params.chapter_id);
  if (params.book_id) q.set("book_id", params.book_id);
  if (params.ordering) q.set("ordering", params.ordering);
  if (params.tag_id) q.set("tag_id", params.tag_id);
  if (params.translation_project) q.set("translation_project", params.translation_project);
  if (params.page && params.page > 1) q.set("page", String(params.page));
  return apiFetchPage(`/comments/?${q}`);
}

export function fetchTags(): Promise<Tag[]> {
  return apiFetch("/tags/");
}

export function createComment(data: {
  verse?: string;
  chapter?: string;
  book?: string;
  title?: string;
  body: string;
  parent?: string;
  is_qa?: boolean;
  tag_ids?: string[];
  translation_project?: string;
}): Promise<Comment> {
  return apiFetch("/comments/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function upvoteComment(commentId: string): Promise<void> {
  return apiFetch(`/comments/${commentId}/upvote/`, { method: "POST" });
}

export function removeUpvote(commentId: string): Promise<void> {
  return apiFetch(`/comments/${commentId}/upvote/`, { method: "DELETE" });
}

export function deleteComment(commentId: string): Promise<void> {
  return apiFetch(`/comments/${commentId}/`, { method: "DELETE" });
}

export function updateComment(commentId: string, body: string): Promise<Comment> {
  return apiFetch(`/comments/${commentId}/`, {
    method: "PATCH",
    body: JSON.stringify({ body }),
  });
}

// お気に入りの種類。バックエンドが返す target_type と同じ値を使う。
export type BookmarkType = "verse" | "chapter" | "book" | "comment" | "project";
export type BookmarkCounts = Record<BookmarkType | "all", number>;

/** まだ読み込んでいないときに使う件数ゼロの値。 */
export const EMPTY_BOOKMARK_COUNTS: BookmarkCounts = {
  all: 0, verse: 0, chapter: 0, book: 0, comment: 0, project: 0,
};

/**
 * 自分のお気に入りを全件取り切る。
 *
 * 読書画面で「この節・章・書に栞が付いているか」を判定するために使う。
 * 一部しか持っていないと栞済みの印が出なくなるので、ここは取り切る必要がある。
 * 一覧画面には fetchBookmarkPage を使うこと。
 */
export function fetchBookmarks(): Promise<Bookmark[]> {
  return apiFetchAll("/bookmarks/");
}

/** お気に入り一覧の1ページ分。type で種類を絞る（省略＝すべて）。 */
export function fetchBookmarkPage(params?: {
  type?: BookmarkType;
  page?: number;
}): Promise<ListPage<Bookmark, BookmarkCounts>> {
  const qs = new URLSearchParams();
  if (params?.type) qs.set("type", params.type);
  if (params?.page && params.page > 1) qs.set("page", String(params.page));
  const suffix = qs.toString() ? `?${qs}` : "";
  return apiFetchPage(`/bookmarks/${suffix}`);
}

export function createBookmark(verseId: string): Promise<Bookmark> {
  return apiFetch("/bookmarks/", {
    method: "POST",
    body: JSON.stringify({ verse: verseId }),
  });
}

export function createChapterBookmark(chapterId: string): Promise<Bookmark> {
  return apiFetch("/bookmarks/", {
    method: "POST",
    body: JSON.stringify({ chapter: chapterId }),
  });
}

export function createBookBookmark(bookId: string): Promise<Bookmark> {
  return apiFetch("/bookmarks/", {
    method: "POST",
    body: JSON.stringify({ book: bookId }),
  });
}

export function createCommentBookmark(commentId: string): Promise<Bookmark> {
  return apiFetch("/bookmarks/", {
    method: "POST",
    body: JSON.stringify({ comment: commentId }),
  });
}

export function createProjectBookmark(projectId: string): Promise<Bookmark> {
  return apiFetch("/bookmarks/", {
    method: "POST",
    body: JSON.stringify({ translation_project: projectId }),
  });
}

export function removeBookmark(bookmarkId: string): Promise<void> {
  return apiFetch(`/bookmarks/${bookmarkId}/`, { method: "DELETE" });
}

/** 自分のコメント一覧の1ページ分。 */
export function fetchMyCommentPage(page = 1): Promise<ListPage<MyComment>> {
  const suffix = page > 1 ? `?page=${page}` : "";
  return apiFetchPage(`/comments/mine/${suffix}`);
}

export function fetchVerseOfDay(translation?: string): Promise<VerseOfDay> {
  const qs = translation ? `?translation=${encodeURIComponent(translation)}` : "";
  return apiFetch(`/verse-of-the-day/${qs}`);
}

// 通知の種類。バックエンドが返す notification_type と同じ値を使う。
export type NotificationType = "reply" | "upvote" | "mention";
export type NotificationCounts = Record<NotificationType | "all", number>;

/** まだ読み込んでいないときに使う件数ゼロの値。 */
export const EMPTY_NOTIFICATION_COUNTS: NotificationCounts = {
  all: 0, reply: 0, upvote: 0, mention: 0,
};

/** 通知一覧の1ページ分。type で種類を絞る（省略＝すべて）。 */
export function fetchNotificationPage(params?: {
  type?: NotificationType;
  page?: number;
}): Promise<ListPage<Notification, NotificationCounts>> {
  const qs = new URLSearchParams();
  if (params?.type) qs.set("type", params.type);
  if (params?.page && params.page > 1) qs.set("page", String(params.page));
  const suffix = qs.toString() ? `?${qs}` : "";
  return apiFetchPage(`/notifications/${suffix}`);
}

export function fetchUnreadCount(): Promise<number> {
  return apiFetch<{ count: number }>("/notifications/unread-count/").then((r) => r.count);
}

export function markNotificationRead(notificationId: string): Promise<void> {
  return apiFetch(`/notifications/${notificationId}/read/`, { method: "POST" });
}

export function markAllNotificationsRead(): Promise<void> {
  return apiFetch("/notifications/read-all/", { method: "POST" });
}

export function fetchMe(): Promise<User> {
  return apiFetch("/auth/me/");
}

export function updateProfile(data: {
  bio?: string;
  bookmarks_visibility?: "private" | "public";
}): Promise<User> {
  return apiFetch("/auth/me/", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function fetchReadingProgress(): Promise<ReadingProgress[]> {
  return apiFetch("/reading-progress/");
}

export function saveReadingProgress(data: {
  book: string;
  chapter: string;
}): Promise<ReadingProgress> {
  return apiFetch("/reading-progress/save/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function login(username: string, password: string): Promise<User> {
  return apiFetch("/auth/login/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function register(
  username: string,
  email: string,
  password: string
): Promise<User> {
  return apiFetch("/auth/register/", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
}

export function logout(): Promise<void> {
  return apiFetch("/auth/logout/", { method: "POST" });
}

/** Q&A一覧の1ページ分。answered で「解決済み／未解決」の列ごとに分けて取る。 */
export function fetchQACommentPage(params?: {
  book_id?: string;
  tag_id?: string;
  answered?: boolean;
  q?: string;
  page?: number;
}): Promise<ListPage<QAComment>> {
  const qs = new URLSearchParams();
  if (params?.book_id) qs.set("book_id", params.book_id);
  if (params?.tag_id) qs.set("tag_id", params.tag_id);
  if (params?.answered !== undefined) qs.set("answered", String(params.answered));
  if (params?.q?.trim()) qs.set("q", params.q.trim());
  if (params?.page && params.page > 1) qs.set("page", String(params.page));
  return apiFetchPage(`/comments/qa/?${qs}`);
}

/**
 * ある親コメントへの返信を全部取る。
 *
 * 返信は親を開いたときにまとめて出したいので取り切る。返信が何百件も付くように
 * なったら、ここも「もっと見る」に変える（親側の作りは変えなくてよい）。
 */
export function fetchCommentReplies(parentId: string): Promise<Comment[]> {
  return apiFetchAll(`/comments/?parent_id=${parentId}`);
}

export function setBestAnswer(questionId: string, answerCommentId: string | null): Promise<void> {
  return apiFetch(`/comments/${questionId}/best-answer/`, {
    method: "PATCH",
    body: JSON.stringify({ answer_comment_id: answerCommentId }),
  });
}

export type SearchKind = "all" | "verses" | "books" | "comments";

// 検索対象は UI 言語で絞らない（検索語そのものが言語を選ぶ）ため lang は送らない。
export function searchBible(
  q: string,
  page = 1,
  kind: SearchKind = "all",
  bookSlug = "",
): Promise<SearchResult> {
  const qs = new URLSearchParams();
  qs.set("q", q);
  qs.set("page", String(page));
  if (kind !== "all") qs.set("kind", kind);
  if (bookSlug) qs.set("book", bookSlug);
  return apiFetch(`/search/?${qs.toString()}`);
}

// ---------------------------------------------------------------------------
// 翻訳プロジェクト
// ---------------------------------------------------------------------------

export function fetchTranslationLanguages(): Promise<TranslationLanguage[]> {
  return apiFetch("/translations/languages/");
}

export type TranslationStatus = "published" | "active" | "draft";

// 翻訳一覧はステータス列ごとに 20 件ページング（ボードの各カラム用）。count で総ページ数を出す。
export function fetchTranslations(
  status?: TranslationStatus,
  page = 1,
  q = "",
): Promise<PaginatedResponse<TranslationProject>> {
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (q.trim()) qs.set("q", q.trim());
  qs.set("page", String(page));
  return apiFetch(`/translations/?${qs.toString()}`);
}

export function fetchTranslation(id: string): Promise<TranslationProject> {
  return apiFetch(`/translations/${id}/`);
}

export function createTranslation(data: {
  name: string;
  description?: string;
  source_book: string;
  target_language: string;
}): Promise<TranslationProject> {
  return apiFetch("/translations/", { method: "POST", body: JSON.stringify(data) });
}

export function updateTranslation(id: string, data: Partial<Pick<TranslationProject, "name" | "description" | "target_language">>): Promise<TranslationProject> {
  return apiFetch(`/translations/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteTranslation(id: string): Promise<void> {
  return apiFetch(`/translations/${id}/`, { method: "DELETE" });
}

export function activateTranslation(id: string): Promise<TranslationProject> {
  return apiFetch(`/translations/${id}/activate/`, { method: "POST" });
}

export function publishTranslation(id: string): Promise<TranslationProject> {
  return apiFetch(`/translations/${id}/publish/`, { method: "POST" });
}

export function unpublishTranslation(id: string): Promise<TranslationProject> {
  return apiFetch(`/translations/${id}/unpublish/`, { method: "POST" });
}

export function joinTranslation(id: string): Promise<TranslationMembership> {
  return apiFetch(`/translations/${id}/join/`, { method: "POST" });
}

export function fetchTranslationMembers(id: string): Promise<TranslationMembership[]> {
  return apiFetch(`/translations/${id}/members/`);
}

export function updateMembershipStatus(projectId: string, membershipId: string, status: "approved" | "rejected"): Promise<TranslationMembership> {
  return apiFetch(`/translations/${projectId}/members/${membershipId}/`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function removeMember(projectId: string, membershipId: string): Promise<void> {
  return apiFetch(`/translations/${projectId}/members/${membershipId}/`, { method: "DELETE" });
}

export type TranslationUnitStatus = TranslationUnit["status"];

/** 章ボタンとレビュー件数を出すための軽い問い合わせ。全ユニットは取らない。 */
export type TranslationUnitSummary = {
  chapters: number[];
  status_counts: Record<TranslationUnitStatus, number>;
  total: number;
};

export function fetchTranslationUnitSummary(projectId: string): Promise<TranslationUnitSummary> {
  return apiFetch(`/translations/${projectId}/units/summary/`);
}

/**
 * 翻訳ユニットを取る。
 *
 * 企画は書を丸ごと追加できるので全体では数千件になりうる。画面は章を選んで
 * 作業するので、原則 chapter を指定して呼ぶこと。1章は1ページに収まる。
 */
export function fetchTranslationUnits(
  projectId: string,
  params?: { chapter?: number; status?: TranslationUnitStatus }
): Promise<TranslationUnit[]> {
  const qs = new URLSearchParams();
  if (params?.chapter !== undefined) qs.set("chapter", String(params.chapter));
  if (params?.status) qs.set("status", params.status);
  const suffix = qs.toString() ? `?${qs}` : "";
  return apiFetchAll(`/translations/${projectId}/units/${suffix}`);
}

export function addBookToTranslation(projectId: string, bookId: string): Promise<{ created: number; book_name: string }> {
  return apiFetch(`/translations/${projectId}/add-book/`, {
    method: "POST",
    body: JSON.stringify({ book_id: bookId }),
  });
}

export function removeBookFromTranslation(projectId: string, bookId: string): Promise<{ deleted: number; book_name: string }> {
  return apiFetch(`/translations/${projectId}/remove-book/`, {
    method: "DELETE",
    body: JSON.stringify({ book_id: bookId }),
  });
}

export function addTranslationUnit(projectId: string, verseId: string): Promise<TranslationUnit> {
  return apiFetch(`/translations/${projectId}/units/`, {
    method: "POST",
    body: JSON.stringify({ verse: verseId }),
  });
}

export function updateTranslationUnit(projectId: string, unitId: string, data: { body?: string; status?: TranslationUnit["status"] }): Promise<TranslationUnit> {
  return apiFetch(`/translations/${projectId}/units/${unitId}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function assignTranslationUnit(projectId: string, unitId: string, userId: string | null): Promise<TranslationUnit> {
  return apiFetch(`/translations/${projectId}/units/${unitId}/assign/`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
}

export function fetchTranslationComments(projectId: string): Promise<TranslationComment[]> {
  return apiFetch(`/translations/${projectId}/comments/`);
}

export function fetchUnitComments(projectId: string, unitId: string): Promise<TranslationComment[]> {
  return apiFetch(`/translations/${projectId}/units/${unitId}/comments/`);
}

export function postTranslationComment(projectId: string, body: string): Promise<TranslationComment> {
  return apiFetch(`/translations/${projectId}/comments/`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function postUnitComment(projectId: string, unitId: string, body: string): Promise<TranslationComment> {
  return apiFetch(`/translations/${projectId}/units/${unitId}/comments/`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function deleteTranslationComment(projectId: string, commentId: string): Promise<void> {
  return apiFetch(`/translations/${projectId}/comments/${commentId}/`, { method: "DELETE" });
}

/**
 * 公開翻訳の本文。
 *
 * chapter を渡すとその章だけ、渡さないと目次用に章一覧だけ（units は空）を返す。
 * 以前は常に全章返していたので、1章開くたびに書全体が飛んでいた。
 */
export type TranslationReadResult = { chapters: number[]; units: TranslationUnit[] };

export function fetchTranslationRead(
  projectId: string,
  chapter?: number
): Promise<TranslationReadResult> {
  const suffix = chapter !== undefined ? `?chapter=${chapter}` : "";
  return apiFetch(`/translations/${projectId}/read/${suffix}`);
}

// 自分が /read に追加した公開翻訳一覧（本棚）
export function fetchTranslationLibrary(): Promise<TranslationProject[]> {
  return apiFetch("/translations/library/");
}

export function addTranslationToLibrary(id: string): Promise<TranslationProject> {
  return apiFetch(`/translations/${id}/library/`, { method: "POST" });
}

export function removeTranslationFromLibrary(id: string): Promise<void> {
  return apiFetch(`/translations/${id}/library/`, { method: "DELETE" });
}

export function fetchUserProfile(username: string): Promise<PublicUser> {
  return apiFetch(`/users/${username}/`);
}

/** 公開プロフィールのコメント一覧の1ページ分。 */
export function fetchUserCommentPage(username: string, page = 1): Promise<ListPage<Comment>> {
  const suffix = page > 1 ? `?page=${page}` : "";
  return apiFetchPage(`/users/${username}/comments/${suffix}`);
}

/** 公開プロフィールのお気に入り一覧の1ページ分。type で種類を絞る（省略＝すべて）。 */
export function fetchUserBookmarkPage(
  username: string,
  params?: { type?: BookmarkType; page?: number }
): Promise<ListPage<Bookmark, BookmarkCounts>> {
  const qs = new URLSearchParams();
  if (params?.type) qs.set("type", params.type);
  if (params?.page && params.page > 1) qs.set("page", String(params.page));
  const suffix = qs.toString() ? `?${qs}` : "";
  return apiFetchPage(`/users/${username}/bookmarks/${suffix}`);
}

export function fetchTrendingComments(): Promise<QAComment[]> {
  return apiFetch("/comments/trending/");
}

export function reportComment(commentId: string, reason: string): Promise<void> {
  return apiFetch(`/comments/${commentId}/report/`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

// ---------------------------------------------------------------------------
// 記事
// ---------------------------------------------------------------------------

export function fetchArticles(params?: {
  mine?: boolean;
  tag?: string;
  author?: string;
  page?: number;
}): Promise<PaginatedResponse<Article>> {
  const qs = new URLSearchParams();
  if (params?.mine) qs.set("mine", "true");
  if (params?.tag) qs.set("tag", params.tag);
  if (params?.author) qs.set("author", params.author);
  if (params?.page) qs.set("page", String(params.page));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch(`/articles/${suffix}`);
}

export function fetchArticle(id: string): Promise<Article> {
  return apiFetch(`/articles/${id}/`);
}

export type ArticleInput = {
  title?: string;
  summary?: string;
  body?: string;
  visibility?: ArticleVisibility;
  tag_ids?: string[];
};

export function createArticle(data: ArticleInput): Promise<Article> {
  return apiFetch("/articles/", { method: "POST", body: JSON.stringify(data) });
}

export function updateArticle(id: string, data: ArticleInput): Promise<Article> {
  return apiFetch(`/articles/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteArticle(id: string): Promise<void> {
  return apiFetch(`/articles/${id}/`, { method: "DELETE" });
}

export function fetchArticleTags(): Promise<ArticleTag[]> {
  return apiFetchList("/article-tags/");
}

/** その節を引用している公開記事。節のページの「引用した記事」タブで使う。 */
export function fetchArticlesCitingVerse(params: {
  book: string;
  chapter: number;
  verse?: number;
}): Promise<PaginatedResponse<Article>> {
  const qs = new URLSearchParams({ book: params.book, chapter: String(params.chapter) });
  if (params.verse) qs.set("verse", String(params.verse));
  return apiFetch(`/articles/citing/?${qs.toString()}`);
}

export function fetchArticleComments(articleId: string): Promise<ArticleComment[]> {
  return apiFetchList(`/articles/${articleId}/comments/`);
}

export function createArticleComment(
  articleId: string,
  data: { body: string; parent?: string | null },
): Promise<ArticleComment> {
  return apiFetch(`/articles/${articleId}/comments/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteArticleComment(commentId: string): Promise<void> {
  return apiFetch(`/article-comments/${commentId}/`, { method: "DELETE" });
}
