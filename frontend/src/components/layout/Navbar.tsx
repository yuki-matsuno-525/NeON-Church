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

  // 6 本のリンクは見た目も作りも同じなので、並びだけをここに持つ
  const navLinks = [
    { href: "/read", label: t.read, active: isReadRoute },
    { href: "/qa", label: t.qa, active: pathname.startsWith("/qa") },
    { href: "/translations", label: t.translate, active: pathname.startsWith("/translations") },
    { href: "/articles", label: t.articles, active: pathname.startsWith("/articles") },
    { href: "/plans", label: t.plans, active: pathname.startsWith("/plans") },
    { href: "/bookmarks", label: t.bookmarks, active: pathname.startsWith("/bookmarks") },
  ];

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
    <nav className={`navbar-root${scrolled ? " is-scrolled" : ""}`}>
      {/* ハンバーガーボタン（モバイルのみ） */}
      <button
        type="button"
        onClick={onMenuToggle}
        aria-label={menuOpen ? t.menuClose : t.menuOpen}
        aria-expanded={menuOpen}
        aria-controls="app-sidebar"
        className="hamburger-btn tap-target-square inline-flex shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-lg text-muted"
      >
        ☰
      </button>

      {/* ロゴ */}
      <Link href="/" className="shrink-0 leading-none no-underline">
        {/* 全ページの上部に必ず出るので、最初に描かれるものの1つ。
            priority を付けて後回しにされないようにする。 */}
        <Image
          src="/img/logo.webp"
          alt="NeON Church"
          width={172}
          height={44}
          priority
          className="navbar-logo"
        />
      </Link>

      {/* 検索バー＋言語切替。モバイルでは2段目に「検索バー(左)＋言語切替(右)」で横並び。
          デスクトップでは display:contents なので従来どおり個別配置になる。 */}
      <div className="navbar-search-group">
      {/* 検索バー */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value.trim();
          if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
        }}
        className="navbar-search-form"
      >
        <input
          type="search"
          name="q"
          className="navbar-search-input"
          placeholder={t.searchPlaceholder}
          aria-label={t.searchPlaceholder}
        />
      </form>

      {/* 言語切り替え */}
      <div className="navbar-lang flex shrink-0 items-center">
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
            className="navbar-lang-btn"
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      </div>

      {!loading && (
        <div className="nav-desktop-only">
          {user ? (
            <>
              {navLinks.map(({ href, label, active }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`navbar-link${active ? " navbar-link-active" : ""}`}
                >
                  {label}
                </Link>
              ))}
              <Link
                href="/notifications"
                aria-label={t.notifications}
                className="tap-target-square relative flex items-center justify-center text-body no-underline"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {unreadCount > 0 && (
                  <span className="badge absolute -top-2 -right-2 bg-neon-pink text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
              <Link
                href="/profile"
                aria-label={t.profile}
                className="tap-target-square inline-flex shrink-0 items-center justify-center no-underline"
              >
                <span className="avatar-circle">{user.username[0].toUpperCase()}</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={logoutBusy}
                aria-busy={logoutBusy}
                className="btn btn-ghost"
              >
                {logoutBusy ? t.loading : t.logout}
              </button>
            </>
          ) : (
            <Link href={`/login?from=${encodeURIComponent(pathname)}`} className="btn btn-primary">
              {t.login}
            </Link>
          )}
        </div>
      )}
      {logoutError && (
        <span role="alert" className="text-xs text-danger">
          {lang === "ja" ? "ログアウトできませんでした。もう一度お試しください。" : "Could not sign out. Please try again."}
        </span>
      )}
    </nav>
  );
}
