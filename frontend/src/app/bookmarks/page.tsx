"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  fetchBookmarkPage,
  removeBookmark,
  createBookmark,
  createChapterBookmark,
  createBookBookmark,
  createCommentBookmark,
  createProjectBookmark,
  EMPTY_BOOKMARK_COUNTS,
  type Bookmark,
  type BookmarkType,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { resolveVersionVerseIds, resolveVersionChapterIds, resolveVersionBookIds } from "@/lib/versions";
import { useT } from "@/lib/i18n";
import { SkeletonList, EmptyState, ErrorState, Button, FilterChips, LoadMoreButton, type FilterChip } from "@/components/ui";
import { BookmarkCard, BOOKMARK_TYPES, bookmarkKindLabel } from "@/components/bookmarks/BookmarkCard";
import { useLoadMore } from "@/hooks/useLoadMore";

export default function BookmarksPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const t = useT();
  // null は「すべて」タブ
  const [kind, setKind] = useState<BookmarkType | null>(null);
  const [recentlyRemoved, setRecentlyRemoved] = useState<Bookmark | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?from=/bookmarks");
    }
  }, [user, loading, router]);

  // user が入るまでは取りに行かない。kind を変えると1ページ目から読み直す。
  const fetchPage = useCallback(
    (page: number) =>
      user
        ? fetchBookmarkPage({ type: kind ?? undefined, page })
        : Promise.resolve({
            results: [] as Bookmark[],
            count: 0,
            hasMore: false,
            counts: EMPTY_BOOKMARK_COUNTS,
          }),
    [user, kind]
  );
  const { items: bookmarks, setItems, counts, setCounts, loading: fetching, loadingMore, hasMore, error, loadMoreError, loadMore, retry } =
    useLoadMore(fetchPage);

  const handleRemove = async (bm: Bookmark) => {
    setActionBusy(true);
    setActionError(null);
    try {
      await removeBookmark(bm.id);
      setItems((prev) => prev.filter((item) => item.id !== bm.id));
      setCounts((prev) => prev ? {
        ...prev,
        all: Math.max(0, prev.all - 1),
        ...(bm.target_type ? { [bm.target_type]: Math.max(0, prev[bm.target_type] - 1) } : {}),
      } : prev);
      setRecentlyRemoved(bm);
    } catch {
      setActionError(t.bookmarkRemoveFailed);
    } finally {
      setActionBusy(false);
    }
  };

  const handleUndo = async (bm: Bookmark) => {
    setActionBusy(true);
    setActionError(null);
    try {
      // 削除を取り消して同じ対象のお気に入りを作り直す。作成 API の入力は箇所を特定する id なので、
      // お気に入りの種類ごとに元の id を解決してから再作成する。
      let newBm: Bookmark;
      if (bm.target_type === "comment" && bm.comment_detail) {
        newBm = await createCommentBookmark(bm.comment_detail.id);
      } else if (bm.target_type === "project" && bm.project_detail) {
        newBm = await createProjectBookmark(bm.project_detail.id);
      } else if (bm.target_type === "verse" && bm.reference?.chapter && bm.reference?.verse) {
        const ids = await resolveVersionVerseIds(bm.reference.book, bm.reference.chapter, bm.reference.verse);
        if (!ids[0]) throw new Error("Bookmark target not found");
        newBm = await createBookmark(ids[0]);
      } else if (bm.target_type === "chapter" && bm.reference?.chapter) {
        const ids = await resolveVersionChapterIds(bm.reference.book, bm.reference.chapter);
        if (!ids[0]) throw new Error("Bookmark target not found");
        newBm = await createChapterBookmark(ids[0]);
      } else if (bm.target_type === "book" && bm.reference) {
        const ids = await resolveVersionBookIds(bm.reference.book);
        if (!ids[0]) throw new Error("Bookmark target not found");
        newBm = await createBookBookmark(ids[0]);
      } else {
        throw new Error("Bookmark target not found");
      }
      setItems((prev) => [newBm, ...prev]);
      setCounts((prev) => prev ? {
        ...prev,
        all: prev.all + 1,
        ...(newBm.target_type ? { [newBm.target_type]: prev[newBm.target_type] + 1 } : {}),
      } : prev);
      setRecentlyRemoved(null);
    } catch {
      setActionError(t.bookmarkUndoFailed);
    } finally {
      setActionBusy(false);
    }
  };

  // 種類チップ。件数はサーバーが返す全体の数（表示中の件数ではない）。
  const chips: FilterChip<BookmarkType>[] = counts
    ? [
        { value: null, label: t.filterAll, count: counts.all },
        ...BOOKMARK_TYPES.filter((type) => counts[type] > 0).map((type) => ({
          value: type,
          label: bookmarkKindLabel(type, t),
          count: counts[type],
        })),
      ]
    : [];

  const heading = (
    <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, marginBottom: "var(--space-6)" }}>
      {t.bookmarksTitle}
    </h1>
  );

  if (loading || fetching) {
    return (
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 24px" }}>
        {heading}
        <SkeletonList count={3} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 24px" }}>
      {heading}

      {recentlyRemoved && (
        <div role="status" aria-live="polite" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-alt)" }}>
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{t.bookmarkRemovedStatus}</span>
          <button type="button" onClick={() => handleUndo(recentlyRemoved)} disabled={actionBusy} className="btn btn-ghost">
            {t.undo}
          </button>
        </div>
      )}
      {actionError && (
        <p role="alert" aria-live="polite" style={{ color: "var(--state-danger)", fontSize: 13, margin: "0 0 16px" }}>
          {actionError}
        </p>
      )}

      {/* お気に入りが1件も無いときはチップを出さない（空の「すべて(0)」だけが並ぶのを避ける） */}
      {counts && counts.all > 0 && (
        <FilterChips chips={chips} value={kind} onChange={setKind} ariaLabel={t.filterByKind} />
      )}

      {error ? (
        <ErrorState title={t.loadErrorTitle} message={t.loadErrorDesc} onRetry={retry} retryLabel={t.retry} />
      ) : bookmarks.length === 0 ? (
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
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {bookmarks.map((bm) => (
              <BookmarkCard
                key={bm.id}
                bookmark={bm}
                showKind={kind === null}
                onRemove={actionBusy ? undefined : () => handleRemove(bm)}
              />
            ))}
          </div>
          <LoadMoreButton hasMore={hasMore} loading={loadingMore} error={!!loadMoreError} onClick={loadMore} />
        </>
      )}
    </div>
  );
}
