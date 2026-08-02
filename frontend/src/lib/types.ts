export type Book = { id: string; name: string; translation: string; order: number };
export type Chapter = { id: string; book: string; number: number };
export type Verse = { id: string; chapter: string; number: number; text: string };
export type CommentUser = { id: string; username: string };
export type Comment = {
  id: string;
  user: CommentUser;
  translation_project: string | null;
  // どのバージョンのコメントか（聖書なら訳名・翻訳ならプロジェクト名）。全バージョン表示のバッジ用。
  version_label: string;
  parent: string | null;
  body: string;
  is_deleted: boolean;
  created_at: string;
  vote_count: number;
  // このコメントへの返信の数（削除済みは含まない）。返信を開く前に件数だけ出すのに使う。
  reply_count: number;
  tags: Tag[];
};

export type BookmarkVerseDetail = {
  id: string;
  number: number;
  text: string;
  chapter_number: number;
  book_name: string;
};
export type BookmarkCommentDetail = {
  id: string;
  body: string;
  username: string;
  created_at: string;
  // コメント栞から「どの箇所へのコメントか」を表示・リンクするための素材。
  location_label: string;
  book_slug: string;
  chapter_number: number | null;
  verse_number: number | null;
  source_translation: string;
  is_deleted?: boolean;
};
export type BookmarkReference = {
  book: string; // canonical_book.slug
  chapter: number | null; // 章栞・書栞では粒度に応じて null
  verse: number | null; // 章栞・書栞では null
};
export type BookmarkProjectDetail = {
  id: string;
  name: string;
};
export type Bookmark = {
  id: string;
  verse_detail: BookmarkVerseDetail | null;
  comment_detail: BookmarkCommentDetail | null;
  project_detail: BookmarkProjectDetail | null;
  // verse=節 / chapter=章 / book=書 / comment=コメント / project=翻訳プロジェクト
  target_type: "verse" | "chapter" | "book" | "comment" | "project" | null;
  reference: BookmarkReference | null; // 訳非依存の箇所（箇所栞のみ。comment/project では null）
  verse_text: string | null; // 節栞の表示用本文（口語訳優先。それ以外の栞では null）
  created_at: string;
};
export type NotificationTargetKind =
  | "verse_comment"
  | "chapter_comment"
  | "book_comment"
  | "qa"
  | "translation_project_comment"
  | "translation_unit"
  | null;

export type Notification = {
  id: string;
  notification_type: "reply" | "upvote" | "mention";
  actor_username: string;
  // 通知の対象になった文章。コメントでも Q&A の回答でもここに入る。
  body_snippet: string;
  body_is_deleted?: boolean;
  comment_id: string | null;
  // Q&A の通知のとき、飛び先の質問。
  question_id: string | null;
  translation_project_id: string | null;
  is_read: boolean;
  created_at: string;
  target_kind: NotificationTargetKind;
  book_name: string | null;
  chapter_number: number | null;
  verse_number: number | null;
  translation_unit_id: string | null;
};
export type User = {
  id: string;
  username: string;
  email: string;
  bio: string;
  bookmarks_visibility: BookmarksVisibility;
  created_at: string;
};
export type AccountSettings = User & {
  email_notifications_enabled: boolean;
  in_app_notifications_enabled: boolean;
  has_usable_password: boolean;
  social_providers: string[];
};
export type NotificationPreferences = Pick<
  AccountSettings,
  "email_notifications_enabled" | "in_app_notifications_enabled"
>;
export type JwtSession = {
  id: string;
  created_at: string;
  expires_at: string;
  current: boolean;
};
export type Tag = {
  id: string;
  name: string;
};

export type VerseOfDay = {
  id: string;
  number: number;
  text: string;
  book_name: string;
  chapter_number: number;
  translation: string;
};

export type MyComment = {
  id: string;
  user: CommentUser;
  body: string;
  created_at: string;
  vote_count: number;
  location_label: string;
  // 箇所へのリンク組み立て用（訳非依存 slug＋章／節＋投稿時訳）。
  book_slug: string;
  chapter_number: number | null;
  verse_number: number | null;
  source_translation: string;
};

export type ReadingProgress = {
  id: string;
  book: string;
  book_name: string;
  chapter: string;
  chapter_number: number;
  updated_at: string;
};

/** Q&A の質問。コメントとは別のデータ（backend の qa.Question）。 */
export type QAQuestion = {
  id: string;
  user: CommentUser;
  title: string;
  body: string;
  created_at: string;
  is_deleted: boolean;
  /** 訳非依存の書。読書ページへのリンクを組み立てるのに使う。 */
  book_slug: string;
  /** 投稿時に見ていた訳での書名。 */
  book_name: string;
  chapter_number: number | null;
  verse_number: number | null;
  location_label: string;
  version_label: string;
  tags: Tag[];
  /** ベストアンサーが入っていれば「解決済み」。 */
  best_answer: {
    id: string;
    user: CommentUser;
    body: string;
    created_at: string;
  } | null;
  answer_count: number;
};

