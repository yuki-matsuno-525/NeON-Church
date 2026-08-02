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
  // まとめてお気に入りに入れるモード。節を押すとコメント欄が開く代わりに選び入り・選び外しになる。
  pickMode?: boolean;
  pickedIds?: string[];
  onTogglePick?: (verseId: string) => void;
};

export function VerseList({
  verses,
  selectedVerseId,
  onSelectVerse,
  highlightVerseNumber,
  numberLabel,
  pickMode = false,
  pickedIds = [],
  onTogglePick,
}: Props) {
  const picked = new Set(pickedIds);
  const activate = (verseId: string) => {
    if (pickMode) onTogglePick?.(verseId);
    else onSelectVerse(verseId);
  };

  return (
    <div>
      {verses.map((verse) => {
        const isPicked = pickMode && picked.has(verse.id);
        const isSelected = pickMode ? isPicked : selectedVerseId === verse.id;
        const isHighlighted = !isSelected && verse.number === highlightVerseNumber;

        return (
          <button
            type="button"
            id={`verse-${verse.number}`}
            key={verse.id}
            data-testid="verse-item"
            // 節を選ぶのはこのアプリの中心の操作（ここからコメント・お気に入り・引用へ進む）。
            // ただの div に onClick を付けていたため、キーボードだけの人はここで詰まっていた。
            // ボタンとして扱い、Tab で移動して Enter / Space で選べるようにする。
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            onClick={() => activate(verse.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                // Space は既定だとページが下にスクロールしてしまうので止める。
                e.preventDefault();
                activate(verse.id);
              }
            }}
            style={{
              padding: "12px 16px",
              minHeight: 44,
              width: "100%",
              border: "none",
              textAlign: "left",
              fontFamily: "inherit",
              cursor: "pointer",
              borderRadius: 5,
              background: isSelected ? "var(--accent-tint)" : isHighlighted ? undefined : "transparent",
              color: isSelected ? "var(--accent)" : "var(--text)",
              marginBottom: 2,
              transition: isHighlighted ? undefined : "background 0.1s",
              animation: isHighlighted ? "verse-flash 5s ease-out forwards" : undefined,
            }}
            // マウスを乗せたときと同じ手応えを、キーボードで移動したときにも返す。
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
            onFocus={(e) => {
              if (!isSelected) {
                (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
              }
            }}
            onBlur={(e) => {
              if (!isSelected) {
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }
            }}
          >
            <span
              style={{
                lineHeight: 1.9,
                fontSize: 17,
                fontFamily: "var(--font-serif)",
                // 詩文（エノク書など）の節内改行を保持する。改行の無い訳には影響しない。
                whiteSpace: "pre-line",
              }}
            >
              {pickMode && (
                // 選んだ節が一目で分かるように、番号の前に印を出す。
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    width: 16,
                    marginRight: 4,
                    color: isPicked ? "var(--accent)" : "var(--text-faint)",
                    fontWeight: 700,
                  }}
                >
                  {isPicked ? "✓" : "○"}
                </span>
              )}
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

          </button>
        );
      })}
    </div>
  );
}
