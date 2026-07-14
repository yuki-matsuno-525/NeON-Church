"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  fetchBooks,
  fetchChapters,
  fetchBookmarks,
  createBookBookmark,
  removeBookmark,
  type Chapter,
  type Bookmark,
} from "@/lib/api";
import { getLocalProgress } from "@/lib/readingProgress";
import { getBookBySlug, resolveTranslation, chapterTitle } from "@/lib/books";
import { resolveVersionBookIds } from "@/lib/versions";
import { ChapterComments } from "@/components/reader/ChapterComments";
import { BookmarkStar } from "@/components/ui/BookmarkStar";
import { useAuth } from "@/contexts/AuthContext";
import { useT, useBookLabel } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { defaultTranslationForLang } from "@/lib/translations";

function BookContent() {
  const t = useT();
  const { lang } = useLang();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = typeof params.book === "string" ? params.book : "";
  const meta = getBookBySlug(slug);
  const label = useBookLabel(slug);

  const { user } = useAuth();
  const [bookId, setBookId] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [allVersionBookIds, setAllVersionBookIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookBookmark, setBookBookmark] = useState<Bookmark | null>(null);
  const [bookBusy, setBookBusy] = useState(false);
  const currentChapter = getLocalProgress(slug)?.chapterNumber ?? null;

  // この書の書栞（reference が同じ書で、章・節を持たないもの）を拾っておく。
  useEffect(() => {
    if (!user) return;
    let active = true;
    fetchBookmarks()
      .then((bms) => {
        if (!active) return;
        const found = bms.find(
          (bm) => bm.target_type === "book" && bm.reference?.book === slug
        );
        setBookBookmark(found ?? null);
      })
      .catch(() => active && setBookBookmark(null));
    return () => {
      active = false;
    };
  }, [user, slug]);

  const toggleBookBookmark = async () => {
    if (bookBusy || !bookId) return;
    setBookBusy(true);
    try {
      if (bookBookmark) {
        await removeBookmark(bookBookmark.id);
        setBookBookmark(null);
      } else {
        setBookBookmark(await createBookBookmark(bookId));
      }
    } finally {
      setBookBusy(false);
    }
  };

  useEffect(() => {
    if (!meta) {
      router.push("/matthew");
      return;
    }

    const localProgress = getLocalProgress(slug);
    if (localProgress && searchParams.get("list") !== "1") {
      router.replace(`/${slug}/${localProgress.chapterNumber}`);
      return;
    }

    // UI 言語の既定訳をその本が持っていればそれを、無ければその本の訳（英訳のみの本など）を使う。
    // meta は上で確認済みなので resolveTranslation は必ず訳を返す。
    const tr = resolveTranslation(slug, defaultTranslationForLang(lang))!;
    fetchBooks(tr.id)
      .then((books) => {
        const book = books.find((b) => b.name === tr.name);
        if (!book) throw new Error(t.bookNotFound);
        setBookId(book.id);
        return fetchChapters(book.id).then(setChapters);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    // 全バージョン表示トグル用に、この書の各訳の書idを集めておく。
    resolveVersionBookIds(slug).then(setAllVersionBookIds).catch(() => {});
  }, [slug, meta, router, searchParams, lang, t.bookNotFound]);

  if (!meta) return null;

  if (loading) {
    return (
      <div style={{ padding: 32, color: "var(--text-muted)" }}>{t.loading}</div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 32, color: "var(--state-danger)" }}>{error}</div>
    );
  }

  return (
    <div style={{ minHeight: "calc(100vh - var(--navbar-height))" }}>
      <div className="reader-sticky-header" style={{
        position: "sticky",
        top: "var(--navbar-height)",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        padding: "8px 32px",
        background: "var(--glass-nav)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}>
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0, fontWeight: 500 }}>
          <Link href="/read" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
            {t.bookList}
          </Link>
          {" › "}
          <span>{label?.short ?? meta.short}</span>
        </p>
      </div>
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>

      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
          {label?.name ?? meta.name}
        </h1>
        {user && bookId && (
          <BookmarkStar
            active={!!bookBookmark}
            busy={bookBusy}
            onToggle={toggleBookBookmark}
            size={18}
          />
        )}
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12 }}>
        {t.selectChapterHeading}
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(44px, 1fr))",
          gap: "var(--space-2)",
          marginBottom: 40,
        }}
      >
        {chapters.map((ch) => {
          const isCurrent = ch.number === currentChapter;
          return (
            <Link
              key={ch.id}
              href={`/${slug}/${ch.number}`}
              title={chapterTitle(slug, ch.number) ?? undefined}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 44,
                minWidth: 44,
                border: isCurrent ? "1px solid var(--accent)" : "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                textDecoration: "none",
                color: isCurrent ? "var(--accent)" : "var(--text-muted)",
                fontWeight: 700,
                fontSize: "var(--font-size-sm)",
                background: isCurrent ? "var(--accent-tint)" : "var(--bg-alt)",
                transition: "border-color var(--duration-fast) var(--ease-out), background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "var(--accent-tint)";
                el.style.color = "var(--accent)";
                el.style.borderColor = "var(--accent)";
                el.style.boxShadow = "var(--shadow-glow)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = isCurrent ? "var(--accent-tint)" : "var(--bg-alt)";
                el.style.color = isCurrent ? "var(--accent)" : "var(--text-muted)";
                el.style.borderColor = isCurrent ? "var(--accent)" : "var(--border)";
                el.style.boxShadow = "none";
              }}
            >
              {ch.number}
              {isCurrent && (
                <span
                  aria-label="読書中"
                  style={{
                    position: "absolute",
                    bottom: 3,
                    left: 3,
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: "var(--accent)",
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>

      {bookId && (
        <ChapterComments
          bookId={bookId}
          label={t.bookCommentsHeading}
          allVersionIds={allVersionBookIds}
        />
      )}
    </div>
    </div>
  );
}

function LoadingFallback() {
  const t = useT();
  return <div style={{ padding: 32, color: "var(--text-muted)" }}>{t.loading}</div>;
}

export default function BookPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BookContent />
    </Suspense>
  );
}
