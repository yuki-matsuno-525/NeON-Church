"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
  formatRelativeTime,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useT } from "@/lib/i18n";
import { SkeletonList, EmptyState } from "@/components/ui";
import {
  notificationTargetUrl,
  notificationContextLabel,
} from "@/lib/notificationTarget";

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const { decrementUnread, clearUnread, refresh } = useNotifications();
  const router = useRouter();
  const t = useT();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [fetching, setFetching] = useState(true);

  const typeLabel = (type: string): string => {
    if (type === "reply") return t.notifReply;
    if (type === "upvote") return t.notifUpvote;
    return type;
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?from=/notifications");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    fetchNotifications()
      .then(setNotifications)
      .catch(() => setNotifications([]))
      .finally(() => setFetching(false));
  }, [user]);

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    clearUnread();
  };

  const handleMarkOne = async (n: Notification) => {
    if (n.is_read) return;
    await markNotificationRead(n.id);
    setNotifications((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
    );
    decrementUnread();
  };

  if (loading || fetching) {
    return (
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 24px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>{t.notificationsTitle}</h1>
        <SkeletonList count={4} />
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>{t.notificationsTitle}</h1>
        <button
          onClick={handleMarkAll}
          disabled={unreadCount === 0}
          aria-disabled={unreadCount === 0}
          style={{
            border: "1px solid rgba(140, 75, 235, 0.45)",
            borderRadius: 8,
            padding: "6px 14px",
            background: "transparent",
            color: unreadCount === 0 ? "var(--text-faint)" : "var(--text-muted)",
            cursor: unreadCount === 0 ? "default" : "pointer",
            opacity: unreadCount === 0 ? 0.6 : 1,
            fontSize: 13,
            fontFamily: "inherit",
          }}
        >
          {t.markAllRead}
        </button>
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          title={t.noNotifications}
          description={t.emptyNotificationsDesc}
        />
      ) : (
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
  const cardStyle: React.CSSProperties = {
    padding: "14px 16px",
    borderRadius: 8,
    background: n.is_read ? "var(--bg-alt)" : "var(--accent-tint)",
    borderLeft: n.is_read ? "3px solid transparent" : "3px solid var(--accent)",
    transition: "background 0.1s",
    display: "block",
    textDecoration: "none",
    color: "inherit",
  };

  const body = (
    <>
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
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--accent)",
            background: "var(--accent-tint)",
            padding: "2px 6px",
            borderRadius: 4,
          }}
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
