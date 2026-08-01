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
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

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
  const { items: bookmarks, setItems, counts, loading: fetching, loadingMore, hasMore, loadMore, failed, reload } =
    useLoadMore(fetchPage);

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
    setItems((prev) => prev.map((b) => (b.id === bm.id ? newBm : b)));
    setRemovedIds((prev) => {
      const next = new Set(prev);
      next.delete(bm.id);
      return next;
    });
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

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 24px" }}>
      {heading}

      {/* 栞が1件も無いときはチップを出さない（空の「すべて(0)」だけが並ぶのを避ける） */}
      {counts && counts.all > 0 && (
        <FilterChips chips={chips} value={kind} onChange={setKind} ariaLabel={t.filterByKind} />
      )}

      {/* 取りに行けなかったときは「1件も無い」と言わない。理由と、やり直す手段を出す。 */}
      {failed ? (
        <ErrorState title={t.errorTitle} message={t.errorNetwork} onRetry={reload} />
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
                removed={removedIds.has(bm.id)}
                onRemove={() => handleRemove(bm)}
                onUndo={() => handleUndo(bm)}
              />
            ))}
          </div>
          <LoadMoreButton hasMore={hasMore} loading={loadingMore} onClick={loadMore} />
        </>
      )}
    </div>
  );
}
