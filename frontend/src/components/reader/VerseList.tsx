"use client";

import { type ReactNode } from "react";
import { type Verse } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";

type Props = {
  verses: Verse[];
  selectedVerseId: string | null;
  onSelectVerse: (verseId: string) => void;
  highlightVerseNumber?: number | null;
  // 節番号の表示を差し替えたいとき（例: マルコの「短い結び」）に使う。
  // 省略時は verse.number をそのまま表示する。
  numberLabel?: (verse: Verse) => ReactNode;
  // 編纂へまとめて集めるモード。節を押すと選び、印を付ける。
  collecting?: boolean;
  collectedVerseIds?: string[];
};

export function VerseList({
  verses,
  selectedVerseId,
  onSelectVerse,
  highlightVerseNumber,
  numberLabel,
  collecting = false,
  collectedVerseIds = [],
}: Props) {
  const collected = new Set(collectedVerseIds);

  return (
    <div>
      {verses.map((verse) => {
        const isCollected = collecting && collected.has(verse.id);
        const isSelected = collecting ? isCollected : selectedVerseId === verse.id;
        const isHighlighted = !isSelected && verse.number === highlightVerseNumber;

        return (
          <div
            id={`verse-${verse.number}`}
            key={verse.id}
            data-testid="verse-item"
            role={collecting ? "checkbox" : undefined}
            aria-checked={collecting ? isCollected : undefined}
            onClick={() => onSelectVerse(verse.id)}
            style={{
              display: collecting ? "flex" : undefined,
              gap: collecting ? 10 : undefined,
              alignItems: collecting ? "flex-start" : undefined,
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
            {collecting && (
              <span
                aria-hidden="true"
                data-testid="verse-checkbox"
                style={{
                  flexShrink: 0,
                  width: 18,
                  height: 18,
                  marginTop: 6,
                  borderRadius: 4,
                  border: `1px solid ${isCollected ? "var(--accent)" : "var(--border)"}`,
                  background: isCollected ? "var(--accent)" : "var(--bg-alt)",
                  color: "var(--accent-text)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isCollected && <Icon name="check" size={13} />}
              </span>
            )}
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
