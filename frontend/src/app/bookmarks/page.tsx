"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  fetchBookmarks,
  removeBookmark,
  createBookmark,
  createChapterBookmark,
  createBookBookmark,
  createCommentBookmark,
  createProjectBookmark,
  type Bookmark,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { bookLabel, formatBookLocation } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { resolveVersionVerseIds, resolveVersionChapterIds, resolveVersionBookIds } from "@/lib/versions";
import { passageHref } from "@/lib/passage";
import { useT } from "@/lib/i18n";
import { SkeletonList, EmptyState, Button } from "@/components/ui";

export default function BookmarksPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [fetching, setFetching] = useState(true);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?from=/bookmarks");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    fetchBookmarks()
      .then(setBookmarks)
      .catch(() => setBookmarks([]))
      .finally(() => setFetching(false));
  }, [user]);

  const handleRemove = async (bm: Bookmark) => {
    await removeBookmark(bm.id);
    setRemovedIds((prev) => new Set(prev).add(bm.id));
  };

  const handleUndo = async (bm: Bookmark) => {
    // 削除を取り消して同じ対象の栞を作り直す。作成 API の入力は箇所を特定する id なので、
    // 栞の種類ごとに元の id を解決してから再作成する。
    let newBm: Bookmark;
    if (bm.target_type === "comment" && bm.comment_detail) {
      newBm = await createCommentBookmark(bm.comment_detail.id);
    } else if (bm.target_type === "project" && bm.project_detail) {
      newBm = await createProjectBookmark(bm.project_detail.id);
    } else if (bm.target_type === "verse" && bm.reference?.chapter && bm.reference?.verse) {
      const ids = await resolveVersionVerseIds(bm.reference.book, bm.reference.chapter, bm.reference.verse);
      if (!ids[0]) return;
      newBm = await createBookmark(ids[0]);
    } else if (bm.target_type === "chapter" && bm.reference?.chapter) {
      const ids = await resolveVersionChapterIds(bm.reference.book, bm.reference.chapter);
      if (!ids[0]) return;
      newBm = await createChapterBookmark(ids[0]);
    } else if (bm.target_type === "book" && bm.reference) {
      const ids = await resolveVersionBookIds(bm.reference.book);
      if (!ids[0]) return;
      newBm = await createBookBookmark(ids[0]);
    } else {
      return;
    }
    setBookmarks((prev) => prev.map((b) => (b.id === bm.id ? newBm : b)));
    setRemovedIds((prev) => {
      const next = new Set(prev);
      next.delete(bm.id);
      return next;
    });
  };

  if (loading || fetching) {
    return (
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 24px" }}>
        <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, marginBottom: "var(--space-6)" }}>
          {t.bookmarksTitle}
        </h1>
        <SkeletonList count={3} />
      </div>
    );
  }

  const cardBase: React.CSSProperties = {
    background: "var(--bg-alt)",
    border: "1px solid var(--border)",
    borderLeft: "3px solid var(--accent)",
    borderRadius: 10,
    padding: "16px",
  };

  const removedStyle: React.CSSProperties = {
    opacity: 0.45,
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 24px" }}>
      <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, marginBottom: "var(--space-6)" }}>
        {t.bookmarksTitle}
      </h1>

      {bookmarks.length === 0 ? (
        <EmptyState
          title={t.noBookmarks}
          description={t.emptyBookmarksDesc}
          action={
            <Link href="/read" style={{ textDecoration: "none" }}>
              <Button variant="primary">{t.emptyBookmarksCta}</Button>
            </Link>
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {bookmarks.map((bm) => {
            const isRemoved = removedIds.has(bm.id);

            if (bm.target_type === "comment" && bm.comment_detail) {
              const cd = bm.comment_detail;
              // コメント栞も、その節（書・章・節）へ飛べるようにする。ラベルは表示言語の書名で出す。
              const commentHref = cd.book_slug ? passageHref(cd) : "";
              const cdLabel = cd.book_slug ? formatBookLocation(cd.book_slug, cd.chapter_number, cd.verse_number, lang) : "";
              return (
                <div key={bm.id} style={{ ...cardBase, ...(isRemoved ? removedStyle : {}) }}>
                  <Link
                    href={isRemoved || !commentHref ? "#" : commentHref}
                    onClick={(e) => (isRemoved || !commentHref) && e.preventDefault()}
                    style={{ display: "block", textDecoration: "none", color: "inherit" }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", margin: "0 0 6px" }}>
                      {cdLabel ? `${cdLabel} · ` : ""}{t.commentBy(cd.username)}
                    </p>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--text-muted)" }}>
                      {cd.body}
                    </p>
                  </Link>
                  <div style={{ marginTop: 8, display: "flex", gap: 12 }}>
                    {isRemoved ? (
                      <button onClick={() => handleUndo(bm)} style={undoButtonStyle}>
                        {t.undo}
                      </button>
                    ) : (
                      <button onClick={() => handleRemove(bm)} style={removeButtonStyle}>
                        {t.remove}
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            // 翻訳プロジェクト栞：プロジェクトのページへ。
            if (bm.target_type === "project" && bm.project_detail) {
              const pd = bm.project_detail;
              return (
                <div key={bm.id} style={{ ...cardBase, ...(isRemoved ? removedStyle : {}) }}>
                  <Link
                    href={isRemoved ? "#" : `/translations/${pd.id}`}
                    onClick={(e) => isRemoved && e.preventDefault()}
                    style={{ display: "block", textDecoration: "none", color: "var(--text)" }}
                  >
                    <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", margin: "0 0 4px" }}>
                      {t.bookmarkKindProject}
                    </p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)", margin: 0 }}>
                      {pd.name}
                    </p>
                  </Link>
                  <div style={{ marginTop: 8 }}>
                    {isRemoved ? (
                      <button onClick={() => handleUndo(bm)} style={undoButtonStyle}>{t.undo}</button>
                    ) : (
                      <button onClick={() => handleRemove(bm)} style={removeButtonStyle}>{t.remove}</button>
                    )}
                  </div>
                </div>
              );
            }

            if (!bm.reference) return null;
            // 箇所栞（節／章／書）。粒度に応じてラベル・リンク先・種別バッジを変える。
            const label = bookLabel(bm.reference.book, lang)?.name ?? bm.reference.book;
            let locationText: string;
            let href: string;
            let kindLabel: string;
            if (bm.reference.verse != null && bm.reference.chapter != null) {
              locationText = `${label} ${t.verseFmt(bm.reference.chapter, bm.reference.verse)}`;
              href = `/${bm.reference.book}/${bm.reference.chapter}#verse-${bm.reference.verse}`;
              kindLabel = t.bookmarkKindVerse;
            } else if (bm.reference.chapter != null) {
              locationText = `${label} ${t.chapterFmt(bm.reference.chapter)}`;
              href = `/${bm.reference.book}/${bm.reference.chapter}`;
              kindLabel = t.bookmarkKindChapter;
            } else {
              locationText = label;
              href = `/${bm.reference.book}?list=1`;
              kindLabel = t.bookmarkKindBook;
            }

            return (
              <div key={bm.id} style={{ ...cardBase, ...(isRemoved ? removedStyle : {}) }}>
                <Link
                  href={isRemoved ? "#" : href}
                  onClick={(e) => isRemoved && e.preventDefault()}
                  style={{ display: "block", textDecoration: "none", color: "var(--text)" }}
                >
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", margin: "0 0 4px" }}>
                    {kindLabel}
                  </p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", margin: 0 }}>
                    {locationText}
                  </p>
                  {bm.verse_text && (
                    <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.6, color: "var(--text-muted)" }}>
                      {bm.verse_text}
                    </p>
                  )}
                </Link>
                <div style={{ marginTop: 8 }}>
                  {isRemoved ? (
                    <button onClick={() => handleUndo(bm)} style={undoButtonStyle}>
                      {t.undo}
                    </button>
                  ) : (
                    <button onClick={() => handleRemove(bm)} style={removeButtonStyle}>
                      {t.remove}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const removeButtonStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--text-faint)",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 0,
  fontFamily: "inherit",
};

const undoButtonStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--accent)",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 0,
  fontFamily: "inherit",
  fontWeight: 700,
};
