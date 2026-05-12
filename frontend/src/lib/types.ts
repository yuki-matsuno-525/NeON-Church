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
  is_qa: boolean;
  is_deleted: boolean;
  created_at: string;
  vote_count: number;
  tags: Tag[];
};

export type CommentNode = Comment & { children: CommentNode[] };
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
};
export type Bookmark = {
  id: string;
  verse_detail: BookmarkVerseDetail | null;
  comment_detail: BookmarkCommentDetail | null;
  target_type: "verse" | "comment" | null;
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
  avatar_url: string | null;
  created_at: string;
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
};

export type MyComment = {
  id: string;
  user: CommentUser;
  body: string;
  created_at: string;
  vote_count: number;
  location_label: string;
};

export type ReadingProgress = {
  id: string;
  book: string;
  book_name: string;
  chapter: string;
  chapter_number: number;
  updated_at: string;
};

export type QAComment = {
  id: string;
  user: CommentUser;
  body: string;
  created_at: string;
  vote_count: number;
  tags: Tag[];
  location_label: string;
  book_name: string;
  chapter_number: number | null;
  verse_number: number | null;
  reply_count: number;
  best_answer: {
    id: string;
    user: CommentUser;
    body: string;
    created_at: string;
  } | null;
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
  }[];
  books: Book[];
  comments: {
    id: string;
    body: string;
    username: string;
    created_at: string;
    location: string;
  }[];
};

export type PublicUser = {
  id: string;
  username: string;
  bio: string;
  avatar_url: string | null;
  created_at: string;
};
