"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { useAuth } from "@/contexts/AuthContext";
import { VerseList } from "@/components/reader/VerseList";
import { CommentPanel } from "@/components/reader/CommentPanel";
import { ChapterComments } from "@/components/reader/ChapterComments";

export default function ChapterPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const slug = typeof params.book === "string" ? params.book : "";
  const chapterNum = typeof params.chapter === "string" ? Number(params.chapter) : 0;
  const meta = getBookBySlug(slug);

  const [verses, setVerses] = useState<Verse[]>([]);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [selectedVerseId, setSelectedVerseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!meta) {
      router.push("/matthew/1");
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset state before new route fetch
    setSelectedVerseId(null);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);

    fetchBooks()
      .then((books) => {
        const book = books.find((b) => b.name === meta.name);
        if (!book) throw new Error("書が見つかりません");
        return fetchChapters(book.id).then((chapters) => {
          const ch = chapters.find((c) => c.number === chapterNum);
          if (!ch) throw new Error("章が見つかりません");
          setChapter(ch);
          // ログイン不問で localStorage に保存
          saveLocalProgress(slug, {
            bookId: book.id,
            chapterId: ch.id,
            chapterNumber: ch.number,
            updatedAt: new Date().toISOString(),
          });
          // ログイン済みならサーバーにも保存
          if (user) {
            saveReadingProgress({ book: book.id, chapter: ch.id }).catch(() => {});
          }
          return fetchVerses(ch.id);
        });
      })
      .then(setVerses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug, chapterNum]);

  useEffect(() => {
    if (!user) return;
    fetchBookmarks().then(setBookmarks).catch(() => setBookmarks([]));
  }, [user]);

  const handleSelectVerse = (verseId: string) => {
    setSelectedVerseId((prev) => (prev === verseId ? null : verseId));
  };

  const selectedVerse = verses.find((v) => v.id === selectedVerseId) ?? null;

  if (!meta) return null;

  if (loading) {
    return (
      <div style={{ padding: 32, color: "var(--text-muted)" }}>読み込み中...</div>
    );
  }

  if (error) {
    return <div style={{ padding: 32, color: "#ef4444" }}>{error}</div>;
  }

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - var(--navbar-height))" }}>
      {/* Main content */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: "32px 32px",
          overflowY: "auto",
        }}
      >
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: "var(--text-faint)", margin: 0 }}>
            <Link href={`/${slug}?list=1`} style={{ color: "var(--text-muted)", textDecoration: "none" }}>
              {meta.short}
            </Link>
            {" › "}
            <span>第{chapterNum}章</span>
          </p>
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
              章コメントへ ↓
            </a>
          )}
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
          {meta.short} 第{chapterNum}章
        </h1>

        <hr style={{ border: "none", borderTop: "2px solid var(--border)", marginBottom: 24 }} />

        <VerseList
          verses={verses}
          selectedVerseId={selectedVerseId}
          onSelectVerse={handleSelectVerse}
          bookmarks={bookmarks}
          onBookmarksChange={setBookmarks}
        />

        {chapter && (
          <ChapterComments
            chapterId={chapter.id}
            label={`${meta.short} 第${chapterNum}章へのコメント`}
          />
        )}
      </div>

      {/* Comment panel */}
      {selectedVerse && (
        <CommentPanel
          verse={selectedVerse}
          chapterNumber={chapterNum}
          onClose={() => setSelectedVerseId(null)}
        />
      )}

      {/* 章ナビゲーション（コメントパネルが閉じているときのみ表示） */}
      {!selectedVerse && (
        <>
          {chapterNum > 1 && (
            <Link
              href={`/${slug}/${chapterNum - 1}`}
              title={`第${chapterNum - 1}章`}
              className="chapter-nav-prev"
              style={{
                position: "fixed",
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "18px 10px",
                background: "var(--bg-alt)",
                border: "1px solid var(--border)",
                borderLeft: "none",
                borderRadius: "0 8px 8px 0",
                color: "var(--text)",
                textDecoration: "none",
                fontSize: 20,
                opacity: 0.75,
                zIndex: 20,
                transition: "opacity 0.15s",
                lineHeight: 1,
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.75")}
            >
              ‹
              <span style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                {chapterNum - 1}章
              </span>
            </Link>
          )}

          {chapterNum < meta.totalChapters && (
            <Link
              href={`/${slug}/${chapterNum + 1}`}
              title={`第${chapterNum + 1}章`}
              style={{
                position: "fixed",
                right: 0,
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "18px 10px",
                background: "var(--bg-alt)",
                border: "1px solid var(--border)",
                borderRight: "none",
                borderRadius: "8px 0 0 8px",
                color: "var(--text)",
                textDecoration: "none",
                fontSize: 20,
                opacity: 0.75,
                zIndex: 20,
                transition: "opacity 0.15s",
                lineHeight: 1,
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.75")}
            >
              ›
              <span style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                {chapterNum + 1}章
              </span>
            </Link>
          )}
        </>
      )}
    </div>
  );
}
