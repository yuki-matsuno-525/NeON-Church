"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  updateProfile,
  fetchBookmarkPage,
  fetchMyCommentPage,
  EMPTY_BOOKMARK_COUNTS,
  type User,
  type Bookmark,
  type BookmarkType,
  type MyComment,
  type BookmarksVisibility,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { useT, formatBookLocation, useRelativeTime } from "@/lib/i18n";
import { passageHref } from "@/lib/passage";
import { AsyncPagedList, SkeletonList, EmptyState, Button, Toggle, FilterChips, type FilterChip } from "@/components/ui";
import { BookmarkCard, BOOKMARK_TYPES, bookmarkKindLabel } from "@/components/bookmarks/BookmarkCard";
import { useLoadMore } from "@/hooks/useLoadMore";
import { handleHorizontalTabListKeyDown } from "@/lib/a11y";

type Tab = "bookmarks" | "comments";

export default function ProfilePage() {
  const { user, loading, setUser } = useAuth();
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();
  const messageId = useId();
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [bioMessage, setBioMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [privacyMessage, setPrivacyMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("bookmarks");
  // お気に入りタブの種類の絞り込み（null は「すべて」）
  const [kind, setKind] = useState<BookmarkType | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?from=/profile");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBio(user.bio);
    }
  }, [user]);

  // 一覧は2つとも「もっと見る」で読み足す。user が入るまでは取りに行かない。
  const fetchBookmarks = useCallback(
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
  const bookmarkList = useLoadMore(fetchBookmarks);

  const fetchComments = useCallback(
    (page: number) =>
      user
        ? fetchMyCommentPage(page)
        : Promise.resolve({
            results: [] as MyComment[],
            count: 0,
            hasMore: false,
            counts: undefined,
          }),
    [user]
  );
  const commentList = useLoadMore(fetchComments);

  if (loading) {
    return (
      <div className="page page-narrow">
        <SkeletonList count={3} />
      </div>
    );
  }

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setBioMessage(null);
    try {
      const updated: User = await updateProfile({ bio });
      setUser(updated);
      setBioMessage({ type: "success", text: t.profileUpdated });
    } catch {
      setBioMessage({ type: "error", text: t.profileUpdateFailed });
    } finally {
      setSaving(false);
    }
  };

  const handleVisibilityToggle = async (next: boolean) => {
    const visibility: BookmarksVisibility = next ? "public" : "private";
    setPrivacyMessage(null);
    setSavingVisibility(true);
    try {
      const updated = await updateProfile({ bookmarks_visibility: visibility });
      setUser(updated);
      setPrivacyMessage({ type: "success", text: t.profileUpdated });
    } catch {
      setPrivacyMessage({ type: "error", text: t.profileUpdateFailed });
    } finally {
      setSavingVisibility(false);
    }
  };

  const joinedDate = new Date(user.created_at).toLocaleDateString(
    lang === "en" ? "en-US" : "ja-JP",
    { year: "numeric", month: "long", day: "numeric" }
  );

  const tabClass = (tab: Tab) =>
    `tab-underline${activeTab === tab ? " tab-underline-active" : ""}`;

  return (
    <div className="page page-narrow">
      <h1 className="mb-8">{t.profileTitle}</h1>

      <div className="mb-6 flex items-center gap-4">
        <span className="avatar-circle avatar-circle-lg">
          {user.username[0]?.toUpperCase() ?? "?"}
        </span>
        <div className="min-w-0">
          <div className="text-lg font-bold break-words">{user.username}</div>
          <Link href={`/profile/${user.username}`} className="text-sm text-accent">
            {t.profile}
          </Link>
          <span aria-hidden="true" className="mx-2 text-faint">·</span>
          <Link href="/settings" className="text-sm text-accent">
            {lang === "ja" ? "アカウント設定" : "Account settings"}
          </Link>
        </div>
      </div>

      <div className="panel-accent mb-6">
        <dl className="m-0 flex flex-col gap-4">
          <div>
            <dt className="mb-1 text-xs text-muted">{t.username}</dt>
            <dd className="m-0 font-bold">{user.username}</dd>
          </div>
          <div>
            <dt className="mb-1 text-xs text-muted">{t.email}</dt>
            <dd className="m-0">{user.email}</dd>
          </div>
          <div>
            <dt className="mb-1 text-xs text-muted">{t.joinedDate}</dt>
            <dd className="m-0">{joinedDate}</dd>
          </div>
        </dl>
      </div>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="mb-4">
          <label htmlFor="bio" className="mb-2 block text-sm font-bold">
            {t.bio}
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder={t.bioPlaceholder}
            autoComplete="off"
            aria-describedby={bioMessage ? messageId : undefined}
            className="form-control resize-y"
          />
          <p className={`mt-1 mb-0 text-right text-xs ${bio.length >= 450 ? "text-warning" : "text-faint"}`}>
            {bio.length}/500
          </p>
        </div>

        {bioMessage && (
          <p
            id={messageId}
            role={bioMessage.type === "error" ? "alert" : "status"}
            aria-live="polite"
            className={`mb-3 text-sm ${bioMessage.type === "success" ? "text-accent" : "text-danger"}`}
          >
            {bioMessage.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving || bio === user.bio}
          className="btn btn-primary"
        >
          {saving ? t.saving : t.save}
        </button>
      </form>

      {/* プライバシー設定 */}
      <section aria-labelledby="privacy-heading" className="panel-accent mb-8">
        <h2 id="privacy-heading" className="mt-0 mb-3 text-md text-body">
          {t.privacyHeading}
        </h2>
        <Toggle
          checked={user.bookmarks_visibility === "public"}
          onChange={handleVisibilityToggle}
          disabled={savingVisibility}
          label={t.bookmarksVisibilityLabel}
          description={t.bookmarksVisibilityHint}
        />
        {privacyMessage && (
          <p role={privacyMessage.type === "error" ? "alert" : "status"} aria-live="polite" className={`mt-3 mb-0 text-xs ${privacyMessage.type === "error" ? "text-danger" : "text-accent"}`}>
            {privacyMessage.text}
          </p>
        )}
      </section>

      <div role="tablist" aria-label={t.profileTitle} onKeyDown={handleHorizontalTabListKeyDown} className="mb-4 flex border-b border-border">
        <button
          id="profile-tab-bookmarks"
          role="tab"
          aria-controls="profile-panel-bookmarks"
          tabIndex={activeTab === "bookmarks" ? 0 : -1}
          className={tabClass("bookmarks")}
          onClick={() => setActiveTab("bookmarks")}
          aria-selected={activeTab === "bookmarks"}
        >
          {t.tabBookmarks} ({bookmarkList.counts?.all ?? 0})
        </button>
        <button
          id="profile-tab-comments"
          role="tab"
          aria-controls="profile-panel-comments"
          tabIndex={activeTab === "comments" ? 0 : -1}
          className={tabClass("comments")}
          onClick={() => setActiveTab("comments")}
          aria-selected={activeTab === "comments"}
        >
          {t.tabComments} ({commentList.total})
        </button>
      </div>

      <div id={`profile-panel-${activeTab}`} role="tabpanel" aria-labelledby={`profile-tab-${activeTab}`}>
      {activeTab === "bookmarks" ? (
        <BookmarkList list={bookmarkList} kind={kind} onKindChange={setKind} />
      ) : (
        <AsyncPagedList
          list={commentList}
          empty={
            <EmptyState
              title={t.noMyComments}
              description={t.emptyMyCommentsDesc}
              action={
                <Link href="/read" className="no-underline">
                  <Button variant="primary">{t.emptyBookmarksCta}</Button>
                </Link>
              }
            />
          }
        >
          <CommentList comments={commentList.items} />
        </AsyncPagedList>
      )}
      </div>
    </div>
  );
}

function BookmarkList({
  list,
  kind,
  onKindChange,
}: {
  /** useLoadMore() の戻り値。読み込み中・失敗・読み足しはまとめて AsyncPagedList に任せる */
  list: ReturnType<typeof useLoadMore<Bookmark, Record<BookmarkType | "all", number>>>;
  kind: BookmarkType | null;
  onKindChange: (kind: BookmarkType | null) => void;
}) {
  const t = useT();
  const counts = list.counts;

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

  return (
    <>
      {/* お気に入りが1件も無いときはチップを出さない（空の「すべて(0)」だけが並ぶのを避ける） */}
      {counts && counts.all > 0 && (
        <FilterChips chips={chips} value={kind} onChange={onKindChange} ariaLabel={t.filterByKind} />
      )}

      <AsyncPagedList
        list={list}
        empty={
          <EmptyState
            title={t.noMyBookmarks}
            description={t.emptyMyBookmarksDesc}
            action={
              <Link href="/read" className="no-underline">
                <Button variant="primary">{t.emptyBookmarksCta}</Button>
              </Link>
            }
          />
        }
      >
        <div className="flex flex-col gap-3">
          {list.items.map((bm) => (
            <BookmarkCard key={bm.id} bookmark={bm} showKind={kind === null} />
          ))}
        </div>
      </AsyncPagedList>
    </>
  );
}

function CommentList({ comments }: { comments: MyComment[] }) {
  const { lang } = useLang();
  const formatRelativeTime = useRelativeTime();
  return (
    <div className="flex flex-col gap-3">
      {comments.map((c) => {
        const href = passageHref(c);
        const inner = (
          <>
            <p className="mt-0 mb-1 text-xs font-bold text-accent">
              {formatBookLocation(c.book_slug, c.chapter_number, c.verse_number, lang)}
            </p>
            <p className="m-0 text-sm leading-base text-body">
              {c.body}
            </p>
            <p className="mt-2 mb-0 text-xs text-faint">
              {formatRelativeTime(c.created_at)} · ▲ {c.vote_count}
            </p>
          </>
        );
        // 箇所が分かるコメントは該当節へのリンクにする（クリックで読書画面のその節へ飛ぶ）。
        return href ? (
          <Link key={c.id} href={href} className="panel-accent panel-accent-sm block no-underline">
            {inner}
          </Link>
        ) : (
          <div key={c.id} className="panel-accent panel-accent-sm">{inner}</div>
        );
      })}
    </div>
  );
}
