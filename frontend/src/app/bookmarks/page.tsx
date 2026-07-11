"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchBookmarks, removeBookmark, createBookmark, createCommentBookmark, type Bookmark } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { bookLabel } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { resolveVersionVerseIds } from "@/lib/versions";
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
    let newBm: Bookmark;
    if (bm.target_type === "comment" && bm.comment_detail) {
      newBm = await createCommentBookmark(bm.comment_detail.id);
    } else if (bm.reference) {
      // 箇所から verse_id を解決して再作成する（作成 API の入力は verse_id のまま）。
      const ids = await resolveVersionVerseIds(bm.reference.book, bm.reference.chapter, bm.reference.verse);
      if (!ids[0]) return;
      newBm = await createBookmark(ids[0]);
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
              return (
                <div key={bm.id} style={{ ...cardBase, ...(isRemoved ? removedStyle : {}) }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", margin: "0 0 6px" }}>
                    {t.commentBy(bm.comment_detail.username)}
                  </p>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--text-muted)" }}>
                    {bm.comment_detail.body}
                  </p>
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

            if (!bm.reference) return null;
            const label = bookLabel(bm.reference.book, lang)?.name ?? bm.reference.book;
            const href = `/${bm.reference.book}/${bm.reference.chapter}#verse-${bm.reference.verse}`;

            return (
              <div key={bm.id} style={{ ...cardBase, ...(isRemoved ? removedStyle : {}) }}>
                <Link
                  href={isRemoved ? "#" : href}
                  onClick={(e) => isRemoved && e.preventDefault()}
                  style={{ display: "block", textDecoration: "none", color: "var(--text)" }}
                >
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", margin: 0 }}>
                    {label} {t.verseFmt(bm.reference.chapter, bm.reference.verse)}
                  </p>
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
