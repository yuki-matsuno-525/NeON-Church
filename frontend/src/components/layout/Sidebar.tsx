"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fetchNotifications } from "@/lib/api";
import { BOOKS } from "@/lib/books";

type SidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const currentSlug = pathname.split("/").filter(Boolean)[0] ?? "";
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    const mql = window.matchMedia("(max-width: 768px)");
    mql.addEventListener("change", check);
    return () => mql.removeEventListener("change", check);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchNotifications()
      .then((ns) => setUnreadCount(ns.filter((n) => !n.is_read).length))
      .catch(() => {});
  }, [user]);

  const handleLogout = async () => {
    onClose?.();
    await logout();
    router.push("/");
    router.refresh();
  };

  return (
    <>
      {/* モバイル: Sidebar が開いているときのみオーバーレイを表示 */}
      {open && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            top: "var(--navbar-height)",
            background: "rgba(0, 0, 0, 0.4)",
            zIndex: 39,
          }}
        />
      )}

      <aside
        className={`sidebar${open ? " sidebar-open" : ""}`}
        style={{
          width: "var(--sidebar-width)",
          minWidth: "var(--sidebar-width)",
          background: "var(--bg-alt)",
          borderRight: "1px solid var(--border)",
          overflowY: "auto",
          height: "calc(100vh - var(--navbar-height))",
          position: "sticky",
          top: "var(--navbar-height)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* モバイルのみ表示: 認証メニュー（上部） */}
        {isMobile && <div style={{ borderBottom: "1px solid var(--border)", padding: "8px 0" }}>
          {user ? (
            <>
              <Link
                href="/notifications"
                onClick={onClose}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 12px",
                  textDecoration: "none",
                  fontSize: 13,
                  color: "var(--text)",
                }}
              >
                <span style={{ position: "relative" }}>
                  🔔
                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: -4,
                        right: -8,
                        background: "var(--accent)",
                        color: "var(--accent-text)",
                        borderRadius: "999px",
                        fontSize: 9,
                        padding: "1px 4px",
                        fontWeight: 700,
                        lineHeight: 1.4,
                      }}
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </span>
                通知
              </Link>
              <Link
                href="/bookmarks"
                onClick={onClose}
                style={{
                  display: "block",
                  padding: "10px 12px",
                  textDecoration: "none",
                  fontSize: 13,
                  color: "var(--text)",
                }}
              >
                ブックマーク
              </Link>
              <Link
                href="/profile"
                onClick={onClose}
                style={{
                  display: "block",
                  padding: "10px 12px",
                  textDecoration: "none",
                  fontSize: 13,
                  color: "var(--text)",
                }}
              >
                {user.username}
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  background: "transparent",
                  border: "none",
                  fontSize: 13,
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                ログアウト
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={onClose}
              style={{
                display: "block",
                margin: "8px 12px",
                padding: "8px 14px",
                background: "var(--accent)",
                color: "var(--accent-text)",
                borderRadius: 8,
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 13,
                textAlign: "center",
              }}
            >
              ログイン
            </Link>
          )}
        </div>}

        <div style={{ flex: 1 }}>
          {BOOKS.map((meta) => {
            const isActive = currentSlug === meta.slug;
            return (
              <Link
                key={meta.slug}
                href={`/${meta.slug}`}
                onClick={onClose}
                style={{
                  display: "block",
                  padding: "10px 12px",
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? "var(--accent)" : "var(--text)",
                  background: isActive ? "var(--accent-tint)" : "transparent",
                }}
              >
                {meta.short}
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}
