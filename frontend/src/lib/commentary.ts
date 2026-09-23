// 解釈書の表示まわりの小道具。サーバー側の画面からも使うので "use client" は付けない。
import type { CommentaryLink } from "./types";
import { bookLabel } from "./i18nFormat";
import { passageHref } from "./passage";

/** 解釈書を読むページで、その区切りの位置を開く URL（節のパネルの「全文を読む」）。 */
export function commentarySectionHref(workSlug: string, order: number): string {
  return `/commentary/${workSlug}?around=${order}#s-${order}`;
}

/** 区切りの箇所を「ローマ 8:28–30」「ロマ書 8章」のように短く書く。 */
export function commentaryLinkLabel(link: CommentaryLink, lang: string): string {
  const name = bookLabel(link.book, lang)?.short ?? link.book;
  if (link.chapter == null) return name;
  const chapterEnd = link.chapter_end ?? link.chapter;
  if (link.verse == null) {
    const unit = lang === "en" ? "" : "章";
    return chapterEnd !== link.chapter
      ? `${name} ${link.chapter}–${chapterEnd}${unit}`
      : `${name} ${link.chapter}${unit}`;
  }
  const verseEnd = link.verse_end ?? link.verse;
  if (chapterEnd !== link.chapter) return `${name} ${link.chapter}:${link.verse}–${chapterEnd}:${verseEnd}`;
  if (verseEnd !== link.verse) return `${name} ${link.chapter}:${link.verse}–${verseEnd}`;
  return `${name} ${link.chapter}:${link.verse}`;
}

/** 区切りの箇所から、読書画面のその場所への URL。 */
export function commentaryLinkHref(link: CommentaryLink): string {
  return passageHref({
    book_slug: link.book,
    chapter_number: link.chapter,
    verse_number: link.verse,
    source_translation: "",
  });
}
