"use client";

import { useState } from "react";
import { BOOKS, getBookBySlug } from "@/lib/books";
import { useChapterNumbers } from "@/hooks/useChapterNumbers";
import { DEFAULT_TRANSLATION } from "@/lib/translations";
import { useLang } from "@/contexts/LanguageContext";
import { planUiText } from "./planUiText";

export type PickedChapter = {
  book: string;
  book_name: string;
  chapter_number: number;
  translation: string;
};

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
  const { lang } = useLang();
  const ui = planUiText(lang);
  const meta = slug ? getBookBySlug(slug) : null;
  const { numbers, error, loading, retry } = useChapterNumbers(slug, translation || DEFAULT_TRANSLATION);

  const normalizedKeyword = keyword.trim().toLocaleLowerCase();
  const matched = BOOKS.filter((book) =>
    !normalizedKeyword
    || book.name.toLocaleLowerCase().includes(normalizedKeyword)
    || book.short.toLocaleLowerCase().includes(normalizedKeyword)
    || book.englishName.toLocaleLowerCase().includes(normalizedKeyword),
  );
  const localizedBookName = (book: (typeof BOOKS)[number]) => lang === "en" ? book.englishName : book.name;
  const localizedShortName = meta ? (lang === "en" ? meta.englishName : meta.short) : "";

  if (!slug) {
    return (
      <div role="group" aria-label={ui.findBookLabel} style={boxStyle}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <label style={{ flex: 1 }}>
            <span className="sr-only">{ui.findBookLabel}</span>
            <input
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={ui.findBookPlaceholder}
              autoFocus
              style={{ ...inputStyle, width: "100%" }}
            />
          </label>
          <button type="button" onClick={onCancel} style={plainButtonStyle}>
            {ui.cancel}
          </button>
        </div>
        <div style={{ maxHeight: 220, overflowY: "auto" }}>
          {matched.map((book) => (
            <button
              key={book.slug}
              type="button"
              onClick={() => {
                setTranslation("");
                setSlug(book.slug);
              }}
              style={rowButtonStyle}
            >
              {localizedBookName(book)}
            </button>
          ))}
          {matched.length === 0 && <p role="status" style={messageStyle}>{ui.noBooks}</p>}
        </div>
      </div>
    );
  }

  return (
    <div role="group" aria-label={ui.chooseChapter(localizedShortName)} style={boxStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => { setSlug(null); setTranslation(""); }} style={plainButtonStyle}>
          {ui.backToBooks}
        </button>
        <strong style={{ fontSize: 13 }}>{localizedShortName}</strong>
        <select
          value={translation}
          onChange={(event) => setTranslation(event.target.value)}
          aria-label={ui.translationLabel}
          style={{ ...inputStyle, width: "auto" }}
        >
          <option value="">{ui.readerTranslation}</option>
          {(meta?.translations ?? []).map((tr) => (
            <option key={tr.id} value={tr.id}>
              {tr.id}
            </option>
          ))}
        </select>
        <button type="button" onClick={onCancel} style={{ ...plainButtonStyle, marginLeft: "auto" }}>
          {ui.cancel}
        </button>
      </div>

      {loading && <p role="status" style={messageStyle}>{ui.chapterLoading}</p>}
      {error && (
        <div role="alert" style={{ ...messageStyle, color: "var(--state-danger)" }}>
          <span>{ui.chapterLoadError}</span>{" "}
          <button type="button" onClick={retry} style={inlineRetryStyle}>{ui.retry}</button>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 220, overflowY: "auto" }}>
        {numbers.map((number) => (
          <button
            key={number}
            type="button"
            aria-label={ui.chapterLabel(localizedShortName, number)}
            onClick={() => onPick({
              book: slug,
              book_name: meta ? localizedBookName(meta) : slug,
              chapter_number: number,
              translation,
            })}
            style={chapterButtonStyle}
          >
            {number}
          </button>
        ))}
        {!loading && !error && numbers.length === 0 && <p role="status" style={messageStyle}>{ui.noChapters}</p>}
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
  minHeight: 44,
};

const rowButtonStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "8px 6px",
  minHeight: 44,
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
  minHeight: 44,
};

const messageStyle: React.CSSProperties = {
  width: "100%",
  margin: "6px 0",
  color: "var(--text-muted)",
  fontSize: 12,
};

const inlineRetryStyle: React.CSSProperties = {
  border: 0,
  background: "transparent",
  color: "var(--accent)",
  textDecoration: "underline",
  cursor: "pointer",
  minHeight: 44,
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
