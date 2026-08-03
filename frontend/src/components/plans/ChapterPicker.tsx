"use client";

import { useState } from "react";
import { BOOKS, getBookBySlug } from "@/lib/books";
import { useChapterNumbers } from "@/hooks/useChapterNumbers";
import { DEFAULT_TRANSLATION } from "@/lib/translations";
import { useLang } from "@/contexts/LanguageContext";
import { useT } from "@/lib/i18n";

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
  const t = useT();
  const [keyword, setKeyword] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  // 空文字は「読む人の訳にまかせる」。
  const [translation, setTranslation] = useState("");
  const { lang } = useLang();
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
      <div role="group" aria-label={t.citationBookSearchPlaceholder} style={boxStyle}>
        <div className="flex gap-2 mb-2">
          <label className="flex-1">
            <span className="sr-only">{t.citationBookSearchPlaceholder}</span>
            <input
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={t.citationBookSearchPlaceholder}
              autoFocus
              style={{ ...inputStyle, width: "100%" }}
            />
          </label>
          <button type="button" onClick={onCancel} style={plainButtonStyle}>
            {t.articleCancel}
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
          {matched.length === 0 && <p role="status" style={messageStyle}>{t.listSearchEmpty}</p>}
        </div>
      </div>
    );
  }

  return (
    <div role="group" aria-label={`${t.planAddChapter}: ${localizedShortName}`} style={boxStyle}>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <button type="button" onClick={() => { setSlug(null); setTranslation(""); }} style={plainButtonStyle}>
          {t.planBackToBooks}
        </button>
        <strong className="text-sm">{localizedShortName}</strong>
        <select
          value={translation}
          onChange={(event) => setTranslation(event.target.value)}
          aria-label={t.planTranslationLabel}
          style={{ ...inputStyle, width: "auto" }}
        >
          <option value="">{t.planReaderTranslation}</option>
          {(meta?.translations ?? []).map((tr) => (
            <option key={tr.id} value={tr.id}>
              {tr.id}
            </option>
          ))}
        </select>
        <button type="button" onClick={onCancel} style={{ ...plainButtonStyle, marginLeft: "auto" }}>
          {t.articleCancel}
        </button>
      </div>

      {loading && <p role="status" style={messageStyle}>{t.loading}</p>}
      {error && (
        <div role="alert" style={{ ...messageStyle, color: "var(--state-danger)" }}>
          <span>{error}</span>{" "}
          <button type="button" onClick={retry} style={inlineRetryStyle}>{t.retry}</button>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 220, overflowY: "auto" }}>
        {numbers.map((number) => (
          <button
            key={number}
            type="button"
            aria-label={t.planReadingLabel(localizedShortName, number)}
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
        {!loading && !error && numbers.length === 0 && <p role="status" style={messageStyle}>{t.planNoReadings}</p>}
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
