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
      <div role="group" aria-label={t.citationBookSearchPlaceholder} className="note-box mt-2 mb-0 p-3">
        <div className="flex gap-2 mb-2">
          <label className="flex-1">
            <span className="sr-only">{t.citationBookSearchPlaceholder}</span>
            <input
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={t.citationBookSearchPlaceholder}
              autoFocus
              className="form-control w-full"
            />
          </label>
          <button type="button" onClick={onCancel} className="back-button">
            {t.articleCancel}
          </button>
        </div>
        <div className="scroll-list">
          {matched.map((book) => (
            <button
              key={book.slug}
              type="button"
              onClick={() => {
                setTranslation("");
                setSlug(book.slug);
              }}
              className="row-button"
            >
              {localizedBookName(book)}
            </button>
          ))}
          {matched.length === 0 && <p role="status" className="px-3 text-xs text-muted leading-reading">{t.listSearchEmpty}</p>}
        </div>
      </div>
    );
  }

  return (
    <div role="group" aria-label={`${t.planAddChapter}: ${localizedShortName}`} className="note-box mt-2 mb-0 p-3">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <button type="button" onClick={() => { setSlug(null); setTranslation(""); }} className="back-button">
          {t.planBackToBooks}
        </button>
        <strong className="text-sm">{localizedShortName}</strong>
        <select
          value={translation}
          onChange={(event) => setTranslation(event.target.value)}
          aria-label={t.planTranslationLabel}
          className="form-control w-auto"
        >
          <option value="">{t.planReaderTranslation}</option>
          {(meta?.translations ?? []).map((tr) => (
            <option key={tr.id} value={tr.id}>
              {tr.id}
            </option>
          ))}
        </select>
        <button type="button" onClick={onCancel} className="back-button ml-auto">
          {t.articleCancel}
        </button>
      </div>

      {loading && <p role="status" className="px-3 text-xs text-muted leading-reading">{t.loading}</p>}
      {error && (
        <div role="alert" className="px-3 text-xs text-danger leading-reading">
          <span>{error}</span>{" "}
          <button type="button" onClick={retry} className="link-button">{t.retry}</button>
        </div>
      )}

      <div className="scroll-list flex flex-wrap gap-2">
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
            className="chapter-button"
          >
            {number}
          </button>
        ))}
        {!loading && !error && numbers.length === 0 && <p role="status" className="px-3 text-xs text-muted leading-reading">{t.planNoReadings}</p>}
      </div>
    </div>
  );
}


