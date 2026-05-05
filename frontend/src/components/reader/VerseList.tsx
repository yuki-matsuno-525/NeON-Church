"use client";

import { useAuth } from "@/contexts/AuthContext";
import { createBookmark, removeBookmark, type Verse, type Bookmark } from "@/lib/api";
import { useState } from "react";

type Props = {
  verses: Verse[];
  selectedVerseId: string | null;
  onSelectVerse: (verseId: string) => void;
  bookmarks: Bookmark[];
  onBookmarksChange: (bookmarks: Bookmark[]) => void;
};

export function VerseList({
  verses,
  selectedVerseId,
  onSelectVerse,
  bookmarks,
  onBookmarksChange,
}: Props) {
  const { user } = useAuth();
  const [loadingBookmark, setLoadingBookmark] = useState<string | null>(null);
  const [bookmarkError, setBookmarkError] = useState<string | null>(null);

  const bookmarkMap = new Map(bookmarks.map((bm) => [bm.verse_detail.id, bm]));

  const handleBookmark = async (e: React.MouseEvent, verse: Verse) => {
    e.stopPropagation();
    if (!user || loadingBookmark) return;
    setLoadingBookmark(verse.id);
    setBookmarkError(null);
    try {
      const existing = bookmarkMap.get(verse.id);
      if (existing) {
        await removeBookmark(existing.id);
        onBookmarksChange(bookmarks.filter((bm) => bm.id !== existing.id));
      } else {
        const bm = await createBookmark(verse.id);
        onBookmarksChange([...bookmarks, bm]);
      }
    } catch (err) {
      console.error("bookmark error:", err);
      setBookmarkError("ブックマークの操作に失敗しました");
    } finally {
      setLoadingBookmark(null);
    }
  };

  return (
    <div>
      {bookmarkError && (
        <p style={{ fontSize: 12, color: "#e53e3e", marginBottom: 8 }}>
          {bookmarkError}
        </p>
      )}
      {verses.map((verse) => {
        const isSelected = selectedVerseId === verse.id;
        const isBookmarked = bookmarkMap.has(verse.id);

        return (
          <div
            key={verse.id}
            data-testid="verse-item"
            onClick={() => onSelectVerse(verse.id)}
            style={{
              padding: "8px 12px",
              cursor: "pointer",
              borderRadius: 5,
              background: isSelected ? "var(--accent-tint)" : "transparent",
              color: isSelected ? "var(--accent)" : "var(--text)",
              marginBottom: 2,
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }
            }}
          >
            <span
              style={{
                lineHeight: 1.85,
                fontSize: 18,
              }}
            >
              <sup
                style={{
                  fontSize: 11,
                  color: isSelected ? "var(--accent)" : "var(--text-faint)",
                  marginRight: 4,
                  verticalAlign: "super",
                  fontWeight: 700,
                }}
              >
                {verse.number}
              </sup>
              {verse.text}
            </span>

            {isSelected && (
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  gap: 8,
                }}
              >
                <button
                  style={{
                    border: "1px solid var(--accent)",
                    borderRadius: 5,
                    padding: "3px 10px",
                    background: "transparent",
                    color: "var(--accent)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: "inherit",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  💬 コメント
                </button>
                {user && (
                  <button
                    onClick={(e) => handleBookmark(e, verse)}
                    disabled={loadingBookmark === verse.id}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 5,
                      padding: "3px 10px",
                      background: isBookmarked ? "var(--accent-tint)" : "transparent",
                      color: isBookmarked ? "var(--accent)" : "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: 12,
                      fontFamily: "inherit",
                    }}
                  >
                    {isBookmarked ? "🔖 解除" : "🔖 ブックマーク"}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
