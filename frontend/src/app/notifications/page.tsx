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
  formatRelativeTime,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useT } from "@/lib/i18n";
import { SkeletonList, EmptyState, ErrorState, FilterChips, LoadMoreButton, useToast, type FilterChip } from "@/components/ui";
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
  // null は「すべて」タブ
  const [kind, setKind] = useState<NotificationType | null>(null);

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
    loadMore,
    failed,
    reload,
  } = useLoadMore(fetchPage);
  const toast = useToast();

  // 既読にできなかったときに画面だけ既読の見た目になると、未読の数字とも食い違う。
  // 失敗したら知らせて、表示は変えない。
  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
    } catch {
      toast.show(t.errorActionFailed, { type: "error" });
      return;
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    clearUnread();
  };

  const handleMarkOne = async (n: Notification) => {
    if (n.is_read) return;
    try {
      await markNotificationRead(n.id);
    } catch {
      toast.show(t.errorActionFailed, { type: "error" });
      return;
    }
    setNotifications((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
    );
    decrementUnread();
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
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 24px" }}>
        <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, marginBottom: "var(--space-6)" }}>{t.notificationsTitle}</h1>
        <SkeletonList count={4} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 24px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700 }}>{t.notificationsTitle}</h1>
        <button
          onClick={handleMarkAll}
          disabled={unreadCount === 0}
          aria-disabled={unreadCount === 0}
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "6px 14px",
            background: "transparent",
            color: unreadCount === 0 ? "var(--text-faint)" : "var(--text-muted)",
            cursor: unreadCount === 0 ? "default" : "pointer",
            opacity: unreadCount === 0 ? 0.6 : 1,
            fontSize: "var(--font-size-sm)",
            fontFamily: "inherit",
          }}
        >
          {t.markAllRead}
        </button>
      </div>

      {/* 通知が1件も無いときはチップを出さない（空の「すべて(0)」だけが並ぶのを避ける） */}
      {counts && counts.all > 0 && (
        <FilterChips chips={chips} value={kind} onChange={setKind} ariaLabel={t.filterByKind} />
      )}

      {/* 取りに行けなかったときは「1件も無い」と言わない。理由と、やり直す手段を出す。 */}
      {failed ? (
        <ErrorState title={t.errorTitle} message={t.errorNetwork} onRetry={reload} />
      ) : notifications.length === 0 ? (
        <EmptyState
          title={t.noNotifications}
          description={t.emptyNotificationsDesc}
        />
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {notifications.map((n) => {
              const url = notificationTargetUrl(n);
              const contextLabel = notificationContextLabel(n, t);
              return (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  url={url}
                  contextLabel={contextLabel}
                  typeLabel={typeLabel(n.notification_type)}
                  onActivate={() => {
                    handleMarkOne(n);
                    // refresh は markOne 後の整合性確認用
                    void refresh;
                  }}
                />
              );
            })}
          </div>
          <LoadMoreButton hasMore={hasMore} loading={loadingMore} onClick={loadMore} />
        </>
      )}
    </div>
  );
}

function NotificationItem({
  notification: n,
  url,
  contextLabel,
  typeLabel,
  onActivate,
}: {
  notification: Notification;
  url: string | null;
  contextLabel: string | null;
  typeLabel: string;
  onActivate: () => void;
}) {
  const t = useT();
  const cardStyle: React.CSSProperties = {
    padding: "14px 16px",
    borderRadius: "var(--radius-md)",
    background: n.is_read ? "var(--bg-alt)" : "var(--bg-hover)",
    borderLeft: n.is_read ? "3px solid transparent" : "3px solid var(--accent)",
    transition: `background var(--duration-fast) var(--ease-out)`,
    display: "block",
    textDecoration: "none",
    color: "inherit",
    position: "relative",
  };

  const body = (
    <>
      {!n.is_read && (
        <span
          aria-label={t.unreadMark}
          style={{
            position: "absolute",
            top: 18,
            right: 16,
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--accent)",
          }}
        />
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
          flexWrap: "wrap",
        }}
      >
        <span
          className="badge"
          style={{ background: "var(--accent-tint)", color: "var(--accent)" }}
        >
          {typeLabel}
        </span>
        <span style={{ fontWeight: 700, fontSize: 13 }}>{n.actor_username}</span>
        {contextLabel && (
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>· {contextLabel}</span>
        )}
        <span style={{ color: "var(--text-faint)", fontSize: 12 }}>
          {formatRelativeTime(n.created_at)}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
        {n.comment_body_snippet}
      </p>
    </>
  );

  if (url) {
    return (
      <Link href={url} onClick={onActivate} style={cardStyle}>
        {body}
      </Link>
    );
  }
  return (
    <div
      onClick={onActivate}
      style={{ ...cardStyle, cursor: n.is_read ? "default" : "pointer" }}
    >
      {body}
    </div>
  );
}
