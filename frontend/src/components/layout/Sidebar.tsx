"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fetchNotifications } from "@/lib/api";
import { BOOKS } from "@/lib/books";

const NAV_ITEMS = [
  { label: "読む", href: "/read", matchPrefixes: ["/read", "/matthew", "/mark", "/luke", "/john"] },
  { label: "Q&A", href: "/qa", matchPrefixes: ["/qa"] },
  { label: "翻訳", href: "/translations", matchPrefixes: ["/translations"] },
] as const;

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
          background: "var(--glass-nav)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRight: "1px solid rgba(255, 255, 255, 0.06)",
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
                  position: "relative",
                }}
              >
                通知
                {unreadCount > 0 && (
                  <span
                    style={{
                      background: "var(--accent)",
                      color: "var(--accent-text)",
                      borderRadius: "999px",
                      fontSize: 9,
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
                お気に入り
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
              href={`/login?from=${encodeURIComponent(pathname)}`}
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
          {/* メインナビゲーション */}
          <div style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
            {NAV_ITEMS.map((item) => {
              const isActive = item.matchPrefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  style={{
                    display: "block",
                    padding: "9px 12px",
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 400,
                    color: isActive ? "var(--accent)" : "var(--text)",
                    background: isActive ? "var(--accent-tint)" : "transparent",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* 書一覧（「読む」セクション内） */}
          {(pathname === "/read" || BOOKS.some((b) => pathname === `/${b.slug}` || pathname.startsWith(`/${b.slug}/`))) && (
            <div style={{ padding: "8px 0" }}>
              <p style={{ fontSize: 11, color: "var(--text-faint)", padding: "4px 12px 4px", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                書
              </p>
              {BOOKS.map((meta) => {
                const isActive = currentSlug === meta.slug;
                return (
                  <Link
                    key={meta.slug}
                    href={`/${meta.slug}?list=1`}
                    onClick={onClose}
                    style={{
                      display: "block",
                      padding: "8px 12px 8px 20px",
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
          )}
        </div>
      </aside>
    </>
  );
}
