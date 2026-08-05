"use client";

import { Suspense, useDeferredValue, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { ClearableSearchInput } from "@/components/ui/ClearableSearchInput";

type ResumeTarget = { slug: string; chapter: number; bookName: string } | null;

// 翻訳本棚カテゴリ用の擬似ジャンルキー。実ジャンル名と衝突しない値にする。
const TRANSLATION_TAB = "__translation_library__";

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase();
}

function matchesSearch(query: string, values: Array<string | null | undefined>) {
  return values.some((value) => value?.toLocaleLowerCase().includes(query));
}

export default function ReadPage() {
  const t = useT();
  return (
    <Suspense fallback={<div className="p-8 text-muted">{t.loading}</div>}>
      <ReadContent />
    </Suspense>
  );
}

function ReadContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const { lang } = useLang();
  const resolved = useRef(false);
  // 初期値は null 固定。localStorage はクライアントにしか無いため、初期 state で読むと
  // サーバー描画（resume 無し）と食い違って hydration エラーになる。読み取りは effect で行う。
  const [resume, setResume] = useState<ResumeTarget>(null);
  // ログインユーザーが /read に追加した公開翻訳（本棚）。未ログイン・0件なら何も出さない。
  const [library, setLibrary] = useState<TranslationProject[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState(false);
  const [libraryRetryToken, setLibraryRetryToken] = useState(0);
  const [resumeError, setResumeError] = useState(false);
  const [resumeRetryToken, setResumeRetryToken] = useState(0);
  // 書が多いのでカテゴリ（ジャンル）を選んでから、その書だけ表示するドリルダウン。
  const [activeGenre, setActiveGenre] = useState<string>("");
  const urlBookSearch = searchParams.get("q") ?? "";
  const [bookSearch, setBookSearch] = useState(urlBookSearch);
  const [lastUrlBookSearch, setLastUrlBookSearch] = useState(urlBookSearch);
  if (urlBookSearch !== lastUrlBookSearch) {
    setLastUrlBookSearch(urlBookSearch);
    setBookSearch(urlBookSearch);
  }
  const deferredBookSearch = useDeferredValue(bookSearch);

  useEffect(() => {
    if (bookSearch === urlBookSearch) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (bookSearch.trim()) params.set("q", bookSearch);
      else params.delete("q");
      const query = params.toString();
      router.replace(query ? `/read?${query}` : "/read", { scroll: false });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [bookSearch, router, searchParams, urlBookSearch]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLibrary([]);
      setLibraryLoading(false);
      setLibraryError(false);
      return;
    }
    setLibraryLoading(true);
    setLibraryError(false);
    fetchTranslationLibrary()
      .then(setLibrary)
      .catch(() => {
        setLibrary([]);
        setLibraryError(true);
      })
      .finally(() => setLibraryLoading(false));
  }, [loading, user, libraryRetryToken]);

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
        setResumeError(false);
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
      .catch(() => setResumeError(true));
  }, [loading, user, router, resumeRetryToken]);

  return (
    <div className="page page-wide">
      <h1 className="text-xl font-bold mb-6">{t.readTitle}</h1>

      {resume && (
        <div className="mb-6">
          <Link
            href={`/${resume.slug}/${resume.chapter}`}
            className="badge bg-accent-tint text-accent text-sm py-1 px-3 tap-target inline-flex items-center no-underline"
            
          >
            {t.resumeReading(bookLabel(resume.slug, lang)?.name ?? resume.bookName, resume.chapter)}
          </Link>
        </div>
      )}

      <label className="block mb-6">
        <span className="sr-only">{t.bookSearchLabel}</span>
        <ClearableSearchInput
          value={bookSearch}
          onChange={setBookSearch}
          placeholder={t.bookSearchPlaceholder}
          ariaLabel={t.bookSearchLabel}
          inputClassName="form-control"
          wrapperClassName="w-full"
        />
      </label>

      {libraryLoading && user && (
        <p role="status" aria-live="polite" className="text-sm text-muted">
          {t.loading}
        </p>
      )}
      {resumeError && user && (
        <div role="alert" className="mb-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-danger">{t.loadErrorDesc}</span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              resolved.current = false;
              setResumeRetryToken((value) => value + 1);
            }}
          >
            {t.retry}
          </button>
        </div>
      )}
      {libraryError && user && (
        <div role="alert" className="mb-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-danger">{t.loadErrorDesc}</span>
          <button type="button" className="btn btn-ghost" onClick={() => setLibraryRetryToken((value) => value + 1)}>
            {t.retry}
          </button>
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
        const normalizedQuery = normalizeSearch(deferredBookSearch);
        const matchingBooks = normalizedQuery
          ? BOOKS.filter((book) => {
              const lb = bookLabel(book.slug, lang);
              return matchesSearch(normalizedQuery, [
                book.name,
                book.englishName,
                book.short,
                book.slug,
                t.genreNames[book.genre] ?? book.genre,
                lb?.name,
                lb?.short,
                ...book.translations.flatMap((tr) => [tr.id, tr.name]),
              ]);
            })
          : [];
        const matchingProjects = normalizedQuery
          ? library.filter((proj) =>
              matchesSearch(normalizedQuery, [
                proj.name,
                proj.description,
                proj.source_book_name,
                languageLabel(proj.target_language),
                proj.owner_username,
              ])
            )
          : [];
        // 絞り込みの丸いラベル。選ばれているものは塗りつぶす。
        const chipClass = (isActive: boolean) => `chip${isActive ? " chip-on" : ""}`;
        if (normalizedQuery) {
          const totalMatches = matchingBooks.length + matchingProjects.length;
          return (
            <div className="mb-8">
              {totalMatches === 0 ? (
                <p className="text-sm text-muted">
                  {t.listSearchEmpty}
                </p>
              ) : (
                <div
                  className="book-grid"
                >
                  {matchingBooks.map((book) => {
                    const lb = bookLabel(book.slug, lang);
                    return (
                      <Link
                        key={book.slug}
                        href={`/${book.slug}?list=1`}
                        className="card-glow card-glow-interactive flex flex-col py-4 px-4 no-underline text-body"
                        
                      >
                        <span className="book-tile-title">
                          {lb?.name ?? book.name}
                        </span>
                        <span className="text-xs text-faint mt-2">
                          {t.totalChapters(chapterNumbersOf(book.slug).length)}
                        </span>
                      </Link>
                    );
                  })}
                  {matchingProjects.map((proj) => (
                    <Link
                      key={proj.id}
                      href={`/translations/${proj.id}/read`}
                      className="card-glow card-glow-interactive flex flex-col py-4 px-4 no-underline text-body"
                      
                    >
                      <span className="font-bold text-md">{proj.name}</span>
                      <span className="text-xs text-muted mt-2">
                        {proj.source_book_name} → {languageLabel(proj.target_language)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        }
        return (
          <>
            {/* カテゴリ選択（チップ）。ジャンルに加えて翻訳本棚も1カテゴリとして並べる。 */}
            <div className="flex flex-wrap gap-2 mb-6">
              {groups.map(({ genre, books }) => {
                const isActive = !isLibraryTab && active?.genre === genre;
                return (
                  <button
                    key={genre}
                    onClick={() => setActiveGenre(genre)}
                    aria-pressed={isActive}
                    className={chipClass(isActive)}
                  >
                    {t.genreNames[genre] ?? genre}{" "}
                    <span className="opacity-70">({books.length})</span>
                  </button>
                );
              })}
              {hasLibrary && (
                <button
                  key={TRANSLATION_TAB}
                  onClick={() => setActiveGenre(TRANSLATION_TAB)}
                  aria-pressed={isLibraryTab}
                  className={chipClass(isLibraryTab)}
                >
                  {t.myTranslationsHeading}{" "}
                  <span className="opacity-70">({library.length})</span>
                </button>
              )}
            </div>

            {/* 選択カテゴリの書 */}
            {active && (
              <div className="mb-8">
                <div
                  className="book-grid"
                >
                  {active.books.map((book) => {
                    const lb = bookLabel(book.slug, lang);
                    return (
                      <Link
                        key={book.slug}
                        href={`/${book.slug}?list=1`}
                        className="card-glow card-glow-interactive flex flex-col py-4 px-4 no-underline text-body"
                        
                      >
                        <span className="book-tile-title">
                          {lb?.name ?? book.name}
                        </span>
                        <span className="text-xs text-faint mt-2">
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
              <div className="mb-8">
                <div
                  className="book-grid"
                >
                  {library.map((proj) => (
                    <Link
                      key={proj.id}
                      href={`/translations/${proj.id}/read`}
                      className="card-glow card-glow-interactive flex flex-col py-4 px-4 no-underline text-body"
                      
                    >
                      <span className="font-bold text-md">{proj.name}</span>
                      <span className="text-xs text-muted mt-2">
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

