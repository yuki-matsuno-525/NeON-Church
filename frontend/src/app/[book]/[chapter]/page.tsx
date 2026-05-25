"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  fetchBooks,
  fetchChapters,
  fetchVerses,
  fetchBookmarks,
  saveReadingProgress,
  type Verse,
  type Chapter,
  type Bookmark,
} from "@/lib/api";
import { saveLocalProgress } from "@/lib/readingProgress";
import { getBookBySlug } from "@/lib/books";
import { DEFAULT_TRANSLATION } from "@/lib/translations";
import { useAuth } from "@/contexts/AuthContext";
import { VerseList } from "@/components/reader/VerseList";
import { CommentPanel } from "@/components/reader/CommentPanel";
import { ChapterComments } from "@/components/reader/ChapterComments";
import { useT, useBookLabel, useTranslationOptions } from "@/lib/i18n";

export default function ChapterPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const t = useT();

  const slug = typeof params.book === "string" ? params.book : "";
  const chapterNum = typeof params.chapter === "string" ? Number(params.chapter) : 0;
  const meta = getBookBySlug(slug);
  const label = useBookLabel(slug);
  const translationOptions = useTranslationOptions();

  const [verses, setVerses] = useState<Verse[]>([]);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const selectedVerseId = searchParams.get("verse");
  const [loading, setLoading] = useState(true);
  const [highlightVerseNumber, setHighlightVerseNumber] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [translation, setTranslation] = useState<string>(() =>
    typeof window !== "undefined"
      ? (localStorage.getItem("bible-translation") ?? DEFAULT_TRANSLATION)
      : DEFAULT_TRANSLATION
  );

  useEffect(() => {
    if (!meta) {
      router.push("/matthew");
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    fetchBooks(translation)
      .then((books) => {
        const bookName = translation === "KJV" ? meta.englishName : meta.name;
        const book = books.find((b) => b.name === bookName);
        if (!book) throw new Error(t.bookNotFound);
        return fetchChapters(book.id).then((chapters) => {
          const ch = chapters.find((c) => c.number === chapterNum);
          if (!ch) throw new Error(t.chapterNotFound);
          setChapter(ch);
          saveLocalProgress(slug, {
            bookId: book.id,
            chapterId: ch.id,
            chapterNumber: ch.number,
            updatedAt: new Date().toISOString(),
          });
          if (user) {
            saveReadingProgress({ book: book.id, chapter: ch.id }).catch(() => {});
          }
          return fetchVerses(ch.id);
        });
      })
      .then(setVerses)
      .catch((err) => {
        setError(
          translation !== DEFAULT_TRANSLATION && err.message === t.bookNotFound
            ? t.translationNotFound(translation)
            : err.message
        );
      })
      .finally(() => setLoading(false));
  }, [slug, chapterNum, translation, meta, router, user, t]);

  useEffect(() => {
    if (!user) return;
    fetchBookmarks().then(setBookmarks).catch(() => setBookmarks([]));
  }, [user]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#verse-")) {
      const num = parseInt(hash.slice(7), 10);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!isNaN(num)) setHighlightVerseNumber(num);
    }
  }, []);

  useEffect(() => {
    if (loading || !highlightVerseNumber) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`verse-${highlightVerseNumber}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    return () => clearTimeout(timer);
  }, [loading, highlightVerseNumber]);

  const handleSelectVerse = (verseId: string) => {
    if (verseId === selectedVerseId) {
      router.back();
    } else if (selectedVerseId) {
      router.replace(`${pathname}?verse=${verseId}`);
    } else {
      router.push(`${pathname}?verse=${verseId}`);
    }
  };

  const selectedVerse = verses.find((v) => v.id === selectedVerseId) ?? null;

  const commentBookmarkMap: Record<string, string> = Object.fromEntries(
    bookmarks
      .filter((bm) => bm.target_type === "comment" && bm.comment_detail)
      .map((bm) => [bm.comment_detail!.id, bm.id])
  );
  const verseBookmarks = bookmarks.filter((bm) => bm.target_type === "verse" || bm.target_type === null);

  if (!meta) return null;

  if (loading) {
    return (
      <div style={{ padding: 32, color: "var(--text-muted)" }}>{t.loading}</div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 32 }}>
        <p style={{ color: "#ef4444", marginBottom: 16 }}>{error}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {translationOptions.filter((trans) => trans.id !== translation).map((trans) => (
            <button
              key={trans.id}
              onClick={() => {
                localStorage.setItem("bible-translation", trans.id);
                setTranslation(trans.id);
              }}
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                background: "none",
                cursor: "pointer",
                padding: "4px 12px",
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            >
              {t.switchTranslation(trans.label)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`reader-wrapper${selectedVerse ? " has-verse" : ""}`}
      style={{ display: "flex", minHeight: "calc(100vh - var(--navbar-height))" }}
    >
      <div
        className="reader-main"
        style={{
          flex: 1,
          minWidth: 0,
          padding: "32px 32px",
          overflowY: "auto",
        }}
      >
        <div style={{
          position: "sticky",
          top: "var(--navbar-height)",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          padding: "8px 0",
          background: "var(--glass-nav)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border)",
          marginLeft: -32,
          marginRight: -32,
          paddingLeft: 32,
          paddingRight: 32,
        }}>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0, fontWeight: 500 }}>
            <Link href="/read" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
              {t.bookList}
            </Link>
            {" › "}
            <Link href={`/${slug}?list=1`} style={{ color: "var(--text-muted)", textDecoration: "none" }}>
              {label?.short ?? meta.short}
            </Link>
            {" › "}
            <span>{t.chapterFmt(chapterNum)}</span>
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
              <span>{t.translationLabel}</span>
              <select
                value={translation}
                onChange={(e) => {
                  localStorage.setItem("bible-translation", e.target.value);
                  setTranslation(e.target.value);
                }}
                style={{
                  fontSize: 12,
                  color: "var(--text)",
                  background: "var(--bg)",
                  cursor: "pointer",
                  padding: "4px 10px",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}
              >
                {translationOptions.map((trans) => (
                  <option key={trans.id} value={trans.id}>{trans.label}</option>
                ))}
              </select>
            </label>
            {chapter && (
              <a
                href="#chapter-comments"
                style={{
                  fontSize: 12,
                  color: "var(--text-faint)",
                  textDecoration: "none",
                  padding: "3px 10px",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  whiteSpace: "nowrap",
                }}
              >
                {t.toComments}
              </a>
            )}
          </div>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
          {label?.short ?? meta.short} {t.chapterFmt(chapterNum)}
        </h1>

        <hr style={{ border: "none", borderTop: "2px solid var(--border)", marginBottom: 24 }} />

        <VerseList
          verses={verses}
          selectedVerseId={selectedVerseId}
          onSelectVerse={handleSelectVerse}
          bookmarks={verseBookmarks}
          highlightVerseNumber={highlightVerseNumber}
          onBookmarksChange={(updated) =>
            setBookmarks((prev) => [
              ...prev.filter((bm) => bm.target_type === "comment"),
              ...updated,
            ])
          }
        />

        {chapter && (
          <ChapterComments
            chapterId={chapter.id}
            label={`${label?.short ?? meta.short} ${t.chapterFmt(chapterNum)}`}
            commentBookmarkMap={commentBookmarkMap}
          />
        )}

        {/* 章 Prev/Next バー (本文末尾、左右 fixed のナビに代わる新配置) */}
        <nav
          aria-label={`${label?.short ?? meta.short} ${t.chapterFmt(chapterNum)} ${t.prevChapter} / ${t.nextChapter}`}
          style={{
            marginTop: 40,
            paddingTop: 20,
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {chapterNum > 1 ? (
            <Link
              href={`/${slug}/${chapterNum - 1}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 16px",
                minHeight: 44,
                background: "var(--bg-alt)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
                textDecoration: "none",
                fontSize: 14,
              }}
            >
              <span aria-hidden="true">‹</span>
              <span>{t.prevChapter} ({chapterNum - 1})</span>
            </Link>
          ) : <span />}
          {chapterNum < meta.totalChapters ? (
            <Link
              href={`/${slug}/${chapterNum + 1}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 16px",
                minHeight: 44,
                background: "var(--bg-alt)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
                textDecoration: "none",
                fontSize: 14,
                marginLeft: "auto",
              }}
            >
              <span>{t.nextChapter} ({chapterNum + 1})</span>
              <span aria-hidden="true">›</span>
            </Link>
          ) : null}
        </nav>
      </div>

      {selectedVerse && (
        <div className="reader-panel">
          <CommentPanel
            verse={selectedVerse}
            chapterNumber={chapterNum}
            onClose={() => router.back()}
            commentBookmarkMap={commentBookmarkMap}
            verseBookmarks={verseBookmarks}
            onVerseBookmarksChange={(updated) =>
              setBookmarks((prev) => [
                ...prev.filter((bm) => bm.target_type === "comment"),
                ...updated,
              ])
            }
          />
        </div>
      )}

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label={t.backToTop}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "var(--accent)",
            color: "var(--accent-text)",
            border: "none",
            borderRadius: "50%",
            width: 44,
            height: 44,
            cursor: "pointer",
            fontSize: 18,
            zIndex: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
          }}
        >
          ↑
        </button>
      )}
    </div>
  );
}
