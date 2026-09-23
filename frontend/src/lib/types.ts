export type Book = { id: string; name: string; translation: string; order: number };
export type Chapter = { id: string; book: string; number: number };
// 書のページが返す章。章の書き出し（いちばん小さい番号の節の頭・80字まで）が付く。
// プランを作るときに、中身を見ないまま章を選ばずに済むようにするため。
export type BookChapter = Chapter & { opening: string };
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
  // コメントのお気に入りから「どの箇所へのコメントか」を表示・リンクするための素材。
  location_label: string;
  book_slug: string;
  chapter_number: number | null;
  verse_number: number | null;
  source_translation: string;
  is_deleted?: boolean;
};
export type BookmarkReference = {
  book: string; // canonical_book.slug
  chapter: number | null; // 章のお気に入り・書のお気に入りでは粒度に応じて null
  verse: number | null; // 章のお気に入り・書のお気に入りでは null
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
  target_type: "verse" | "chapter" | "book" | "commentary" | "comment" | "project" | null;
  reference: BookmarkReference | null; // 訳非依存の箇所（箇所のお気に入りのみ。comment/project では null）
  // 解釈書の場所のお気に入り（書・章・区切り）。それ以外では null。
  commentary_reference?: { work: string; chapter: number | null; number: number | null; label: string } | null;
  verse_text: string | null; // 節のお気に入りの表示用本文（口語訳優先。それ以外のお気に入りでは null）
  created_at: string;
};
export type NotificationTargetKind =
  | "verse_comment"
  | "chapter_comment"
  | "book_comment"
  | "qa"
  | "translation_project_comment"
  | "translation_unit"
  | "commentary_comment"
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
  /** 解釈書の場所へのコメント・質問なら、その解釈書の slug と表示用の場所 */
  commentary_work?: string | null;
  commentary_label?: string | null;
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
  /** 解釈書の場所へのコメントなら、その解釈書の slug（book_slug は空） */
  commentary_work_slug?: string;
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
  /** 訳非依存の書。読書ページへのリンクを組み立てるのに使う。解釈書への質問では空。 */
  book_slug: string;
  /** 解釈書への質問なら、その解釈書の slug（chapter_number＝章、verse_number＝区切り）。 */
  commentary_work_slug?: string;
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
  /** もとにした版（口語訳 / KJV / R. H. Charles (EN) など）。書名だけでは何から訳すのかが決まらない。 */
  source_book_translation: string;
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
  // 節以外は「まず少しだけ」返る（件数は数えない）。種別を選ぶと最大 20 件まで。
  articles: { id: string; title: string; summary: string; owner_username: string }[];
  plans: { id: string; title: string; description: string; owner_username: string }[];
  questions: { id: string; title: string; body: string; username: string }[];
  projects: { id: string; name: string; description: string; owner_username: string }[];
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

export type ArticleVisibility = "private" | "public";

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
  /** 解釈書の引用（印が [[@…]]）なら、その解釈書の slug。聖書の引用では空。
   *  このとき chapter_number は解釈書の章、verse_number_* は区切りの番号、label はサーバーが組んだ場所の名前。 */
  commentary_work?: string;
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

export type PlanVisibility = "private" | "public";

/** その日に読む章1つ。book は訳に依らない書の slug。 */
export type PlanReading = {
  id: string;
  /** 聖書の章なら書の slug。解釈書の章なら null で、代わりに work が入る。 */
  book: string | null;
  /** 解釈書の章なら、その解釈書の slug（例: "calvin-romans"）。 */
  work?: string | null;
  /** 聖書の書名、または解釈書の題 */
  book_name: string;
  chapter_number: number;
  /** 解釈書の章の題（「第41講　救いの完成」など）。聖書の章では空。 */
  chapter_title?: string;
  translation: string;
  order: number;
  /** その章を読み終えたか。読んでいる人が取ったときだけ意味を持つ。 */
  completed: boolean;
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
  /** 「やめる」を押したときだけ false。読み終わっても true のまま。 */
  is_active: boolean;
  /** プランの日数と、そのうち読み終わった数。読書中と読み終わったの区別に使う。 */
  day_count: number;
  completed_count: number;
};

// ---------------------------------------------------------------------------
// 解釈書（教父・ラシ・カルヴァン・無教会など）。backend/commentary/README.md 参照。
// ---------------------------------------------------------------------------

export type CommentaryTradition = "jewish" | "patristic" | "medieval" | "reformation" | "mukyokai";

/** 節と区切りの結び付き方。structure = 本の作りが節ごと / citation = 章節が書いてある / ai = AI判定 */
export type CommentaryMethod = "structure" | "citation" | "ai";

/** 節のパネルでの見せ分け。discuss = この節を論じる / broad = 章・書全体 / mention = 触れているだけ */
export type CommentaryKind = "discuss" | "broad" | "mention";

export type CommentaryWorkBrief = {
  slug: string;
  title: string;
  title_ja: string;
  author: string;
  author_ja: string;
  year: number | null;
  tradition: CommentaryTradition;
  /** 本文の言語（en / ja） */
  language: string;
};

export type CommentaryWork = CommentaryWorkBrief & {
  translator: string;
  source_name: string;
  source_url: string;
  license: string;
  license_note: string;
  /** true = 頭から通して読める本 / false = 節ごとの抜粋集 */
  readable: boolean;
  section_count: number | null;
  chapter_count: number | null;
};

/** 解釈書の章（書のページの章の選択に並べる）。 */
export type CommentaryChapterBrief = { number: number; title: string; section_count: number };

/** 解釈書の書のページ用。 */
export type CommentaryWorkDetail = CommentaryWork & { chapters: CommentaryChapterBrief[] };

/** 解釈書の章のページの上の部分。 */
export type CommentaryChapterDetail = {
  number: number;
  title: string;
  work: CommentaryWork;
  /** 章そのもの（講など）が論じる聖書の箇所 */
  links: CommentaryLink[];
  prev_number: number | null;
  next_number: number | null;
  section_count: number;
};

/**
 * 解釈書の場所。コメント・Q&A・お気に入りの付き先になる（聖書の書・章・節にあたる）。
 * chapter を省くと書（解釈書）全体、number を省くと章。
 */
export type CommentaryPlace = { work: string; chapter?: number; number?: number };

export type CommentaryLink = {
  book: string;
  chapter: number | null;
  verse: number | null;
  chapter_end: number | null;
  verse_end: number | null;
  method: CommentaryMethod;
  confidence: number | null;
};

/** 解釈書の章のページの1区切り（全文）。聖書の節にあたる。 */
export type CommentarySection = {
  id: string;
  chapter_number: number;
  number: number;
  heading: string;
  text: string;
  source_url: string;
  links: CommentaryLink[];
};

/** ある節についての解釈1件（節のパネル用。本文は抜粋）。number が null なら章（講など）そのもの。 */
export type CommentaryEntry = {
  id: string;
  chapter_number: number;
  number: number | null;
  chapter_title: string;
  heading: string;
  excerpt: string;
  truncated: boolean;
  work: CommentaryWorkBrief;
  method: CommentaryMethod;
  confidence: number | null;
};
