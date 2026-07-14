"use client";

import { useEffect, useId, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { searchBible, type SearchKind, type SearchResult } from "@/lib/api";
import { BOOKS } from "@/lib/books";
import { useT } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { EmptyState, Button } from "@/components/ui";
import { Pagination } from "@/components/ui/Pagination";

// 検索結果（節）は50件ずつページ送りする。backend の VERSE_PAGE_SIZE と揃える。
const VERSE_PAGE_SIZE = 50;

const KIND_BADGE_STYLE: React.CSSProperties = {
  display: "inline-block",
  fontSize: 10,
  fontWeight: 700,
  padding: "2px 8px",
  borderRadius: 999,
  border: "1px solid var(--border)",
  color: "var(--text-muted)",
  background: "var(--bg)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginRight: 8,
};

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInputValue(q);
    if (q.length < 1) {
      setResult(null);
      return;
    }
    // クエリ・言語・絞り込み・ページのいずれかが変わったら、そのページを取り直す（追記ではなく置換）。
    // 件数の最小判定（CJKは1文字可）は backend に任せる。
    setLoading(true);
    searchBible(q, lang, page, kind, bookSlug)
      .then(setResult)
      .catch(() => setResult({ verses: [], books: [], comments: [], verse_total: 0, has_more: false }))
      .finally(() => setLoading(false));
  }, [q, lang, kind, bookSlug, page]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const trimmed = ((formData.get("search-q") as string) ?? inputValue).trim();
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
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
      <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, marginBottom: "var(--space-5)" }}>{t.searchTitle}</h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, marginBottom: 28 }}>
        <label htmlFor={inputId} className="sr-only">{t.searchKeyword}</label>
        <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
          <input
            id={inputId}
            name="search-q"
            type="search"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t.searchKeyword}
            autoComplete="off"
            style={{
              width: "100%",
              padding: "9px 12px",
              paddingRight: inputValue ? 36 : 12,
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-alt)",
              color: "var(--text)",
              fontSize: "var(--font-size-sm)",
              fontFamily: "inherit",
            }}
          />
          {inputValue && (
            <button
              type="button"
              onClick={() => setInputValue("")}
              aria-label={t.clearInput}
              style={{
                position: "absolute",
                right: 6,
                top: "50%",
                transform: "translateY(-50%)",
                width: 26,
                height: 26,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: 16,
                lineHeight: 1,
                borderRadius: 4,
                fontFamily: "inherit",
              }}
            >
              ×
            </button>
          )}
        </div>
        <button type="submit" className="btn btn-primary">
          {t.searchTitle}
        </button>
      </form>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
          {SEARCH_KIND_OPTIONS.map((option) => {
            const active = option.value === kind;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => updateFilters({ kind: option.value })}
                style={{
                  padding: "6px 11px",
                  border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 999,
                  background: active ? "var(--accent-tint)" : "var(--bg-alt)",
                  color: active ? "var(--accent)" : "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: active ? 700 : 600,
                  fontFamily: "inherit",
                }}
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
          style={{
            minHeight: 32,
            maxWidth: "100%",
            padding: "5px 10px",
            border: "1px solid var(--border)",
            borderRadius: 8,
            background: "var(--bg-alt)",
            color: "var(--text)",
            fontSize: 12,
            fontFamily: "inherit",
          }}
        >
          <option value="">{t.allBooks}</option>
          {BOOKS.map((book) => (
            <option key={book.slug} value={book.slug}>
              {lang === "en" ? book.englishName : book.name}
            </option>
          ))}
        </select>
      </div>

      {loading && <div style={{ color: "var(--text-muted)" }}>{t.searching}</div>}

      {result && !loading && (
        <>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
            {t.searchResults(q, totalHits)}
          </p>

          {page === 1 && result.books.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: "var(--text)" }}>
                {t.sectionBooks}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {result.books.map((b) => {
                  const slug = getSlugByName(b.name);
                  return (
                    <Link
                      key={b.id}
                      href={slug ? `/${slug}` : "/"}
                      style={{
                        padding: "var(--space-3)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        background: "var(--bg-alt)",
                        textDecoration: "none",
                        color: "var(--text)",
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      <span style={KIND_BADGE_STYLE}>{t.searchKindBook}</span>
                      {b.name}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {result.verses.length > 0 && (
            <section>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: "var(--text)" }}>
                {t.sectionVerses}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {result.verses.map((v) => {
                  const slug = v.book_slug || getSlugByName(v.book_name);
                  const url = slug ? `/${slug}/${v.chapter_number}#verse-${v.number}` : null;
                  const parts = highlight(v.text, q).split("**");
                  return (
                    <div
                      key={v.id}
                      style={{
                        padding: "var(--space-3)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        background: "var(--bg-alt)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          <span style={KIND_BADGE_STYLE}>{t.searchKindVerse}</span>
                          {v.book_name} {t.verseFmt(v.chapter_number, v.number)}
                        </span>
                        {url && (
                          <Link
                            href={url}
                            style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}
                          >
                            {t.readLink}
                          </Link>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
                        {parts.map((part, i) =>
                          i % 2 === 1
                            ? <mark key={i} style={{ background: "var(--accent-tint)", color: "var(--accent)", borderRadius: 3, padding: "0 2px" }}>{part}</mark>
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
            <section style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: "var(--text)" }}>
                {t.sectionComments}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {result.comments.map((c) => {
                  const parts = highlight(c.body, q).split("**");
                  return (
                    <div
                      key={c.id}
                      style={{
                        padding: "var(--space-3)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        background: "var(--bg-alt)",
                      }}
                    >
                      <div style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--text-muted)", marginBottom: 6, alignItems: "center" }}>
                        <span style={KIND_BADGE_STYLE}>{t.searchKindComment}</span>
                        <span style={{ fontWeight: 600 }}>{c.username}</span>
                        {c.location && <span>· {c.location}</span>}
                      </div>
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
                        {parts.map((part, i) =>
                          i % 2 === 1
                            ? <mark key={i} style={{ background: "var(--accent-tint)", color: "var(--accent)", borderRadius: 2, padding: "0 2px" }}>{part}</mark>
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
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                  <Link href="/qa" style={{ textDecoration: "none" }}>
                    <Button variant="ghost">{t.searchEmptyGoQa}</Button>
                  </Link>
                  <Link href="/read" style={{ textDecoration: "none" }}>
                    <Button variant="primary">{t.searchEmptyGoRead}</Button>
                  </Link>
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
    <Suspense fallback={<div style={{ padding: 32, color: "var(--text-muted)" }}>{t.loading}</div>}>
      <SearchContent />
    </Suspense>
  );
}
