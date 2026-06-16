"use client";

import { type Verse } from "@/lib/api";

// 日本語（かな・漢字）を含むか。含む本文は和文セリフ、英文はラテン体セリフを使う。
// 和文フォント(Noto Serif JP)は校訂記号 ⌜⌝ 等を全角CJKグリフで描いてしまい、
// 英語本文（KJV・エノク書）で崩れて見えるため言語で出し分ける。
const _JAPANESE = /[぀-ヿ一-鿿]/;

function verseFontFamily(text: string): string {
  return _JAPANESE.test(text) ? '"Noto Serif JP", serif' : 'Georgia, "Times New Roman", serif';
}

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
                fontFamily: verseFontFamily(verse.text),
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
