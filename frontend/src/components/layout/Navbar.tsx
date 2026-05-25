"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useT } from "@/lib/i18n";

type NavbarProps = {
  onMenuToggle?: () => void;
};

export function Navbar({ onMenuToggle }: NavbarProps) {
  const { user, loading, logout } = useAuth();
  const { lang, setLang } = useLang();
  const { unreadCount } = useNotifications();
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();

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
        aria-label={t.menuOpen}
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
        <img
          src="/img/logo.png"
          alt="NeON Church"
          style={{
            height: 44,
            width: "auto",
            mixBlendMode: "screen",
            display: "block",
          }}
        />
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
          placeholder={t.searchPlaceholder}
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

      {/* 言語切り替え */}
      <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
        {(["ja", "en"] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "3px 7px",
              fontSize: 12,
              fontWeight: lang === l ? 700 : 400,
              color: lang === l ? "rgba(193, 143, 255, 1)" : "var(--text-muted)",
              borderRadius: 4,
              fontFamily: "inherit",
              letterSpacing: "0.04em",
            }}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {!loading && (
        <div className="nav-desktop-only" style={{ display: "contents" }}>
          {user ? (
            <>
              <Link href="/read" style={{ color: "var(--text)", textDecoration: "none", fontSize: 13, opacity: 0.85 }}>
                {t.read}
              </Link>
              <Link href="/qa" style={{ color: "var(--text)", textDecoration: "none", fontSize: 13, opacity: 0.85 }}>
                {t.qa}
              </Link>
              <Link href="/translations" style={{ color: "var(--text)", textDecoration: "none", fontSize: 13, opacity: 0.85 }}>
                {t.translate}
              </Link>
              <Link href="/bookmarks" style={{ color: "var(--text)", textDecoration: "none", fontSize: 13, opacity: 0.85 }}>
                {t.bookmarks}
              </Link>
              <Link
                href="/notifications"
                aria-label={t.notifications}
                style={{
                  color: "var(--text)",
                  textDecoration: "none",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -8,
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
              <Link href="/profile" aria-label={t.profile} style={{ textDecoration: "none", flexShrink: 0 }}>
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
                {t.logout}
              </button>
            </>
          ) : (
            <Link
              href={`/login?from=${encodeURIComponent(pathname)}`}
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
              {t.login}
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
