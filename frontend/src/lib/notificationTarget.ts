import type { Notification } from "./types";
import { BOOKS } from "./books";
import type { Translations } from "./i18n";

function slugFromBookName(name: string | null): string | null {
  if (!name) return null;
  const b = BOOKS.find((x) => x.name === name || x.englishName === name);
  return b?.slug ?? null;
}

/**
 * 通知から遷移先 URL を導く。
 * - 節コメント (verse_comment): /{book_slug}/{chapter}#verse-{verse}
 * - 章コメント (chapter_comment): /{book_slug}/{chapter}#chapter-comments
 * - 書コメント (book_comment):   /{book_slug}#book-comments
 * - QA (qa):                   /qa (詳細ページが未実装のため一覧へ)
 * - 翻訳 (translation_unit):    /translations/{project_id}
 *
 * 解決できない場合は null を返す（呼び出し元で <Link> ではなく <div> にフォールバック）。
 */
export function notificationTargetUrl(n: Notification): string | null {
  switch (n.target_kind) {
    case "verse_comment": {
      const slug = slugFromBookName(n.book_name);
      if (!slug || n.chapter_number == null || n.verse_number == null) return null;
      return `/${slug}/${n.chapter_number}#verse-${n.verse_number}`;
    }
    case "chapter_comment": {
      const slug = slugFromBookName(n.book_name);
      if (!slug || n.chapter_number == null) return null;
      return `/${slug}/${n.chapter_number}#chapter-comments`;
    }
    case "book_comment": {
      const slug = slugFromBookName(n.book_name);
      if (!slug) return null;
      return `/${slug}#book-comments`;
    }
    case "qa":
      // /qa/[id] 詳細ページは未実装 (Step UX-10 以降)
      return "/qa";
    case "translation_unit": {
      if (!n.translation_project_id) return null;
      return `/translations/${n.translation_project_id}`;
    }
    default:
      return null;
  }
}

/**
 * 通知の文脈ラベル（例: 「マタイ 3:12 への返信」「翻訳プロジェクトへのコメント」）。
 * URL とは独立に「どこへの何か」をユーザーに見せるための短文。
 */
export function notificationContextLabel(n: Notification, t: Translations): string | null {
  switch (n.target_kind) {
    case "verse_comment":
      if (!n.book_name || n.chapter_number == null || n.verse_number == null) return null;
      return `${n.book_name} ${t.verseFmt(n.chapter_number, n.verse_number)}`;
    case "chapter_comment":
      if (!n.book_name || n.chapter_number == null) return null;
      return `${n.book_name} ${t.chapterOption(n.chapter_number)}`;
    case "book_comment":
      return n.book_name ?? null;
    case "qa":
      if (n.book_name && n.chapter_number != null && n.verse_number != null) {
        return `Q&A · ${n.book_name} ${t.verseFmt(n.chapter_number, n.verse_number)}`;
      }
      return "Q&A";
    case "translation_unit":
      return t.translationsTitle;
    default:
      return null;
  }
}
