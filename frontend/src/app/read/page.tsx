"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { fetchReadingProgress, fetchTranslationLibrary, type TranslationProject } from "@/lib/api";
import { languageLabel } from "@/lib/languages";
import {
  getLastBookSlug,
  getLocalProgress,
  saveLocalProgress,
} from "@/lib/readingProgress";
import { BOOKS, GENRE_ORDER, getBookBySlug, slugFromDbName, chapterNumbersOf } from "@/lib/books";
import { useT, bookLabel } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";

type ResumeTarget = { slug: string; chapter: number; bookName: string } | null;

// 翻訳本棚カテゴリ用の擬似ジャンルキー。実ジャンル名と衝突しない値にする。
const TRANSLATION_TAB = "__translation_library__";

export default function ReadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();
  const resolved = useRef(false);
  // 初期値は null 固定。localStorage はクライアントにしか無いため、初期 state で読むと
  // サーバー描画（resume 無し）と食い違って hydration エラーになる。読み取りは effect で行う。
  const [resume, setResume] = useState<ResumeTarget>(null);
  // ログインユーザーが /read に追加した公開翻訳（本棚）。未ログイン・0件なら何も出さない。
  const [library, setLibrary] = useState<TranslationProject[]>([]);
  // 書が多いのでカテゴリ（ジャンル）を選んでから、その書だけ表示するドリルダウン。
  const [activeGenre, setActiveGenre] = useState<string>("");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLibrary([]);
      return;
    }
    fetchTranslationLibrary()
      .then(setLibrary)
      .catch(() => setLibrary([]));
  }, [loading, user]);

  useEffect(() => {
    const localSlug = getLastBookSlug();
    if (localSlug) {
      const localProgress = getLocalProgress(localSlug);
      const meta = BOOKS.find((b) => b.slug === localSlug);
      if (localProgress && meta) {
        // mount 後に localStorage から復元する意図的な更新（hydration 不一致を避けるため）。
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setResume({ slug: localSlug, chapter: localProgress.chapterNumber, bookName: meta.short });
      }
      return; // localStorage があればサーバーの読書履歴は見ない
    }
    if (resolved.current || loading) return;
    resolved.current = true;
    if (!user) return;
    fetchReadingProgress()
      .then((list) => {
        const latest = list[0];
        if (latest) {
          const slug = slugFromDbName(latest.book_name);
          const meta = slug ? getBookBySlug(slug) : null;
          if (meta) {
            saveLocalProgress(meta.slug, {
              bookId: latest.book,
              chapterId: latest.chapter,
              chapterNumber: latest.chapter_number,
              updatedAt: latest.updated_at,
            });
            setResume({ slug: meta.slug, chapter: latest.chapter_number, bookName: meta.short });
          }
        }
      })
      .catch(() => {});
  }, [loading, user, router]);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
      <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, marginBottom: "var(--space-5)" }}>{t.readTitle}</h1>

      {resume && (
        <div style={{ marginBottom: "var(--space-5)" }}>
          <Link
            href={`/${resume.slug}/${resume.chapter}`}
            className="badge"
            style={{
              background: "var(--accent-tint)",
              color: "var(--accent)",
              fontSize: "var(--font-size-sm)",
              padding: "3px 10px",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            {t.resumeReading(bookLabel(resume.slug, lang)?.name ?? resume.bookName, resume.chapter)}
          </Link>
        </div>
      )}

      {(() => {
        const groups = GENRE_ORDER
          .map((genre) => ({ genre, books: BOOKS.filter((b) => b.genre === genre) }))
          .filter(({ books }) => books.length > 0);
        // 翻訳本棚は本棚に何かある（ログイン＋追加済み）ときだけカテゴリとして出す。
        const hasLibrary = library.length > 0;
        const isLibraryTab = activeGenre === TRANSLATION_TAB && hasLibrary;
        const active = isLibraryTab ? null : (groups.find((g) => g.genre === activeGenre) ?? groups[0]);
        const chipStyle = (isActive: boolean): React.CSSProperties => ({
          fontSize: "var(--font-size-sm)",
          padding: "6px 14px",
          borderRadius: 999,
          border: "1px solid var(--border)",
          cursor: "pointer",
          fontFamily: "inherit",
          background: isActive ? "var(--accent)" : "transparent",
          color: isActive ? "var(--accent-text)" : "var(--text-muted)",
        });
        return (
          <>
            {/* カテゴリ選択（チップ）。ジャンルに加えて翻訳本棚も1カテゴリとして並べる。 */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "var(--space-5)" }}>
              {groups.map(({ genre, books }) => {
                const isActive = !isLibraryTab && active?.genre === genre;
                return (
                  <button
                    key={genre}
                    onClick={() => setActiveGenre(genre)}
                    aria-pressed={isActive}
                    style={chipStyle(isActive)}
                  >
                    {t.genreNames[genre] ?? genre}{" "}
                    <span style={{ opacity: 0.7 }}>({books.length})</span>
                  </button>
                );
              })}
              {hasLibrary && (
                <button
                  key={TRANSLATION_TAB}
                  onClick={() => setActiveGenre(TRANSLATION_TAB)}
                  aria-pressed={isLibraryTab}
                  style={chipStyle(isLibraryTab)}
                >
                  {t.myTranslationsHeading}{" "}
                  <span style={{ opacity: 0.7 }}>({library.length})</span>
                </button>
              )}
            </div>

            {/* 選択カテゴリの書 */}
            {active && (
              <div style={{ marginBottom: "var(--space-6)" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                    gap: 14,
                  }}
                >
                  {active.books.map((book) => {
                    const lb = bookLabel(book.slug, lang);
                    return (
                      <Link
                        key={book.slug}
                        href={`/${book.slug}?list=1`}
                        className="card-glow card-glow-interactive"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          padding: "20px 18px",
                          textDecoration: "none",
                          color: "var(--text)",
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: "var(--font-size-md)" }}>{lb?.short ?? book.short}</span>
                        {lb?.name !== lb?.short && (
                          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
                            {lb?.name ?? book.name}
                          </span>
                        )}
                        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-faint)", marginTop: "var(--space-2)" }}>
                          {t.totalChapters(chapterNumbersOf(book.slug).length)}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 翻訳本棚カテゴリ：本棚に追加した公開翻訳を書と同じグリッドで並べる。 */}
            {isLibraryTab && (
              <div style={{ marginBottom: "var(--space-6)" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                    gap: 14,
                  }}
                >
                  {library.map((proj) => (
                    <Link
                      key={proj.id}
                      href={`/translations/${proj.id}/read`}
                      className="card-glow card-glow-interactive"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        padding: "20px 18px",
                        textDecoration: "none",
                        color: "var(--text)",
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: "var(--font-size-md)" }}>{proj.name}</span>
                      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginTop: "var(--space-2)" }}>
                        {proj.source_book_name} → {languageLabel(proj.target_language)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
