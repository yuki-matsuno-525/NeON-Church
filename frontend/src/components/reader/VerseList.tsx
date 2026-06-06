"use client";

import { type Verse } from "@/lib/api";

type Props = {
  verses: Verse[];
  selectedVerseId: string | null;
  onSelectVerse: (verseId: string) => void;
  highlightVerseNumber?: number | null;
};

export function VerseList({
  verses,
  selectedVerseId,
  onSelectVerse,
  highlightVerseNumber,
}: Props) {

  return (
    <div>
      {verses.map((verse) => {
        const isSelected = selectedVerseId === verse.id;
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

          </div>
        );
      })}
    </div>
  );
}
