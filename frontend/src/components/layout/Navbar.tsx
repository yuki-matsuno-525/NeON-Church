"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { fetchNotifications } from "@/lib/api";

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchNotifications()
      .then((ns) => setUnreadCount(ns.filter((n) => !n.is_read).length))
      .catch(() => {});
  }, [user]);

  const handleLogout = async () => {
    await logout();
    router.push("/matthew/1");
    router.refresh();
  };

  return (
    <nav
      style={{
        height: "var(--navbar-height)",
        background: "var(--bg-alt)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 16,
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <Link
        href="/matthew/1"
        style={{
          fontWeight: 800,
          fontSize: 20,
          color: "var(--text)",
          textDecoration: "none",
          letterSpacing: "-0.02em",
        }}
      >
        NeON Church
      </Link>

      <span style={{ flex: 1 }} />

      {!loading && (
        <>
          {user ? (
            <>
              <Link
                href="/bookmarks"
                style={{ color: "var(--text-muted)", textDecoration: "none" }}
              >
                ブックマーク
              </Link>
              <Link
                href="/notifications"
                style={{
                  color: "var(--text-muted)",
                  textDecoration: "none",
                  position: "relative",
                }}
              >
                🔔
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -10,
                      background: "var(--accent)",
                      color: "var(--accent-text)",
                      borderRadius: "999px",
                      fontSize: 10,
                      padding: "1px 5px",
                      fontWeight: 700,
                      lineHeight: 1.4,
                    }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
                {user.username}
              </span>
              <button
                onClick={handleLogout}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 5,
                  padding: "4px 10px",
                  background: "transparent",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                ログアウト
              </button>
            </>
          ) : (
            <Link
              href="/login"
              style={{
                background: "var(--accent)",
                color: "var(--accent-text)",
                borderRadius: 8,
                padding: "6px 14px",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              ログイン
            </Link>
          )}
        </>
      )}

      <ThemeToggle />
    </nav>
  );
}
