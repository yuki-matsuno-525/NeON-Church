"use client";

import { type ReactNode } from "react";
import { type Verse } from "@/lib/api";

type Props = {
  verses: Verse[];
  selectedVerseId: string | null;
  onSelectVerse: (verseId: string) => void;
  highlightVerseNumber?: number | null;
  // 節番号の表示を差し替えたいとき（例: マルコの「短い結び」）に使う。
  // 省略時は verse.number をそのまま表示する。
  numberLabel?: (verse: Verse) => ReactNode;
};

export function VerseList({
  verses,
  selectedVerseId,
  onSelectVerse,
  highlightVerseNumber,
  numberLabel,
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
              animation: isHighlighted ? "verse-flash 5s ease-out forwards" : undefined,
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
                // 詩文（エノク書など）の節内改行を保持する。改行の無い訳には影響しない。
                whiteSpace: "pre-line",
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
                {numberLabel ? numberLabel(verse) : verse.number}
              </sup>
              {verse.text}
            </span>

          </div>
        );
      })}
    </div>
  );
}
