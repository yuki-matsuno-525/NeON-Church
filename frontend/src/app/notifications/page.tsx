"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  fetchNotificationPage,
  markAllNotificationsRead,
  markNotificationRead,
  EMPTY_NOTIFICATION_COUNTS,
  type Notification,
  type NotificationType,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useRelativeTime, useT } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { AsyncList, SkeletonList, EmptyState, FilterChips, LoadMoreButton, type FilterChip } from "@/components/ui";
import {
  notificationTargetUrl,
  notificationContextLabel,
} from "@/lib/notificationTarget";
import { useLoadMore } from "@/hooks/useLoadMore";

// チップに出す種類の並び。
const NOTIFICATION_TYPES: NotificationType[] = ["reply", "upvote", "mention"];

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  // 未読件数は画面が持っている分から数えず、サーバーの数（NotificationContext）を使う。
  // 一覧は1ページずつしか持たないので、読み込み済みの分だけでは全体の未読数が分からない。
  const { unreadCount, decrementUnread, clearUnread, refresh } = useNotifications();
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();
  // null は「すべて」タブ
  const [kind, setKind] = useState<NotificationType | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [busyNotificationId, setBusyNotificationId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const typeLabel = (type: string): string => {
    if (type === "reply") return t.notifReply;
    if (type === "upvote") return t.notifUpvote;
    if (type === "mention") return t.notifMention;
    return type;
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?from=/notifications");
    }
  }, [user, loading, router]);

  // user が入るまでは取りに行かない。kind を変えると1ページ目から読み直す。
  const fetchPage = useCallback(
    (page: number) =>
      user
        ? fetchNotificationPage({ type: kind ?? undefined, page })
        : Promise.resolve({
            results: [] as Notification[],
            count: 0,
            hasMore: false,
            counts: EMPTY_NOTIFICATION_COUNTS,
          }),
    [user, kind]
  );
  const {
    items: notifications,
    setItems: setNotifications,
    counts,
    loading: fetching,
    loadingMore,
    hasMore,
    loadMoreError,
    loadMore,
    retry,
    failed,
  } = useLoadMore(fetchPage);

  // 既読にできなかったときに画面だけ既読の見た目になると、未読の数字とも食い違う。
  // 失敗したら知らせて、表示は変えない。
  const handleMarkAll = async () => {
    setActionBusy(true);
    setActionError(null);
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      clearUnread();
      await refresh();
    } catch {
      setActionError(t.notificationActionFailed);
    } finally {
      setActionBusy(false);
    }
  };

  const handleMarkOne = async (n: Notification) => {
    if (n.is_read) return;
    setBusyNotificationId(n.id);
    setActionError(null);
    try {
      await markNotificationRead(n.id);
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
      );
      decrementUnread();
      await refresh();
    } catch {
      setActionError(t.notificationActionFailed);
    } finally {
      setBusyNotificationId(null);
    }
  };

  // 種類チップ。件数はサーバーが返す全体の数（表示中の件数ではない）。
  const chips: FilterChip<NotificationType>[] = counts
    ? [
        { value: null, label: t.filterAll, count: counts.all },
        ...NOTIFICATION_TYPES.filter((type) => counts[type] > 0).map((type) => ({
          value: type,
          label: typeLabel(type),
          count: counts[type],
        })),
      ]
    : [];

  if (loading || fetching) {
    return (
      <div className="page page-narrow">
        <h1 className="text-xl font-bold mb-8">{t.notificationsTitle}</h1>
        <SkeletonList count={4} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="page page-narrow">
      <div
        className="flex items-center justify-between mb-6"
      >
        <h1 className="text-xl font-bold">{t.notificationsTitle}</h1>
        <button
          onClick={handleMarkAll}
          disabled={unreadCount === 0 || actionBusy}
          aria-busy={actionBusy}
          className="outline-button disabled:opacity-60 disabled:cursor-default"
        >
          {t.markAllRead}
        </button>
      </div>

      {actionError && (
        <p role="alert" aria-live="polite" className="-mt-3 mx-0 mb-4 text-danger text-sm">
          {actionError}
        </p>
      )}

      {/* 通知が1件も無いときはチップを出さない（空の「すべて(0)」だけが並ぶのを避ける） */}
      {counts && counts.all > 0 && (
        <FilterChips chips={chips} value={kind} onChange={setKind} ariaLabel={t.filterByKind} />
      )}

      <AsyncList
        loading={false}
        error={failed}
        onRetry={retry}
        isEmpty={notifications.length === 0}
        empty={<EmptyState title={t.noNotifications} description={t.emptyNotificationsDesc} />}
      >
        <div className="flex flex-col gap-1">
            {notifications.map((n) => {
              const url = notificationTargetUrl(n);
              const contextLabel = notificationContextLabel(n, t, lang);
              return (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  url={url}
                  contextLabel={contextLabel}
                  typeLabel={typeLabel(n.notification_type)}
                  unreadLabel={t.notificationUnread}
                  busy={busyNotificationId === n.id}
                  onActivate={() => handleMarkOne(n)}
                />
              );
            })}
        </div>
        <LoadMoreButton hasMore={hasMore} loading={loadingMore} error={!!loadMoreError} onClick={loadMore} />
      </AsyncList>
    </div>
  );
}

function NotificationItem({
  notification: n,
  url,
  contextLabel,
  typeLabel,
  unreadLabel,
  busy,
  onActivate,
}: {
  notification: Notification;
  url: string | null;
  contextLabel: string | null;
  typeLabel: string;
  unreadLabel: string;
  busy: boolean;
  onActivate: () => Promise<void>;
}) {
  const t = useT();
  const formatRelativeTime = useRelativeTime();
  const rowClass = [
    "notification-row",
    n.is_read ? "" : "notification-row-unread",
    busy ? "notification-row-busy" : "",
  ].filter(Boolean).join(" ");

  const body = (
    <>
      {!n.is_read && (
        <span
          aria-label={unreadLabel}
          className="unread-dot"
        />
      )}
      <div
        className="flex items-center gap-2 mb-1 flex-wrap"
      >
        <span
          className="badge bg-accent-tint text-accent"
          
        >
          {typeLabel}
        </span>
        <span className="font-bold text-sm">{n.actor_username}</span>
        {contextLabel && (
          <span className="text-muted text-xs">· {contextLabel}</span>
        )}
        <span className="text-xs text-faint">
          {formatRelativeTime(n.created_at)}
        </span>
      </div>
      <p className="m-0 text-sm text-muted break-words">
        {n.body_is_deleted ? t.deletedComment : n.body_snippet}
      </p>
    </>
  );

  if (url) {
    return (
      <Link
        href={url}
        aria-busy={busy}
        onClick={(event) => {
          if (busy) event.preventDefault();
          else void onActivate();
        }}
        className={rowClass}
      >
        {body}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => { void onActivate(); }}
      disabled={n.is_read || busy}
      aria-busy={busy}
      className={rowClass}
    >
      {body}
    </button>
  );
}
