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
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useT, useRelativeTime } from "@/lib/i18n";
import { FilterChips, LoadMoreButton, type FilterChip } from "@/components/ui";
import { BookmarkCard, BOOKMARK_TYPES, bookmarkKindLabel } from "@/components/bookmarks/BookmarkCard";
import { useLoadMore } from "@/hooks/useLoadMore";

type Tab = "favorites" | "comments" | "articles";

export default function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { user: me } = useAuth();
  const t = useT();
  const relTime = useRelativeTime();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("comments");
  // お気に入りタブの種類の絞り込み（null は「すべて」）
  const [kind, setKind] = useState<BookmarkType | null>(null);

  useEffect(() => {
    fetchUserProfile(username)
      .then((p) => {
        setProfile(p);
        // ブックマーク公開ユーザーは favorites を初期タブにする
        if (p.bookmarks_visibility === "public") {
          setActiveTab("favorites");
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [username]);

  useEffect(() => {
    if (!profile) return;
    // 記事は公開されたものだけが返る（下書きは author 指定でも出ない）
    fetchArticles({ author: username })
      .then((response) => setArticles(response.results))
      .catch(() => setArticles([]));
  }, [profile, username]);

  // コメントとお気に入りは「もっと見る」で読み足す。プロフィールが取れるまでは取りに行かない。
  const fetchComments = useCallback(
    (page: number) =>
      profile
        ? fetchUserCommentPage(username, page)
        : Promise.resolve({ results: [] as Comment[], count: 0, hasMore: false, counts: undefined }),
    [profile, username]
  );
  const commentList = useLoadMore(fetchComments);

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

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>{t.loading}</div>;
  if (notFound || !profile) return <div style={{ padding: 32, color: "var(--text-muted)" }}>{t.userNotFound}</div>;

  if (me?.username === username) {
    return (
      <div style={{ padding: 32 }}>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          {t.selfProfileBefore} <Link href="/profile" style={{ color: "var(--accent)" }}>{t.selfProfileLink}</Link>{t.selfProfileAfter}
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
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
      {/* プロフィールヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "var(--bg-alt)", border: "2px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, color: "var(--text-muted)",
        }}>
          {profile.username[0].toUpperCase()}
        </div>
        <div>
          <h1 style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, margin: "0 0 4px" }}>{profile.username}</h1>
          <p style={{ fontSize: 12, color: "var(--text-faint)", margin: 0 }}>
            {t.joinedOn(profile.created_at)}
          </p>
        </div>
      </div>

      {profile.bio && (
        <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 24 }}>
          {profile.bio}
        </p>
      )}

      {/* タブ。ブックマークタブは visibility=public のときのみ表示 */}
      <div style={{ borderBottom: "1px solid var(--border)", marginBottom: 20, display: "flex" }}>
        {profile.bookmarks_visibility === "public" && (
          <button style={tabStyle("favorites")} onClick={() => setActiveTab("favorites")} aria-current={activeTab === "favorites" ? "page" : undefined}>
            {t.tabBookmarks} ({bookmarkList.counts?.all ?? 0})
          </button>
        )}
        <button style={tabStyle("comments")} onClick={() => setActiveTab("comments")} aria-current={activeTab === "comments" ? "page" : undefined}>
          {t.tabComments} ({commentList.total})
        </button>
        {/* 記事が1件も無い人にはタブを出さない（空のタブが並ぶと寂しく見えるため） */}
        {articles.length > 0 && (
          <button style={tabStyle("articles")} onClick={() => setActiveTab("articles")} aria-current={activeTab === "articles" ? "page" : undefined}>
            {t.articles} ({articles.length})
          </button>
        )}
      </div>

      {activeTab === "articles" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {articles.map((article) => (
            <Link key={article.id} href={`/articles/${article.id}`} style={{ ...cardStyle, display: "block", textDecoration: "none" }}>
              <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>{article.title}</p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                {article.summary}
              </p>
            </Link>
          ))}
        </div>
      )}

      {activeTab === "articles" ? null : activeTab === "favorites" && profile.bookmarks_visibility === "public" ? (
        <>
          {/* 栞が1件も無いときはチップを出さない（空の「すべて(0)」だけが並ぶのを避ける） */}
          {bookmarkList.counts && bookmarkList.counts.all > 0 && (
            <FilterChips chips={bookmarkChips} value={kind} onChange={setKind} ariaLabel={t.filterByKind} />
          )}
          {bookmarkList.items.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{t.noMyBookmarks}</p>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {bookmarkList.items.map((bm) => (
                  <BookmarkCard key={bm.id} bookmark={bm} showKind={kind === null} />
                ))}
              </div>
              <LoadMoreButton
                hasMore={bookmarkList.hasMore}
                loading={bookmarkList.loadingMore}
                onClick={bookmarkList.loadMore}
              />
            </>
          )}
        </>
      ) : commentList.items.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{t.noMyComments}</p>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {commentList.items.map((c) => (
              <div key={c.id} style={cardStyle}>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>
                  {c.body}
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--text-faint)" }}>
                  {relTime(c.created_at)} · ▲ {(c as Comment & { vote_count?: number }).vote_count ?? 0}
                </p>
              </div>
            ))}
          </div>
          <LoadMoreButton
            hasMore={commentList.hasMore}
            loading={commentList.loadingMore}
            onClick={commentList.loadMore}
          />
        </>
      )}
    </div>
  );
}
