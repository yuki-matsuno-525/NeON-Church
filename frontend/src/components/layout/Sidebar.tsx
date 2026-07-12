"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { BOOKS, GENRE_ORDER } from "@/lib/books";
import { useT } from "@/lib/i18n";

const NAV_HREFS = [
  { href: "/read", matchPrefixes: ["/read", "/matthew", "/mark", "/luke", "/john"] },
  { href: "/qa", matchPrefixes: ["/qa"] },
  { href: "/translations", matchPrefixes: ["/translations"] },
];

type SidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const t = useT();
  const { lang } = useLang();
  const currentSlug = pathname.split("/").filter(Boolean)[0] ?? "";
  const currentGenre = BOOKS.find((b) => b.slug === currentSlug)?.genre;
  // 書が多いのでカテゴリ折りたたみ。現在の書のカテゴリは初期表示で開くが、閉じることもできる。
  const [openGenres, setOpenGenres] = useState<Set<string>>(
    () => new Set(currentGenre ? [currentGenre] : []),
  );
  const toggleGenre = (g: string) =>
    setOpenGenres((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  const navItems = [
    { label: t.read, ...NAV_HREFS[0] },
    { label: t.qa, ...NAV_HREFS[1] },
    { label: t.translate, ...NAV_HREFS[2] },
  ];

  const handleLogout = async () => {
    onClose?.();
    await logout();
    router.push("/");
    router.refresh();
  };

  return (
    <>
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
        }}
      >
        <div
          className="sidebar-inner"
          style={{
            position: "sticky",
            top: "var(--navbar-height)",
            height: "calc(100vh - var(--navbar-height))",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
        <div className="sidebar-mobile-auth" style={{ borderBottom: "1px solid var(--border)", padding: "8px 0" }}>
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
                {t.notifications}
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
                {t.bookmarks}
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
                {t.logout}
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
              {t.login}
            </Link>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
            {navItems.map((item) => {
              const isActive = item.matchPrefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  aria-current={isActive ? "page" : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px 12px",
                    minHeight: 44,
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

          {(pathname === "/read" || BOOKS.some((b) => pathname === `/${b.slug}` || pathname.startsWith(`/${b.slug}/`))) && (
            <div style={{ padding: "8px 0" }}>
              <p style={{ fontSize: 11, color: "var(--text-faint)", padding: "4px 12px 4px", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {t.books}
              </p>
              {GENRE_ORDER
                .map((genre) => ({ genre, books: BOOKS.filter((b) => b.genre === genre) }))
                .filter(({ books }) => books.length > 0)
                .map(({ genre, books }) => {
                  const expanded = openGenres.has(genre);
                  return (
                    <div key={genre}>
                      <button
                        onClick={() => toggleGenre(genre)}
                        aria-expanded={expanded}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "8px 12px 8px 20px",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          fontSize: 12,
                          fontWeight: 700,
                          color: "var(--text-muted)",
                        }}
                      >
                        <span>{t.genreNames[genre] ?? genre}</span>
                        <span style={{ fontSize: 10, opacity: 0.7 }}>{expanded ? "▾" : "▸"}</span>
                      </button>
                      {expanded &&
                        books.map((meta) => {
                          const isActive = currentSlug === meta.slug;
                          return (
                            <Link
                              key={meta.slug}
                              href={`/${meta.slug}?list=1`}
                              onClick={onClose}
                              aria-current={isActive ? "page" : undefined}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                padding: "8px 12px 8px 32px",
                                minHeight: 36,
                                textDecoration: "none",
                                fontSize: 13,
                                fontWeight: isActive ? 700 : 400,
                                color: isActive ? "var(--accent)" : "var(--text)",
                                background: isActive ? "var(--accent-tint)" : "transparent",
                              }}
                            >
                              {lang === "en" ? meta.englishName : meta.short}
                            </Link>
                          );
                        })}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
        </div>
      </aside>
    </>
  );
}
