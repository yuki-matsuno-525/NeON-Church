"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useT } from "@/lib/i18n";
import { BOOKS } from "@/lib/books";

type NavbarProps = {
  onMenuToggle?: () => void;
  /** ドロワーが開いているか。ボタンの説明を「開く／閉じる」で言い分けるために使う。 */
  menuOpen?: boolean;
};

export function Navbar({ onMenuToggle, menuOpen = false }: NavbarProps) {
  const { user, loading, logout } = useAuth();
  const { lang, setLang } = useLang();
  const { unreadCount } = useNotifications();
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const rootSegment = pathname.split("/").filter(Boolean)[0] ?? "";
  const isReadRoute = pathname.startsWith("/read") || BOOKS.some((book) => book.slug === rootSegment);
  const [scrolled, setScrolled] = React.useState(false);
  const [logoutBusy, setLogoutBusy] = React.useState(false);
  const [logoutError, setLogoutError] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = async () => {
    setLogoutBusy(true);
    setLogoutError(false);
    try {
      await logout();
      router.push("/");
      router.refresh();
    } catch {
      setLogoutError(true);
    } finally {
      setLogoutBusy(false);
    }
  };

  return (
    <nav
      className="navbar-root"
      style={{
        height: "var(--navbar-height)",
        background: scrolled ? "rgba(8, 4, 24, 0.88)" : "var(--glass-nav)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        transition: `background var(--duration-base) var(--ease-out)`,
        borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        padding: "0 20px",
        gap: 20,
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* ハンバーガーボタン（モバイルのみ） */}
      <button
        type="button"
        onClick={onMenuToggle}
        aria-label={menuOpen ? t.menuClose : t.menuOpen}
        aria-expanded={menuOpen}
        aria-controls="app-sidebar"
        className="hamburger-btn"
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--text-muted)",
          fontSize: 20,
          minWidth: 44,
          minHeight: 44,
          padding: 0,
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        ☰
      </button>

      {/* ロゴ */}
      <Link href="/" style={{ textDecoration: "none", flexShrink: 0, lineHeight: 0 }}>
        {/* 全ページの上部に必ず出るので、最初に描かれるものの1つ。
            priority を付けて後回しにされないようにする。 */}
        <Image
          src="/img/logo.webp"
          alt="NeON Church"
          width={172}
          height={44}
          priority
          style={{
            height: 44,
            width: "auto",
            display: "block",
          }}
        />
      </Link>

      {/* 検索バー＋言語切替。モバイルでは2段目に「検索バー(左)＋言語切替(右)」で横並び。
          デスクトップでは display:contents なので従来どおり個別配置になる。 */}
      <div className="navbar-search-group" style={{ display: "contents" }}>
      {/* 検索バー */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value.trim();
          if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
        }}
        className="navbar-search-form"
        style={{ flex: 1, display: "flex", justifyContent: "center" }}
      >
        <input
          type="search"
          name="q"
          className="navbar-search-input"
          placeholder={t.searchPlaceholder}
          aria-label={t.searchPlaceholder}
          style={{
            width: "100%",
            maxWidth: 280,
            padding: "8px 12px",
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
      <div className="navbar-lang" style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
        {(["ja", "en"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => {
              setLang(l);
              router.refresh();
            }}
            // いま選ばれている言語は色と太さでしか示していなかったため、
            // 読み上げでは2つとも同じボタンに聞こえていた。選択状態を明示する。
            aria-pressed={lang === l}
            aria-label={l === "ja" ? "日本語" : "English"}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "8px 10px",
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
      </div>

      {!loading && (
        <div className="nav-desktop-only" style={{ display: "contents" }}>
          {user ? (
            <>
              <Link href="/read" aria-current={isReadRoute ? "page" : undefined} style={{ color: isReadRoute ? "var(--accent)" : "var(--text)", textDecoration: "none", fontSize: 13, opacity: 0.85 }}>
                {t.read}
              </Link>
              <Link href="/qa" aria-current={pathname.startsWith("/qa") ? "page" : undefined} style={{ color: pathname.startsWith("/qa") ? "var(--accent)" : "var(--text)", textDecoration: "none", fontSize: 13, opacity: 0.85 }}>
                {t.qa}
              </Link>
              <Link href="/translations" aria-current={pathname.startsWith("/translations") ? "page" : undefined} style={{ color: pathname.startsWith("/translations") ? "var(--accent)" : "var(--text)", textDecoration: "none", fontSize: 13, opacity: 0.85 }}>
                {t.translate}
              </Link>
              <Link href="/articles" aria-current={pathname.startsWith("/articles") ? "page" : undefined} style={{ color: pathname.startsWith("/articles") ? "var(--accent)" : "var(--text)", textDecoration: "none", fontSize: 13, opacity: 0.85 }}>
                {t.articles}
              </Link>
              <Link href="/bookmarks" aria-current={pathname.startsWith("/bookmarks") ? "page" : undefined} style={{ color: pathname.startsWith("/bookmarks") ? "var(--accent)" : "var(--text)", textDecoration: "none", fontSize: 13, opacity: 0.85 }}>
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
                  justifyContent: "center",
                  minWidth: 44,
                  minHeight: 44,
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
              <Link href="/profile" aria-label={t.profile} style={{ textDecoration: "none", flexShrink: 0, minWidth: 44, minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
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
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={logoutBusy}
                aria-busy={logoutBusy}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "4px 12px",
                  minHeight: 44,
                  background: "transparent",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "inherit",
                }}
              >
                {logoutBusy ? t.loading : t.logout}
              </button>
            </>
          ) : (
            <Link
              href={`/login?from=${encodeURIComponent(pathname)}`}
              className="btn btn-primary"
              style={{ fontSize: 13 }}
            >
              {t.login}
            </Link>
          )}
        </div>
      )}
      {logoutError && (
        <span role="alert" style={{ color: "var(--state-danger)", fontSize: 12 }}>
          {lang === "ja" ? "ログアウトできませんでした。もう一度お試しください。" : "Could not sign out. Please try again."}
        </span>
      )}
    </nav>
  );
}
