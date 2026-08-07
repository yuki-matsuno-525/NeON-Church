"use client";

import { useEffect, useId, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { searchBible, type SearchKind, type SearchResult } from "@/lib/api";
import { BOOKS } from "@/lib/books";
import { useT } from "@/lib/i18n";
import { translationLabel } from "@/lib/translations";
import { useLang } from "@/contexts/LanguageContext";
import { EmptyState, SkeletonList } from "@/components/ui";
import { ErrorState } from "@/components/ui/ErrorState";
import { Pagination } from "@/components/ui/Pagination";
import { ClearableSearchInput } from "@/components/ui/ClearableSearchInput";

// 検索結果（節）は50件ずつページ送りする。backend の VERSE_PAGE_SIZE と揃える。
const VERSE_PAGE_SIZE = 50;


const SEARCH_KIND_OPTIONS: { value: SearchKind; labelKey: "all" | "searchKindVerse" | "searchKindBook" | "searchKindComment" }[] = [
  { value: "all", labelKey: "all" },
  { value: "verses", labelKey: "searchKindVerse" },
  { value: "books", labelKey: "searchKindBook" },
  { value: "comments", labelKey: "searchKindComment" },
];

function isSearchKind(value: string | null): value is SearchKind {
  return value === "all" || value === "verses" || value === "books" || value === "comments";
}

function getSlugByName(name: string): string | null {
  return BOOKS.find((b) => b.name === name || b.englishName === name)?.slug ?? null;
}

function highlight(text: string, q: string): string {
  if (!q) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`(${escaped})`, "gi"), "**$1**");
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();
  const inputId = useId();
  const bookFilterId = useId();
  const q = searchParams.get("q") ?? "";
  const kindParam = searchParams.get("kind");
  const kind: SearchKind = isSearchKind(kindParam) ? kindParam : "all";
  const bookSlug = searchParams.get("book") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const [inputValue, setInputValue] = useState(q);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  // 自分が検索したときの語。URL がこれと違う値になったら「戻る・進む」なので入力欄を合わせる。
  // 以前は結果取得と同じ effect で入力欄を上書きしていたため、絞り込みやページ送りをすると
  // 打ちかけの文字が最後に検索した語へ戻ってしまっていた。
  const submittedQ = useRef(q);

  useEffect(() => {
    if (q === submittedQ.current) return;
    submittedQ.current = q;
    setInputValue(q);
  }, [q]);

  useEffect(() => {
    if (q.length < 1) {
      // 検索語が消えたら前の結果を残さない（URL 由来の値に合わせるための意図的な更新）。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResult(null);
      setError(false);
      return;
    }
    let active = true;
    // クエリ・絞り込み・ページのいずれかが変わったら、そのページを取り直す（追記ではなく置換）。
    // UI 言語は依存に入れない。言語を切り替えても検索結果は変わらない。
    // 件数の最小判定（CJKは1文字可）は backend に任せる。
    setLoading(true);
    setError(false);
    searchBible(q, page, kind, bookSlug)
      .then((data) => {
        if (active) setResult(data);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [q, kind, bookSlug, page, retryToken]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const trimmed = ((formData.get("q") as string) ?? inputValue).trim();
    submittedQ.current = trimmed;
    setInputValue(trimmed);
    const params = new URLSearchParams(searchParams.toString());
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    params.delete("page"); // 新しい検索は1ページ目から
    const nextUrl = params.toString() ? `/search?${params.toString()}` : "/search";
    router.push(nextUrl);
  };

  const updateFilters = (next: { kind?: SearchKind; book?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.kind) {
      if (next.kind === "all") params.delete("kind");
      else params.set("kind", next.kind);
    }
    if (next.book !== undefined) {
      if (next.book) params.set("book", next.book);
      else params.delete("book");
    }
    params.delete("page"); // 絞り込みを変えたら1ページ目に戻す
    const nextUrl = params.toString() ? `/search?${params.toString()}` : "/search";
    router.push(nextUrl);
  };

  const goToPage = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete("page");
    else params.set("page", String(next));
    const nextUrl = params.toString() ? `/search?${params.toString()}` : "/search";
    router.push(nextUrl);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  const totalHits = (result?.verse_total ?? 0) + (result?.books.length ?? 0) + (result?.comments.length ?? 0);

  return (
    <div className="page page-narrow">
      <h1 className="text-xl font-bold mb-6">{t.searchTitle}</h1>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <label htmlFor={inputId} className="sr-only">{t.searchKeyword}</label>
        <ClearableSearchInput
          id={inputId}
          name="q"
          value={inputValue}
          onChange={setInputValue}
          placeholder={t.searchKeyword}
          ariaLabel={t.searchKeyword}
          inputClassName="form-control bg-bg-alt text-sm"
          wrapperClassName="flex-1"
        />
        <button type="submit" className="btn btn-primary">
          {t.searchTitle}
        </button>
      </form>

      <div className="flex items-center gap-2 flex-wrap mb-6">
        <div className="inline-flex gap-1 flex-wrap">
          {SEARCH_KIND_OPTIONS.map((option) => {
            const active = option.value === kind;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => updateFilters({ kind: option.value })}
                className={`chip chip-sm chip-bold bg-bg-alt${active ? " chip-active" : ""}`}
              >
                {t[option.labelKey]}
              </button>
            );
          })}
        </div>
        <label htmlFor={bookFilterId} className="sr-only">{t.allBooks}</label>
        <select
          id={bookFilterId}
          value={bookSlug}
          onChange={(e) => updateFilters({ book: e.target.value })}
          className="select-sm max-w-full"
        >
          <option value="">{t.allBooks}</option>
          {BOOKS.map((book) => (
            <option key={book.slug} value={book.slug}>
              {lang === "en" ? book.englishName : book.name}
            </option>
          ))}
        </select>
      </div>

      {!q && (
        <EmptyState title={t.searchPromptTitle} description={t.searchPromptDesc} />
      )}

      {loading && (
        <div role="status" aria-label={t.searching}>
          <SkeletonList count={4} />
        </div>
      )}

      {error && !loading && (
        <ErrorState
          title={t.loadErrorTitle}
          message={t.loadErrorDesc}
          onRetry={() => setRetryToken((value) => value + 1)}
          retryLabel={t.retry}
        />
      )}

      {result && !loading && !error && (
        <>
          <p role="status" aria-live="polite" className="text-muted text-sm mb-4">
            {t.searchResults(q, totalHits)}
          </p>

          {page === 1 && result.books.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 text-md font-bold text-body">
                {t.sectionBooks}
              </h2>
              <div className="flex flex-col gap-3">
                {result.books.map((b) => {
                  const slug = getSlugByName(b.name);
                  return (
                    <Link
                      key={b.id}
                      href={slug ? `/${slug}?list=1` : "/read"}
                      className="result-card no-underline text-body text-sm font-bold"
                    >
                      <span className="badge mr-2 border border-border bg-bg uppercase tracking-wide text-muted">{t.searchKindBook}</span>
                      {b.name}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {result.verses.length > 0 && (
            <section>
              <h2 className="mb-3 text-md font-bold text-body">
                {t.sectionVerses}
              </h2>
              <div className="flex flex-col gap-3">
                {result.verses.map((v) => {
                  const slug = v.book_slug || getSlugByName(v.book_name);
                  const url = slug ? `/${slug}/${v.chapter_number}#verse-${v.number}` : null;
                  const parts = highlight(v.text, q).split("**");
                  return (
                    <div
                      key={v.id}
                      className="result-card"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-muted">
                          <span className="badge mr-2 border border-border bg-bg uppercase tracking-wide text-muted">{t.searchKindVerse}</span>
                          {v.book_name} {t.verseFmt(v.chapter_number, v.number)}
                          {/* 検索は全訳を横断するので、どの訳の本文に当たったかを添える。 */}
                          <span className="text-faint"> · {translationLabel(v.translation, lang)}</span>
                        </span>
                        {url && (
                          <Link
                            href={url}
                            className="text-xs text-accent no-underline"
                          >
                            {t.readLink}
                          </Link>
                        )}
                      </div>
                      <p className="m-0 text-sm leading-base">
                        {parts.map((part, i) =>
                          i % 2 === 1
                            ? <mark key={i} className="search-mark">{part}</mark>
                            : <span key={i}>{part}</span>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
              <Pagination
                page={page}
                totalPages={Math.ceil(result.verse_total / VERSE_PAGE_SIZE)}
                onChange={goToPage}
              />
            </section>
          )}

          {page === 1 && result.comments.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 text-md font-bold text-body">
                {t.sectionComments}
              </h2>
              <div className="flex flex-col gap-3">
                {result.comments.map((c) => {
                  const parts = highlight(c.body, q).split("**");
                  return (
                    <div
                      key={c.id}
                      className="result-card"
                    >
                      <div className="flex gap-2 text-xs text-muted mb-2 items-center">
                        <span className="badge mr-2 border border-border bg-bg uppercase tracking-wide text-muted">{t.searchKindComment}</span>
                        <span className="font-bold">{c.username}</span>
                        {c.location && <span>· {c.location}</span>}
                      </div>
                      <p className="m-0 text-sm leading-base">
                        {parts.map((part, i) =>
                          i % 2 === 1
                            ? <mark key={i} className="search-mark">{part}</mark>
                            : part
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {totalHits === 0 && (
            <EmptyState
              title={t.searchEmpty(q)}
              description={t.searchEmptyDesc}
              action={
                <div className="flex gap-3 flex-wrap justify-center">
                  <Link href="/qa" className="btn btn-ghost">{t.searchEmptyGoQa}</Link>
                  <Link href="/read" className="btn btn-primary">{t.searchEmptyGoRead}</Link>
                </div>
              }
            />
          )}
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  const t = useT();
  return (
    <Suspense fallback={<div role="status" aria-live="polite" className="p-8 text-muted">{t.loading}</div>}>
      <SearchContent />
    </Suspense>
  );
}
