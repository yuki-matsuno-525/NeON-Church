"use client";

import Link from "next/link";
import type { Bookmark, BookmarkType } from "@/lib/api";
import { bookLabel, formatBookLocation, useT } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { passageHref } from "@/lib/passage";

/**
 * お気に入り1件のカード。
 *
 * お気に入りには節・章・書・コメント・翻訳企画の5種が入る。以前は /bookmarks と
 * プロフィール2画面がそれぞれ同じ表示を書いていて、直すたびに3箇所さわる必要があった。
 * 表示はここに1つだけ持ち、画面側は一覧の並びと操作だけを受け持つ。
 *
 * onRemove を渡さない画面（他人のプロフィール）では操作ボタンを出さない。
 */

/** 種類 → リンク先と表示文字列。種類ごとの分岐をここに閉じ込める。 */
function useBookmarkTarget(bookmark: Bookmark) {
  const t = useT();
  const { lang } = useLang();

  if (bookmark.target_type === "comment" && bookmark.comment_detail) {
    const cd = bookmark.comment_detail;
    const label = cd.book_slug
      ? formatBookLocation(cd.book_slug, cd.chapter_number, cd.verse_number, lang)
      : "";
    return {
      kindLabel: t.bookmarkKindComment,
      // コメントのお気に入りも、そのコメントが付いた箇所へ飛べるようにする。
      href: cd.book_slug ? passageHref(cd) : "",
      title: `${label ? `${label} · ` : ""}${t.commentBy(cd.username)}`,
      body: cd.is_deleted ? t.deletedComment : cd.body,
    };
  }

  if (bookmark.target_type === "project" && bookmark.project_detail) {
    const pd = bookmark.project_detail;
    return {
      kindLabel: t.bookmarkKindProject,
      href: `/translations/${pd.id}`,
      title: pd.name,
      body: null,
    };
  }

  const ref = bookmark.reference;
  if (!ref) return null;

  // 箇所のお気に入り（節／章／書）。粒度に応じてラベル・リンク先・種別を変える。
  const book = bookLabel(ref.book, lang)?.name ?? ref.book;
  if (ref.verse != null && ref.chapter != null) {
    return {
      kindLabel: t.bookmarkKindVerse,
      href: `/${ref.book}/${ref.chapter}#verse-${ref.verse}`,
      title: `${book} ${t.verseFmt(ref.chapter, ref.verse)}`,
      body: bookmark.verse_text ?? null,
    };
  }
  if (ref.chapter != null) {
    return {
      kindLabel: t.bookmarkKindChapter,
      href: `/${ref.book}/${ref.chapter}`,
      title: `${book} ${t.chapterFmt(ref.chapter)}`,
      body: null,
    };
  }
  return {
    kindLabel: t.bookmarkKindBook,
    href: `/${ref.book}?list=1`,
    title: book,
    body: null,
  };
}

export function BookmarkCard({
  bookmark,
  showKind = true,
  removed = false,
  onRemove,
  onUndo,
}: {
  bookmark: Bookmark;
  /** 種類で絞り込み中は全部同じ種類なのでバッジを出さない */
  showKind?: boolean;
  removed?: boolean;
  onRemove?: () => void;
  onUndo?: () => void;
}) {
  const t = useT();
  const target = useBookmarkTarget(bookmark);
  if (!target) return null;

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-alt)",
    border: "1px solid var(--border)",
    borderLeft: "3px solid var(--accent)",
    borderRadius: 10,
    padding: 16,
    ...(removed ? { opacity: 0.45 } : {}),
  };

  const inner = (
    <>
      {showKind && (
        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", margin: "0 0 4px" }}>
          {target.kindLabel}
        </p>
      )}
      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", margin: 0 }}>
        {target.title}
      </p>
      {target.body && (
        <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.6, color: "var(--text-muted)", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {target.body}
        </p>
      )}
    </>
  );

  // 削除済み（取り消し待ち）とリンク先が無いときは、押しても飛ばないようにする。
  const inactive = removed || !target.href;

  return (
    <div style={cardStyle}>
      {inactive ? (
        <div style={{ color: "var(--text)" }}>{inner}</div>
      ) : (
        <Link href={target.href} style={{ display: "block", textDecoration: "none", color: "var(--text)" }}>
          {inner}
        </Link>
      )}
      {onRemove && (
        <div style={{ marginTop: 8, display: "flex", gap: 12 }}>
          {removed ? (
            <button type="button" onClick={onUndo} style={undoButtonStyle}>
              {t.undo}
            </button>
          ) : (
            <button type="button" onClick={onRemove} style={removeButtonStyle}>
              {t.remove}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** チップに出す種類の並び。「すべて」は画面側が先頭に足す。 */
export const BOOKMARK_TYPES: BookmarkType[] = ["verse", "chapter", "book", "comment", "project"];

export function bookmarkKindLabel(type: BookmarkType, t: ReturnType<typeof useT>): string {
  switch (type) {
    case "verse":
      return t.bookmarkKindVerse;
    case "chapter":
      return t.bookmarkKindChapter;
    case "book":
      return t.bookmarkKindBook;
    case "comment":
      return t.bookmarkKindComment;
    case "project":
      return t.bookmarkKindProject;
  }
}

const removeButtonStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--text-faint)",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: "6px 8px",
  minHeight: 44,
  fontFamily: "inherit",
};

const undoButtonStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--accent)",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: "6px 8px",
  minHeight: 44,
  fontFamily: "inherit",
  fontWeight: 700,
};
