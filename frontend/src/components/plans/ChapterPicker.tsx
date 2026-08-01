"use client";

import { useState } from "react";
import { BOOKS, getBookBySlug } from "@/lib/books";
import { useChapterNumbers } from "@/hooks/useChapterNumbers";
import { DEFAULT_TRANSLATION } from "@/lib/translations";

export type PickedChapter = { book: string; chapter_number: number; translation: string };

/**
 * その日に読む章を選ぶ。書 → 訳 → 章 の順にたどる。
 *
 * 訳は任意。選ばなければ読む人の訳で開く。あえてギリシャ語を選ぶと、その日は原文で読ませられる。
 * 訳の一覧はその書に実際にあるものだけを出すので、無い訳を選んでしまうことがない。
 */
export function ChapterPicker({
  onPick,
  onCancel,
}: {
  onPick: (chapter: PickedChapter) => void;
  onCancel: () => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  // 空文字は「読む人の訳にまかせる」。
  const [translation, setTranslation] = useState("");
  const meta = slug ? getBookBySlug(slug) : null;
  const { numbers, error } = useChapterNumbers(slug, translation || DEFAULT_TRANSLATION);

  const matched = BOOKS.filter(
    (book) => !keyword || book.name.includes(keyword) || book.short.includes(keyword),
  );

  if (!slug) {
    return (
      <div style={boxStyle}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="書をさがす"
            autoFocus
            style={{ ...inputStyle, flex: 1 }}
          />
          <button type="button" onClick={onCancel} style={plainButtonStyle}>
            やめる
          </button>
        </div>
        <div style={{ maxHeight: 220, overflowY: "auto" }}>
          {matched.map((book) => (
            <button
              key={book.slug}
              type="button"
              onClick={() => setSlug(book.slug)}
              style={rowButtonStyle}
            >
              {book.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={boxStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => setSlug(null)} style={plainButtonStyle}>
          ← 書
        </button>
        <strong style={{ fontSize: 13 }}>{meta?.short}</strong>
        <select
          value={translation}
          onChange={(event) => setTranslation(event.target.value)}
          aria-label="訳"
          style={{ ...inputStyle, width: "auto" }}
        >
          <option value="">読む人の訳</option>
          {(meta?.translations ?? []).map((tr) => (
            <option key={tr.id} value={tr.id}>
              {tr.id}
            </option>
          ))}
        </select>
        <button type="button" onClick={onCancel} style={{ ...plainButtonStyle, marginLeft: "auto" }}>
          やめる
        </button>
      </div>

      {error && <p style={{ fontSize: 12, color: "var(--state-error)", margin: "0 0 8px" }}>{error}</p>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 220, overflowY: "auto" }}>
        {numbers.map((number) => (
          <button
            key={number}
            type="button"
            onClick={() => onPick({ book: slug, chapter_number: number, translation })}
            style={chapterButtonStyle}
          >
            {number}
          </button>
        ))}
      </div>
    </div>
  );
}

const boxStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: 12,
  marginTop: 8,
  background: "rgba(255,255,255,0.02)",
};

const inputStyle: React.CSSProperties = {
  boxSizing: "border-box",
  padding: "7px 8px",
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  fontFamily: "inherit",
  fontSize: 13,
};

const rowButtonStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "8px 6px",
  minHeight: 36,
  border: "none",
  background: "none",
  color: "var(--text)",
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
  borderBottom: "1px solid var(--border)",
};

const plainButtonStyle: React.CSSProperties = {
  border: "none",
  background: "none",
  color: "var(--text-muted)",
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "inherit",
  padding: "4px 6px",
  minHeight: 32,
};

const chapterButtonStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--text)",
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
};
