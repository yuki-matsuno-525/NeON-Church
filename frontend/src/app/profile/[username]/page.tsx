"use client";

import { useCallback, useEffect, useState, use } from "react";
import Link from "next/link";
import {
  fetchUserProfile,
  fetchUserCommentPage,
  fetchUserBookmarkPage,
  fetchArticles,
  EMPTY_BOOKMARK_COUNTS,
  type PublicUser,
  type Comment,
  type Bookmark,
  type BookmarkType,
  type Article,
  type ApiError,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useT, useRelativeTime } from "@/lib/i18n";
import { EmptyState, ErrorState, FilterChips, LoadMoreButton, SkeletonList, type FilterChip } from "@/components/ui";
import { BookmarkCard, BOOKMARK_TYPES, bookmarkKindLabel } from "@/components/bookmarks/BookmarkCard";
import { useLoadMore } from "@/hooks/useLoadMore";
import { handleHorizontalTabListKeyDown } from "@/lib/a11y";

type Tab = "favorites" | "comments" | "articles";

export default function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { user: me } = useAuth();
  const t = useT();
  const relTime = useRelativeTime();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [profileError, setProfileError] = useState(false);
  const [profileReload, setProfileReload] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>("comments");
  // お気に入りタブの種類の絞り込み（null は「すべて」）
  const [kind, setKind] = useState<BookmarkType | null>(null);

  useEffect(() => {
    fetchUserProfile(username)
      .then((p) => {
        setProfile(p);
        // お気に入り公開ユーザーは favorites を初期タブにする
        if (p.bookmarks_visibility === "public") {
          setActiveTab("favorites");
        }
      })
      .catch((cause: ApiError) => {
        if (cause.status === 404) setNotFound(true);
        else setProfileError(true);
      })
      .finally(() => setLoading(false));
  }, [username, profileReload]);

  // コメントとお気に入りは「もっと見る」で読み足す。プロフィールが取れるまでは取りに行かない。
  const fetchComments = useCallback(
    (page: number) =>
      profile
        ? fetchUserCommentPage(username, page)
        : Promise.resolve({ results: [] as Comment[], count: 0, hasMore: false, counts: undefined }),
    [profile, username]
  );
  const commentList = useLoadMore(fetchComments);

  // 公開記事も他のアクティビティと同じく、失敗と空を分けてページ単位で読み足す。
  const fetchArticlePage = useCallback(
    (page: number) =>
      profile
        ? fetchArticles({ author: username, page }).then((response) => ({
            results: response.results,
            count: response.count,
            hasMore: response.next !== null,
            counts: undefined,
          }))
        : Promise.resolve({ results: [] as Article[], count: 0, hasMore: false, counts: undefined }),
    [profile, username],
  );
  const articleList = useLoadMore(fetchArticlePage);

  // 非公開ユーザーはお気に入り API を呼ばない（空が返るが無駄な往復を避ける）。
  const isPublicBookmarks = profile?.bookmarks_visibility === "public";
  const fetchBookmarks = useCallback(
    (page: number) =>
      isPublicBookmarks
        ? fetchUserBookmarkPage(username, { type: kind ?? undefined, page })
        : Promise.resolve({
            results: [] as Bookmark[],
            count: 0,
            hasMore: false,
            counts: EMPTY_BOOKMARK_COUNTS,
          }),
    [isPublicBookmarks, username, kind]
  );
  const bookmarkList = useLoadMore(fetchBookmarks);

  if (loading) return <div className="p-8 text-muted">{t.loading}</div>;
  if (profileError) return (
    <div className="page page-narrow">
      <ErrorState
        title={t.profileLoadFailed}
        message={t.loadErrorDesc}
        onRetry={() => { setProfileError(false); setLoading(true); setProfileReload((value) => value + 1); }}
        retryLabel={t.retry}
      />
    </div>
  );
  if (notFound || !profile) return <div className="p-8 text-muted">{t.userNotFound}</div>;

  if (me?.username === username) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted">
          {t.selfProfileBefore} <Link href="/profile" className="text-accent">{t.selfProfileLink}</Link>{t.selfProfileAfter}
        </p>
      </div>
    );
  }

  // 種類チップ。件数はサーバーが返す全体の数（表示中の件数ではない）。
  const counts = bookmarkList.counts;
  const bookmarkChips: FilterChip<BookmarkType>[] = counts
    ? [
        { value: null, label: t.filterAll, count: counts.all },
        ...BOOKMARK_TYPES.filter((type) => counts[type] > 0).map((type) => ({
          value: type,
          label: bookmarkKindLabel(type, t),
          count: counts[type],
        })),
      ]
    : [];

  const tabStyle = (tab: Tab): React.CSSProperties => ({
    padding: "8px 16px",
    background: "transparent",
    border: "none",
    borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
    color: activeTab === tab ? "var(--accent)" : "var(--text-muted)",
    fontWeight: activeTab === tab ? 700 : 400,
    cursor: "pointer",
    fontSize: 14,
    fontFamily: "inherit",
  });

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-alt)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    padding: "12px 14px",
  };

  return (
    <div className="page page-narrow">
      {/* プロフィールヘッダー */}
      <div className="flex items-center gap-4 mb-6">
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "var(--bg-alt)", border: "2px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, color: "var(--text-muted)",
        }}>
          {profile.username[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-lg font-bold mt-0 mx-0 mb-1">{profile.username}</h1>
          <p className="text-xs text-faint m-0">
            {t.joinedOn(profile.created_at)}
          </p>
        </div>
      </div>

      {profile.bio && (
        <p className="text-sm text-muted leading-base mb-6 whitespace-pre-wrap">
          {profile.bio}
        </p>
      )}

      {/* タブ。お気に入りタブは visibility=public のときのみ表示 */}
      <div role="tablist" aria-label={profile.username} onKeyDown={handleHorizontalTabListKeyDown} style={{ borderBottom: "1px solid var(--border)", marginBottom: 20, display: "flex", overflowX: "auto" }}>
        {profile.bookmarks_visibility === "public" && (
          <button id="public-profile-tab-favorites" role="tab" aria-controls="public-profile-panel-favorites" tabIndex={activeTab === "favorites" ? 0 : -1} style={tabStyle("favorites")} onClick={() => setActiveTab("favorites")} aria-selected={activeTab === "favorites"}>
            {t.tabBookmarks} ({bookmarkList.counts?.all ?? 0})
          </button>
        )}
        <button id="public-profile-tab-comments" role="tab" aria-controls="public-profile-panel-comments" tabIndex={activeTab === "comments" ? 0 : -1} style={tabStyle("comments")} onClick={() => setActiveTab("comments")} aria-selected={activeTab === "comments"}>
          {t.tabComments} ({commentList.total})
        </button>
        <button id="public-profile-tab-articles" role="tab" aria-controls="public-profile-panel-articles" tabIndex={activeTab === "articles" ? 0 : -1} style={tabStyle("articles")} onClick={() => setActiveTab("articles")} aria-selected={activeTab === "articles"}>
          {t.articles} ({articleList.total})
        </button>
      </div>

      {activeTab === "articles" && (
        <div id="public-profile-panel-articles" role="tabpanel" aria-labelledby="public-profile-tab-articles" className="flex flex-col gap-3">
          {articleList.loading ? (
            <SkeletonList count={3} />
          ) : articleList.error ? (
            <ErrorState title={t.loadErrorTitle} message={t.loadErrorDesc} onRetry={articleList.retry} retryLabel={t.retry} />
          ) : articleList.items.length === 0 ? (
            <EmptyState title={t.noArticles} description={t.emptyArticlesDesc} />
          ) : (
            <>
              {articleList.items.map((article) => (
                <Link key={article.id} href={`/articles/${article.id}`} style={{ ...cardStyle, display: "block", textDecoration: "none" }}>
                  <p className="text-sm font-bold mt-0 mx-0 mb-1">{article.title}</p>
                  <p className="m-0 text-sm text-muted leading-base">
                    {article.summary}
                  </p>
                </Link>
              ))}
              <LoadMoreButton
                hasMore={articleList.hasMore}
                loading={articleList.loadingMore}
                error={!!articleList.loadMoreError}
                onClick={articleList.loadMore}
              />
            </>
          )}
        </div>
      )}

      {activeTab !== "articles" && (
      <div id={`public-profile-panel-${activeTab}`} role="tabpanel" aria-labelledby={`public-profile-tab-${activeTab}`}>
      {activeTab === "favorites" && profile.bookmarks_visibility === "public" ? (
        <>
          {/* お気に入りが1件も無いときはチップを出さない（空の「すべて(0)」だけが並ぶのを避ける） */}
          {bookmarkList.counts && bookmarkList.counts.all > 0 && (
            <FilterChips chips={bookmarkChips} value={kind} onChange={setKind} ariaLabel={t.filterByKind} />
          )}
          {bookmarkList.loading ? (
            <SkeletonList count={3} />
          ) : bookmarkList.error ? (
            <ErrorState title={t.loadErrorTitle} message={t.loadErrorDesc} onRetry={bookmarkList.retry} retryLabel={t.retry} />
          ) : bookmarkList.items.length === 0 ? (
            <p className="text-sm text-muted">{t.noMyBookmarks}</p>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {bookmarkList.items.map((bm) => (
                  <BookmarkCard key={bm.id} bookmark={bm} showKind={kind === null} />
                ))}
              </div>
              <LoadMoreButton
                hasMore={bookmarkList.hasMore}
                loading={bookmarkList.loadingMore}
                error={!!bookmarkList.loadMoreError}
                onClick={bookmarkList.loadMore}
              />
            </>
          )}
        </>
      ) : commentList.loading ? (
        <SkeletonList count={3} />
      ) : commentList.error ? (
        <ErrorState title={t.loadErrorTitle} message={t.loadErrorDesc} onRetry={commentList.retry} retryLabel={t.retry} />
      ) : commentList.items.length === 0 ? (
        <p className="text-sm text-muted">{t.noMyComments}</p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {commentList.items.map((c) => (
              <div key={c.id} style={cardStyle}>
                <p className="m-0 text-sm text-body leading-base">
                  <span className="whitespace-pre-wrap">{c.body}</span>
                </p>
                <p className="mt-2 mx-0 mb-0 text-xs text-faint">
                  {relTime(c.created_at)} · ▲ {(c as Comment & { vote_count?: number }).vote_count ?? 0}
                </p>
              </div>
            ))}
          </div>
          <LoadMoreButton
            hasMore={commentList.hasMore}
            loading={commentList.loadingMore}
            error={!!commentList.loadMoreError}
            onClick={commentList.loadMore}
          />
        </>
      )}
      </div>
      )}
    </div>
  );
}
