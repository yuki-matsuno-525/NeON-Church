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
import { BIBLE_TRANSLATIONS, DEFAULT_TRANSLATION } from "@/lib/translations";
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

    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset state before new route fetch
    setSelectedVerseId(null);
    setLoading(true);
    setError(null);

    fetchBooks(translation)
      .then((books) => {
        const bookName = translation === "KJV" ? meta.englishName : meta.name;
        const book = books.find((b) => b.name === bookName);
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
      .catch((err) => {
        setError(
          translation !== DEFAULT_TRANSLATION && err.message === "書が見つかりません"
            ? `「${translation}」のデータが見つかりません。別の翻訳に切り替えてください。`
            : err.message
        );
      })
      .finally(() => setLoading(false));
  }, [slug, chapterNum, translation, meta, router, user]);

  useEffect(() => {
    if (!user) return;
    fetchBookmarks().then(setBookmarks).catch(() => setBookmarks([]));
  }, [user]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSelectVerse = (verseId: string) => {
    setSelectedVerseId((prev) => (prev === verseId ? null : verseId));
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
      <div style={{ padding: 32, color: "var(--text-muted)" }}>読み込み中...</div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 32 }}>
        <p style={{ color: "#ef4444", marginBottom: 16 }}>{error}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {BIBLE_TRANSLATIONS.filter((t) => t.id !== translation).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                localStorage.setItem("bible-translation", t.id);
                setTranslation(t.id);
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
              {t.label} に切り替え
            </button>
          ))}
        </div>
      </div>
    );
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
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0, fontWeight: 500 }}>
            <Link href="/read" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
              書一覧
            </Link>
            {" › "}
            <Link href={`/${slug}?list=1`} style={{ color: "var(--text-muted)", textDecoration: "none" }}>
              {meta.short}
            </Link>
            {" › "}
            <span>第{chapterNum}章</span>
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              value={translation}
              onChange={(e) => {
                localStorage.setItem("bible-translation", e.target.value);
                setTranslation(e.target.value);
              }}
              style={{
                fontSize: 12,
                color: "var(--text-faint)",
                background: "var(--bg)",
                cursor: "pointer",
                padding: "3px 10px",
                border: "1px solid var(--border)",
                borderRadius: 12,
                appearance: "none",
                WebkitAppearance: "none",
              }}
            >
              {BIBLE_TRANSLATIONS.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
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
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
          {meta.short} 第{chapterNum}章
        </h1>

        <hr style={{ border: "none", borderTop: "2px solid var(--border)", marginBottom: 24 }} />

        <VerseList
          verses={verses}
          selectedVerseId={selectedVerseId}
          onSelectVerse={handleSelectVerse}
          bookmarks={verseBookmarks}
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
            label={`${meta.short} 第${chapterNum}章へのコメント`}
            commentBookmarkMap={commentBookmarkMap}
          />
        )}
      </div>

      {/* Comment panel */}
      {selectedVerse && (
        <CommentPanel
          verse={selectedVerse}
          chapterNumber={chapterNum}
          onClose={() => setSelectedVerseId(null)}
          commentBookmarkMap={commentBookmarkMap}
        />
      )}

      {/* スクロールトップボタン */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="ページ上部へ"
          style={{
            position: "fixed",
            bottom: 24,
            right: selectedVerse ? "calc(var(--panel-width) + 16px)" : 24,
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
