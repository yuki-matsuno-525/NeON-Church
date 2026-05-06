"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { fetchNotifications } from "@/lib/api";

type NavbarProps = {
  onMenuToggle?: () => void;
};

export function Navbar({ onMenuToggle }: NavbarProps) {
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
    router.push("/");
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
      {/* ハンバーガーボタン（モバイルのみ表示） */}
      <button
        onClick={onMenuToggle}
        aria-label="メニューを開く"
        className="hamburger-btn"
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--text)",
          fontSize: 22,
          padding: "4px 6px",
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ☰
      </button>

      <Link
        href="/"
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
        <div className="nav-desktop-only" style={{ display: "contents" }}>
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
              <Link
                href="/profile"
                style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: 13 }}
              >
                {user.username}
              </Link>
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
        </div>
      )}

      <ThemeToggle />
    </nav>
  );
}
