"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { BOOKS, GENRE_ORDER } from "@/lib/books";
import { useT } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/useIsMobile";
import styles from "./Sidebar.module.css";

const NAV_HREFS = [
  { href: "/read", matchPrefixes: ["/read", ...BOOKS.map((book) => `/${book.slug}`)] },
  { href: "/qa", matchPrefixes: ["/qa"] },
  { href: "/translations", matchPrefixes: ["/translations"] },
  { href: "/articles", matchPrefixes: ["/articles"] },
  { href: "/plans", matchPrefixes: ["/plans"] },
];

type SidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const isMobile = useIsMobile();
  const sidebarRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
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
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
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
    { label: t.articles, ...NAV_HREFS[3] },
    { label: t.plans, ...NAV_HREFS[4] },
  ];

  // スマホでドロワーを開いているときは Escape で閉じられるようにする
  // （被せて開くものは、閉じ方が1つしか無いと行き止まりになる）。
  const handleLogout = async () => {
    setLogoutBusy(true);
    setLogoutError(false);
    try {
      await logout();
      onClose?.();
      router.push("/");
      router.refresh();
    } catch {
      setLogoutError(true);
    } finally {
      setLogoutBusy(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // 後ろの本文を止めるのは <html> 側。<body> に overflow:hidden を付けると
    // body 自身がスクロールの入れ物になり、上のバーの position:sticky が
    // 「動かない body」を基準にしてしまう。実際に動くのは画面のほうなので、
    // バーは貼り付くのをやめて一緒に流れ、上へ消えていた。
    const scrollRoot = document.documentElement;
    const previousOverflow = scrollRoot.style.overflow;
    scrollRoot.style.overflow = "hidden";
    sidebarRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      scrollRoot.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}

      <aside
        id="app-sidebar"
        ref={sidebarRef}
        tabIndex={open ? -1 : undefined}
        role={open ? "dialog" : "complementary"}
        aria-modal={open || undefined}
        aria-label={lang === "ja" ? "メニュー" : "Menu"}
        className={`sidebar${open ? " sidebar-open" : ""}`}
        // スマホで閉じているとき、ドロワーは画面の外にあるだけでタブ順には残っていた。
        // キーボードで進むと見えないリンクにフォーカスが飛んでしまうので、閉じている間は
        // 中身ごと触れなくする（パソコンでは常に表示されているのでそのまま）。
        inert={isMobile && !open}
      >
        <div className={`sidebar-inner ${styles.inner}`}>
        <div className="sidebar-mobile-auth border-b border-border py-2">
          {user ? (
            <>
              <Link href="/notifications" onClick={onClose} className={styles.item}>
                {t.notifications}
                {unreadCount > 0 && (
                  <span className="badge bg-accent text-accent-text">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
              <Link href="/bookmarks" onClick={onClose} className={styles.item}>
                {t.bookmarks}
              </Link>
              <Link href="/profile" onClick={onClose} className={styles.item}>
                {user.username}
              </Link>
              <button
                onClick={handleLogout}
                disabled={logoutBusy}
                aria-busy={logoutBusy}
                className={`${styles.item} ${styles.itemMuted}`}
              >
                {logoutBusy ? t.loading : t.logout}
              </button>
              {logoutError && (
                <p role="alert" className="mx-3 mt-1 mb-2 text-xs text-danger">
                  {lang === "ja" ? "ログアウトできませんでした。もう一度お試しください。" : "Could not sign out. Please try again."}
                </p>
              )}
            </>
          ) : (
            <Link
              href={`/login?from=${encodeURIComponent(pathname)}`}
              onClick={onClose}
              className="btn btn-secondary mx-3 my-2 flex"
            >
              {t.login}
            </Link>
          )}
        </div>

        <div className="flex-1">
          <div className="border-b border-border py-2">
            {navItems.map((item) => {
              const isActive = item.matchPrefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  aria-current={isActive ? "page" : undefined}
                  className={`${styles.item} ${isActive ? styles.itemActive : ""}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {(pathname === "/read" || BOOKS.some((b) => pathname === `/${b.slug}` || pathname.startsWith(`/${b.slug}/`))) && (
            <div className="py-2">
              <p className={styles.sectionLabel}>{t.books}</p>
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
                        className={styles.genre}
                      >
                        <span>{t.genreNames[genre] ?? genre}</span>
                        <span className="opacity-70">{expanded ? "▾" : "▸"}</span>
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
                              className={`${styles.item} ${styles.book} ${isActive ? styles.itemActive : ""}`}
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
