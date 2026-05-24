"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
  formatRelativeTime,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";

export default function NotificationsPage() {
  const { user, loading } = useAuth();
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
  };

  const handleMarkOne = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  if (loading || fetching) {
    return (
      <div style={{ padding: 32, color: "var(--text-muted)" }}>{t.loading}</div>
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
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            style={{
              border: "1px solid rgba(140, 75, 235, 0.45)",
              borderRadius: 8,
              padding: "6px 14px",
              background: "transparent",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "inherit",
            }}
          >
            {t.markAllRead}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>{t.noNotifications}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.is_read && handleMarkOne(n.id)}
              style={{
                padding: "14px 16px",
                borderRadius: 8,
                background: n.is_read ? "var(--bg-alt)" : "var(--accent-tint)",
                borderLeft: n.is_read
                  ? "3px solid transparent"
                  : "3px solid var(--accent)",
                cursor: n.is_read ? "default" : "pointer",
                transition: "background 0.1s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
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
                  {typeLabel(n.notification_type)}
                </span>
                <span style={{ fontWeight: 700, fontSize: 13 }}>
                  {n.actor_username}
                </span>
                <span style={{ color: "var(--text-faint)", fontSize: 12 }}>
                  {formatRelativeTime(n.created_at)}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                {n.comment_body_snippet}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
