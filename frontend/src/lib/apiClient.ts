import type {
  Book,
  Chapter,
  Verse,
  Comment,
  CommentNode,
  Bookmark,
  Notification,
  User,
  Tag,
  VerseOfDay,
  MyComment,
  ReadingProgress,
  QAComment,
  TranslationProject,
  TranslationMembership,
  TranslationUnit,
  TranslationComment,
  SearchResult,
  PublicUser,
} from "./types";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// 常に相対パスで Next.js rewrites を経由する（クロスドメイン Cookie 問題を回避）
const API_BASE = "";

function getCsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : undefined;
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

  if (res.status === 401 && !isRetry) {
    try {
      await refreshToken();
    } catch {
      throw new ApiError(401, "Unauthorized");
    }
    return apiFetch<T>(path, init, true);
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.detail ?? JSON.stringify(body);
    } catch {
      // ignore parse failure
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

export function fetchComments(params: {
  verse_id?: string;
  chapter_id?: string;
  book_id?: string;
  ordering?: "new" | "votes";
  tag_id?: string;
}): Promise<Comment[]> {
  const q = new URLSearchParams();
  if (params.verse_id) q.set("verse_id", params.verse_id);
  if (params.chapter_id) q.set("chapter_id", params.chapter_id);
  if (params.book_id) q.set("book_id", params.book_id);
  if (params.ordering) q.set("ordering", params.ordering);
  if (params.tag_id) q.set("tag_id", params.tag_id);
  return apiFetch(`/comments/?${q}`);
}

export function fetchTags(): Promise<Tag[]> {
  return apiFetch("/tags/");
}

export function createComment(data: {
  verse?: string;
  chapter?: string;
  book?: string;
  body: string;
  parent?: string;
  is_qa?: boolean;
  tag_ids?: string[];
}): Promise<Comment> {
  return apiFetch("/comments/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function buildCommentTree(comments: Comment[]): CommentNode[] {
  const nodeMap = new Map<string, CommentNode>();
  for (const c of comments) {
    nodeMap.set(c.id, { ...c, children: [] });
  }
  const roots: CommentNode[] = [];
  for (const node of nodeMap.values()) {
    if (!node.parent) {
      roots.push(node);
    } else {
      nodeMap.get(node.parent)?.children.push(node);
    }
  }
  return roots;
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

export function fetchBookmarks(): Promise<Bookmark[]> {
  return apiFetch("/bookmarks/");
}

export function createBookmark(verseId: string): Promise<Bookmark> {
  return apiFetch("/bookmarks/", {
    method: "POST",
    body: JSON.stringify({ verse: verseId }),
  });
}

export function createCommentBookmark(commentId: string): Promise<Bookmark> {
  return apiFetch("/bookmarks/", {
    method: "POST",
    body: JSON.stringify({ comment: commentId }),
  });
}

export function removeBookmark(bookmarkId: string): Promise<void> {
  return apiFetch(`/bookmarks/${bookmarkId}/`, { method: "DELETE" });
}

export function fetchMyComments(): Promise<MyComment[]> {
  return apiFetch("/comments/mine/");
}

export function fetchVerseOfDay(): Promise<VerseOfDay> {
  return apiFetch("/verse-of-the-day/");
}

export function fetchNotifications(): Promise<Notification[]> {
  return apiFetch("/notifications/");
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

export function updateProfile(data: { bio: string }): Promise<User> {
  return apiFetch("/auth/me/", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function uploadAvatar(file: File): Promise<User> {
  const form = new FormData();
  form.append("avatar", file);
  const csrfToken = getCsrfToken();
  return fetch(`/api/auth/me/`, {
    method: "PATCH",
    credentials: "include",
    headers: csrfToken ? { "X-CSRFToken": csrfToken } : {},
    body: form,
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body.detail ?? res.statusText);
    }
    return res.json() as Promise<User>;
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

export function fetchQAComments(params?: { book_id?: string; tag_id?: string; answered?: boolean }): Promise<QAComment[]> {
  const qs = new URLSearchParams();
  if (params?.book_id) qs.set("book_id", params.book_id);
  if (params?.tag_id) qs.set("tag_id", params.tag_id);
  if (params?.answered !== undefined) qs.set("answered", String(params.answered));
  const q = qs.toString();
  return apiFetch(`/comments/qa/${q ? `?${q}` : ""}`);
}

export function fetchCommentReplies(parentId: string): Promise<Comment[]> {
  return apiFetch(`/comments/?parent_id=${parentId}`);
}

export function setBestAnswer(questionId: string, answerCommentId: string | null): Promise<void> {
  return apiFetch(`/comments/${questionId}/best-answer/`, {
    method: "PATCH",
    body: JSON.stringify({ answer_comment_id: answerCommentId }),
  });
}

export function searchBible(q: string): Promise<SearchResult> {
  return apiFetch(`/search/?q=${encodeURIComponent(q)}`);
}

export function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = (now.getTime() - date.getTime()) / 1000;

  if (diff < 60) return "たった今";
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}日前`;
  return date.toLocaleDateString("ja-JP");
}

// ---------------------------------------------------------------------------
// 翻訳プロジェクト
// ---------------------------------------------------------------------------

export function fetchTranslations(): Promise<TranslationProject[]> {
  return apiFetch("/translations/");
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

export function fetchTranslationUnits(projectId: string): Promise<TranslationUnit[]> {
  return apiFetch(`/translations/${projectId}/units/`);
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

export function fetchTranslationRead(projectId: string): Promise<TranslationUnit[]> {
  return apiFetch(`/translations/${projectId}/read/`);
}

export function fetchUserProfile(username: string): Promise<PublicUser> {
  return apiFetch(`/users/${username}/`);
}

export function fetchUserComments(username: string): Promise<Comment[]> {
  return apiFetch(`/users/${username}/comments/`);
}

export function fetchUserBookmarks(username: string): Promise<Bookmark[]> {
  return apiFetch(`/users/${username}/bookmarks/`);
}
