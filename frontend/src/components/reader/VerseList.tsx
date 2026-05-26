"use client";

import { useAuth } from "@/contexts/AuthContext";
import { createBookmark, removeBookmark, type Verse, type Bookmark } from "@/lib/api";
import { useState } from "react";
import { LoginRequiredModal } from "@/components/ui/LoginRequiredModal";
import { useT } from "@/lib/i18n";

type Props = {
  verses: Verse[];
  selectedVerseId: string | null;
  onSelectVerse: (verseId: string) => void;
  bookmarks: Bookmark[];
  onBookmarksChange: (bookmarks: Bookmark[]) => void;
  highlightVerseNumber?: number | null;
};

export function VerseList({
  verses,
  selectedVerseId,
  onSelectVerse,
  bookmarks,
  onBookmarksChange,
  highlightVerseNumber,
}: Props) {
  const { user } = useAuth();
  const t = useT();
  const [loadingBookmark, setLoadingBookmark] = useState<string | null>(null);
  const [bookmarkError, setBookmarkError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const bookmarkMap = new Map(
    bookmarks
      .filter((bm): bm is typeof bm & { verse_detail: NonNullable<typeof bm.verse_detail> } => bm.verse_detail !== null)
      .map((bm) => [bm.verse_detail.id, bm])
  );

  const handleBookmark = async (e: React.MouseEvent, verse: Verse) => {
    e.stopPropagation();
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (loadingBookmark) return;
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
      setBookmarkError(t.bookmarkFailed);
    } finally {
      setLoadingBookmark(null);
    }
  };

  return (
    <div>
      {showLoginModal && (
        <LoginRequiredModal onClose={() => setShowLoginModal(false)} />
      )}
      {bookmarkError && (
        <p style={{ fontSize: 12, color: "#e53e3e", marginBottom: 8 }}>
          {bookmarkError}
        </p>
      )}
      {verses.map((verse) => {
        const isSelected = selectedVerseId === verse.id;
        const isBookmarked = bookmarkMap.has(verse.id);
        const isHighlighted = !isSelected && verse.number === highlightVerseNumber;

        return (
          <div
            id={`verse-${verse.number}`}
            key={verse.id}
            data-testid="verse-item"
            onClick={() => onSelectVerse(verse.id)}
            style={{
              padding: "12px 16px",
              minHeight: 44,
              cursor: "pointer",
              borderRadius: 5,
              background: isSelected ? "var(--accent-tint)" : isHighlighted ? undefined : "transparent",
              color: isSelected ? "var(--accent)" : "var(--text)",
              marginBottom: 2,
              transition: isHighlighted ? undefined : "background 0.1s",
              animation: isHighlighted ? "verse-flash 2.5s ease-out forwards" : undefined,
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
                lineHeight: 1.9,
                fontSize: 17,
                fontFamily: '"Noto Serif JP", serif',
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
                {/* 「コメント」ボタンは no-op だったため削除。コメントは右のパネルから操作。 */}
                <button
                  onClick={(e) => handleBookmark(e, verse)}
                  disabled={loadingBookmark === verse.id}
                  aria-pressed={isBookmarked}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 5,
                    padding: "10px 14px",
                    minHeight: 44,
                    background: isBookmarked ? "var(--accent-tint)" : "transparent",
                    color: isBookmarked ? "var(--accent)" : "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: "inherit",
                  }}
                >
                  {isBookmarked ? t.remove : t.bookmark}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
