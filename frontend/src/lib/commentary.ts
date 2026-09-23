// 解釈書の表示まわりの小道具。サーバー側の画面からも使うので "use client" は付けない。
import type { CommentaryLink, CommentaryPlace } from "./types";
import { bookLabel } from "./i18nFormat";
import { passageHref } from "./passage";

/**
 * 章のページの1ページの区切りの数。サーバー側（章のページ）とブラウザ側（読み足し）で同じ数を使う。
 * "use client" のファイルに置くとサーバー側から値として読めないので、ここに置く。
 */
export const SECTION_PAGE_SIZE = 50;

/**
 * 解釈書の場所（書・章・区切り）のページへの URL。聖書の passageHref の解釈書版。
 * 区切りまであれば #s-<番号> でその区切りへ。
 */
export function commentaryPlaceHref(place: CommentaryPlace): string {
  const base = `/commentary/${place.work}`;
  if (place.chapter == null) return base;
  if (place.number == null) return `${base}/${place.chapter}`;
  // ?s= はサーバーが「その区切りを含むページ」から開くための印、#s- はそこまで送るための印。
  return `${base}/${place.chapter}?s=${place.number}#s-${place.number}`;
}

/** 節のパネルの「全文を読む」。区切りならその区切り、章（講など）ならその章。 */
export function commentarySectionHref(workSlug: string, chapter: number, number: number | null): string {
  return commentaryPlaceHref({ work: workSlug, chapter, number: number ?? undefined });
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
