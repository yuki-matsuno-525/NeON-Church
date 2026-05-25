"use client";

import { useEffect, useId, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { searchBible, type SearchResult } from "@/lib/api";
import { BOOKS } from "@/lib/books";
import { useT } from "@/lib/i18n";
import { EmptyState, Button } from "@/components/ui";

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
  const inputId = useId();
  const q = searchParams.get("q") ?? "";
  const [inputValue, setInputValue] = useState(q);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInputValue(q);
    if (q.length < 2) {
      setResult(null);
      return;
    }
    setLoading(true);
    searchBible(q)
      .then(setResult)
      .catch(() => setResult({ verses: [], books: [], comments: [] }))
      .finally(() => setLoading(false));
  }, [q]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const trimmed = ((formData.get("search-q") as string) ?? inputValue).trim();
    if (trimmed) router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const totalHits = (result?.verses.length ?? 0) + (result?.books.length ?? 0) + (result?.comments.length ?? 0);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>{t.searchTitle}</h1>

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
              border: "1px solid rgba(140, 75, 235, 0.35)",
              borderRadius: 8,
              background: "rgba(255, 255, 255, 0.05)",
              color: "var(--text)",
              fontSize: 14,
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
        <button
          type="submit"
          style={{
            padding: "9px 18px",
            background: "linear-gradient(135deg, #7618c5, #d81e80)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 14,
            fontFamily: "inherit",
            boxShadow: "0 0 14px rgba(198, 44, 170, 0.40)",
          }}
        >
          {t.searchTitle}
        </button>
      </form>

      {q.length > 0 && q.length < 2 && (
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{t.searchMinChars}</p>
      )}

      {loading && <div style={{ color: "var(--text-muted)" }}>{t.searching}</div>}

      {result && !loading && (
        <>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
            {t.searchResults(q, totalHits)}
          </p>

          {result.books.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: "var(--text)" }}>
                {t.sectionBooks}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.books.map((b) => {
                  const slug = getSlugByName(b.name);
                  return (
                    <Link
                      key={b.id}
                      href={slug ? `/${slug}` : "/"}
                      style={{
                        padding: "10px 14px",
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
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.verses.map((v) => {
                  const slug = getSlugByName(v.book_name);
                  const url = slug ? `/${slug}/${v.chapter_number}#verse-${v.number}` : null;
                  const parts = highlight(v.text, q).split("**");
                  return (
                    <div
                      key={v.id}
                      style={{
                        padding: "12px 14px",
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
                            ? <mark key={i} style={{ background: "var(--accent)", color: "var(--accent-text)", borderRadius: 3, padding: "0 2px" }}>{part}</mark>
                            : <span key={i}>{part}</span>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {result.comments.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: "var(--text)" }}>
                {t.sectionComments}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.comments.map((c) => {
                  const parts = highlight(c.body, q).split("**");
                  return (
                    <div
                      key={c.id}
                      style={{
                        padding: "12px 14px",
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
