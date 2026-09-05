"use client";

import { useState } from "react";
import Link from "next/link";
import { BOOKS, GENRE_ORDER, chapterTitle, getBookBySlug } from "@/lib/books";
import { useBookChapters } from "@/hooks/useBookChapters";
import { DEFAULT_TRANSLATION } from "@/lib/translations";
import { useLang } from "@/contexts/LanguageContext";
import { useT, bookLabel } from "@/lib/i18n";
import { ClearableSearchInput } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { planUiText } from "@/components/plans/planUiText";
import { readingHref } from "./ReadingChips";

export type PickedChapter = {
  book: string;
  book_name: string;
  chapter_number: number;
  translation: string;
};

/** すでにその日に入っている章。＋ を押せなくするために受け取る。 */
export type PickedKey = { book: string; chapter_number: number };

/**
 * その日に読む章を選ぶ。ジャンルか名前で書を絞り、書を選ぶと章が 1 行 1 章で並ぶ。
 *
 * 章の行には書き出し（第1節の頭）を添えて、「読む」で本文を別のタブで開けるようにしてある。
 * 番号だけの一覧では、何の章を足そうとしているのか分からないまま選ぶことになるため。
 * 書き出しは章の一覧といっしょに 1 回で返ってくる（useBookChapters）。
 *
 * 訳は任意。選ばなければ読む人の訳で開く。あえてギリシャ語を選ぶと、その日は原文で読ませられる。
 * 訳の一覧はその書に実際にあるものだけを出すので、無い訳を選んでしまうことがない。
 */
