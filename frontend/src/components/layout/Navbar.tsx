"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
        background: "var(--glass-nav)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: 20,
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* ハンバーガーボタン（モバイルのみ） */}
      <button
        onClick={onMenuToggle}
        aria-label="メニューを開く"
        className="hamburger-btn"
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--text-muted)",
          fontSize: 20,
          padding: "4px 6px",
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ☰
      </button>

      {/* ロゴ */}
      <Link href="/" style={{ textDecoration: "none", flexShrink: 0, lineHeight: 0 }}>
        <div style={{ height: 60, overflow: "hidden" }}>
          <img
            src="/img/logo.png"
            alt="NeON Church"
            style={{
              height: 120,
              width: "auto",
              mixBlendMode: "screen",
              display: "block",
            }}
          />
        </div>
      </Link>

      {/* 検索バー */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value.trim();
          if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
        }}
        style={{ flex: 1, display: "flex", justifyContent: "center" }}
      >
        <input
          type="search"
          name="q"
          placeholder="検索..."
          style={{
            width: "100%",
            maxWidth: 280,
            padding: "5px 12px",
            border: "1px solid var(--border)",
            borderRadius: 20,
            background: "rgba(255, 255, 255, 0.04)",
            color: "var(--text)",
            fontSize: 13,
            outline: "none",
          }}
        />
      </form>

      {!loading && (
        <div className="nav-desktop-only" style={{ display: "contents" }}>
          {user ? (
            <>
              <Link href="/read" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: 13 }}>
                読む
              </Link>
              <Link href="/qa" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: 13 }}>
                Q&A
              </Link>
              <Link href="/translations" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: 13 }}>
                翻訳
              </Link>
              <Link href="/bookmarks" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: 13 }}>
                お気に入り
              </Link>
              <Link
                href="/notifications"
                style={{
                  color: "var(--text-muted)",
                  textDecoration: "none",
                  position: "relative",
                  fontSize: 13,
                }}
              >
                通知
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -10,
                      background: "var(--neon-pink)",
                      color: "#fff",
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
              <Link href="/profile" aria-label="プロフィール" style={{ textDecoration: "none", flexShrink: 0 }}>
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      objectFit: "cover",
                      display: "block",
                      border: "1px solid var(--glass-border)",
                    }}
                  />
                ) : (
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "var(--accent)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {user.username[0].toUpperCase()}
                  </span>
                )}
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "4px 12px",
                  background: "transparent",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "inherit",
                }}
              >
                ログアウト
              </button>
            </>
          ) : (
            <Link
              href="/login"
              style={{
                background: "linear-gradient(135deg, #7618c5, #d81e80)",
                color: "#fff",
                borderRadius: 8,
                padding: "6px 16px",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 13,
                boxShadow: "0 0 14px rgba(198, 44, 170, 0.45)",
              }}
            >
              ログイン
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