/** Q&A の回答。ネストしない（回答への返信は無い）。 */
export type QAAnswer = {
  id: string;
  user: CommentUser;
  body: string;
  is_deleted: boolean;
  is_best: boolean;
  created_at: string;
};

/** 表紙の「盛り上がっているコメント」1件。 */
export type TrendingComment = {
  id: string;
  user: CommentUser;
  body: string;
  created_at: string;
  vote_count: number;
  location_label: string;
  book_name: string;
  chapter_number: number | null;
  verse_number: number | null;
  reply_count: number;
};

export type TranslationLanguage = {
  id: string;
  tag: string;
  label: string;
  order: number;
};

export type TranslationProject = {
  id: string;
  name: string;
  description: string;
  owner_username: string;
  source_book: string;
  source_book_name: string;
  target_language: string;
  status: "draft" | "active" | "published";
  unit_count: number;
  done_count: number;
  is_member: boolean;
  membership_status: "pending" | "approved" | "rejected" | null;
  is_in_library: boolean;
  created_at: string;
  updated_at: string;
};

export type TranslationMembership = {
  id: string;
  user: string;
  username: string;
  role: "owner" | "member";
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export type TranslationUnit = {
  id: string;
  verse: string;
  verse_number: number;
  verse_text: string;
  chapter: string;
  chapter_number: number;
  assigned_to: string | null;
  assigned_to_username: string | null;
  body: string;
  status: "todo" | "in_progress" | "review" | "done";
  created_at: string;
  updated_at: string;
};

export type TranslationComment = {
  id: string;
  unit: string | null;
  username: string;
  body: string;
  display_body: string;
  is_deleted: boolean;
  created_at: string;
};

export type SearchResult = {
  verses: {
    id: string;
    number: number;
    text: string;
    chapter_number: number;
    chapter_id: string;
    book_name: string;
    book_id: string;
    book_slug: string;
    translation: string;
  }[];
  books: Book[];
  comments: {
    id: string;
    body: string;
    username: string;
    created_at: string;
    location: string;
  }[];
  verse_total: number; // 集約後の節ヒット総数（ページングの母数）
  has_more: boolean; // さらに次ページの節があるか
};

export type BookmarksVisibility = "private" | "public";

export type PublicUser = {
  id: string;
  username: string;
  bio: string;
  bookmarks_visibility: BookmarksVisibility;
  created_at: string;
};

// ---------------------------------------------------------------------------
// 記事
// ---------------------------------------------------------------------------

export type ArticleVisibility = "private" | "unlisted" | "public";

export type ArticleTag = {
  id: string;
  name: string;
  slug: string;
  article_count?: number;
};

/**
 * 本文の印（[[matthew 6:16]] など）を、画面に出せる形へ解決したもの。
 * raw は本文に書かれている印そのもので、これを目印に本文を置き換える。
 */
export type ArticleCitation = {
  raw: string;
  kind: "inline" | "block";
  found: boolean;
  label: string;
  book_slug: string;
  book_name: string;
  chapter_number: number;
  verse_number_start: number | null;
  verse_number_end: number | null;
  translation: string;
  verses: { number: number; text: string }[];
};

export type Article = {
  id: string;
  title: string;
  summary: string;
  visibility: ArticleVisibility;
  owner_username: string;
  tags: ArticleTag[];
  created_at: string;
  updated_at: string;
  // 一覧では返らない（記事1件の取得でのみ付く）
  body?: string;
  citations?: ArticleCitation[];
};

export type ArticleComment = {
  id: string;
  username: string;
  body: string;
  parent: string | null;
  is_deleted: boolean;
  created_at: string;
};

// ---------------------------------------------------------------------------
// 読書プラン
// ---------------------------------------------------------------------------

export type PlanVisibility = "private" | "unlisted" | "public";

/** その日に読む章1つ。book は訳に依らない書の slug。 */
export type PlanReading = {
  id: string;
  book: string;
  book_name: string;
  chapter_number: number;
  translation: string;
  order: number;
};

export type PlanDay = {
  id: string;
  number: number;
  title: string;
  devotional: string;
  readings: PlanReading[];
  completed: boolean;
};

export type Plan = {
  id: string;
  title: string;
  description: string;
  visibility: PlanVisibility;
  owner_username: string;
  day_count: number;
  reader_count: number;
  created_at: string;
  updated_at: string;
  // 一覧では返らない（プラン1件の取得でのみ付く）
  note?: string;
  days?: PlanDay[];
  can_reorder_days?: boolean;
  subscription?: { id: string; started_at: string; is_active: boolean } | null;
};

export type PlanSubscription = {
  id: string;
  plan: string;
  plan_title: string;
  started_at: string;
  is_active: boolean;
};
