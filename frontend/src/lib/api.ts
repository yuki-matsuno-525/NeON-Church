export type Book = { id: string; name: string; translation: string; order: number };
export type Chapter = { id: string; book: string; number: number };
export type Verse = { id: string; chapter: string; number: number; text: string };
export type CommentUser = { id: string; username: string };
export type Comment = {
  id: string;
  user: CommentUser;
  verse: string | null;
  chapter: string | null;
  book: string | null;
  parent: string | null;
  body: string;
  is_deleted: boolean;
  created_at: string;
  vote_count: number;
};

export type CommentNode = Comment & { children: CommentNode[] };
export type BookmarkVerseDetail = {
  id: string;
  number: number;
  text: string;
  chapter_number: number;
  book_name: string;
};
export type Bookmark = {
  id: string;
  verse_detail: BookmarkVerseDetail;
  created_at: string;
};
export type Notification = {
  id: string;
  notification_type: "reply" | "upvote";
  actor_username: string;
  comment_id: string;
  comment_body_snippet: string;
  is_read: boolean;
  created_at: string;
};
export type User = {
  id: string;
  username: string;
  email: string;
  bio: string;
  created_at: string;
};

class ApiError extends Error {
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

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
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

export { ApiError };

export function fetchBooks(): Promise<Book[]> {
  return apiFetch("/books/");
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
}): Promise<Comment[]> {
  const q = new URLSearchParams();
  if (params.verse_id) q.set("verse_id", params.verse_id);
  if (params.chapter_id) q.set("chapter_id", params.chapter_id);
  if (params.book_id) q.set("book_id", params.book_id);
  if (params.ordering) q.set("ordering", params.ordering);
  return apiFetch(`/comments/?${q}`);
}

export function createComment(data: {
  verse?: string;
  chapter?: string;
  book?: string;
  body: string;
  parent?: string;
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

export function removeBookmark(bookmarkId: string): Promise<void> {
  return apiFetch(`/bookmarks/${bookmarkId}/`, { method: "DELETE" });
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