export function ChapterPicker({
  picked,
  canAdd,
  onPick,
}: {
  picked: PickedKey[];
  /** その日の章数が上限に達していたら false。 */
  canAdd: boolean;
  onPick: (chapter: PickedChapter) => void;
}) {
  const t = useT();
  const { lang } = useLang();
  const text = planUiText(lang);
  const [keyword, setKeyword] = useState("");
  const [genre, setGenre] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  // 空文字は「読む人の訳にまかせる」。
  const [translation, setTranslation] = useState("");

  const meta = slug ? getBookBySlug(slug) : null;
  const { chapters, error, loading, retry } = useBookChapters(slug, translation || DEFAULT_TRANSLATION);

  const bookName = (book: (typeof BOOKS)[number]) => bookLabel(book.slug, lang)?.name ?? book.name;
  const shortName = meta ? (bookLabel(meta.slug, lang)?.short ?? meta.short) : "";

  // ------------------------------------------------------------------
  // 書を選ぶ
  // ------------------------------------------------------------------
  if (!slug) {
    const normalized = keyword.trim().toLocaleLowerCase();
    const matched = BOOKS.filter((book) => {
      if (genre && book.genre !== genre) return false;
      if (!normalized) return true;
      return [book.name, book.short, book.englishName, book.slug].some((value) =>
        value.toLocaleLowerCase().includes(normalized),
      );
    });
    // 書がある分類だけ出す。空の分類を押せると行き止まりになるため。
    const genres = GENRE_ORDER.map((name) => ({
      name,
      count: BOOKS.filter((book) => book.genre === name).length,
    })).filter((entry) => entry.count > 0);

    return (
      <div role="group" aria-label={text.stepAdd}>
        <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label={text.genreFilterLabel}>
          <button
            type="button"
            onClick={() => setGenre("")}
            aria-pressed={genre === ""}
            className={`chip chip-sm${genre === "" ? " chip-on" : ""}`}
          >
            {text.genreAll}
          </button>
          {genres.map((entry) => (
            <button
              key={entry.name}
              type="button"
              onClick={() => setGenre(entry.name)}
              aria-pressed={genre === entry.name}
              className={`chip chip-sm${genre === entry.name ? " chip-on" : ""}`}
            >
              {t.genreNames[entry.name] ?? entry.name}
            </button>
          ))}
        </div>

        <label className="block mb-2">
          <span className="sr-only">{text.findBookLabel}</span>
          <ClearableSearchInput
            value={keyword}
            onChange={setKeyword}
            placeholder={text.findBookPlaceholder}
            ariaLabel={text.findBookLabel}
            inputClassName="form-control w-full"
          />
        </label>

        <div className="scroll-list">
          {matched.map((book) => (
            <div key={book.slug} className="select-row">
              <button
                type="button"
                onClick={() => {
                  setTranslation("");
                  setSlug(book.slug);
                }}
                className="select-row-main"
              >
                <span className="flex items-center gap-2">
                  <Icon name="book-open" size={18} color="var(--neon-purple)" />
                  <span>{bookName(book)}</span>
                </span>
              </button>
              <span className="text-xs text-soft">{text.chapterCount(book.totalChapters)}</span>
              <Icon name="chevron-right" size={18} color="var(--accent)" />
            </div>
          ))}
          {matched.length === 0 && (
            <p role="status" className="px-3 text-xs text-muted leading-reading">{text.noBooks}</p>
          )}
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // その書の章を選ぶ
  // ------------------------------------------------------------------
  return (
    <div role="group" aria-label={text.chooseChapter(shortName)}>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <button type="button" onClick={() => { setSlug(null); setTranslation(""); }} className="back-button text-soft">
          {text.backToBooks}
        </button>
        <strong className="text-sm">{shortName}</strong>
        <select
          value={translation}
          onChange={(event) => setTranslation(event.target.value)}
          aria-label={text.translationLabel}
          className="form-control w-auto ml-auto"
        >
          <option value="">{text.readerTranslation}</option>
          {(meta?.translations ?? []).map((tr) => (
            <option key={tr.id} value={tr.id}>{tr.id}</option>
          ))}
        </select>
      </div>

      {loading && <p role="status" className="px-3 text-xs text-muted leading-reading">{text.chapterLoading}</p>}
      {error && (
        <div role="alert" className="px-3 text-xs text-danger leading-reading">
          <span>{text.chapterLoadError}</span>{" "}
          <button type="button" onClick={retry} className="link-button">{text.retry}</button>
        </div>
      )}

      <div className="scroll-list scroll-list-tall">
        {chapters.map((chapter) => {
          const label = text.chapterLabel(shortName, chapter.number);
          const added = picked.some(
            (item) => item.book === slug && item.chapter_number === chapter.number,
          );
          // 章が番号ではなく見出しで区切られる書（マリアの福音書など）は、
          // 書き出しよりも見出しのほうが「どの章か」を言い当てる。
          const note = chapterTitle(slug, chapter.number) ?? chapter.opening;
          return (
            <div key={chapter.id} className="select-row">
              {/* 押せるのは「読む」と ＋ の 2 つだけ。題と書き出しは読むためのもの。
                  ＋ の当たり判定は行いっぱいに広げてあるので、行のどこを押しても足せる。 */}
              <div className="select-row-main">
                <span>{label}</span>
                {note && <span className="select-row-note">{note}</span>}
              </div>
              <Link
                href={readingHref({ book: slug, chapter_number: chapter.number, translation })}
                target="_blank"
                rel="noreferrer"
                aria-label={text.openChapterLabel(label)}
                className="select-row-aside flex items-center gap-1 px-2 text-xs text-muted no-underline"
              >
                {text.openChapter}
                <Icon name="external-link" size={14} />
              </Link>
              <button
                type="button"
                onClick={() => onPick({
                  book: slug,
                  book_name: meta ? bookName(meta) : slug,
                  chapter_number: chapter.number,
                  translation,
                })}
                disabled={added || !canAdd}
                aria-label={added ? text.alreadyAdded(label) : text.addChapterLabel(label)}
                className="circle-button select-row-add"
              >
                <Icon name="plus" size={18} />
              </button>
            </div>
          );
        })}
        {!loading && !error && chapters.length === 0 && (
          <p role="status" className="px-3 text-xs text-muted leading-reading">{text.noChapters}</p>
        )}
      </div>
    </div>
  );
}
