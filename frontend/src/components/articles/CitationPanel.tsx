"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import {
  fetchVerseBookmarks,
  fetchBooks,
  fetchChapters,
  fetchVerses,
  type Bookmark,
  type Verse,
} from "@/lib/api";
import { BOOKS, getBookBySlug } from "@/lib/books";
import { DEFAULT_TRANSLATION, translationLabel } from "@/lib/translations";
import { bookLabel, useT } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";

/**
 * 引用パネル。記事を書きながら、引く節をここから選んで本文に入れる。
 *
 * 印は書く人が手で打つものではないので、選んでボタンを押すだけで入るようにする。
 * タブは「お気に入り」（読書中に印をつけた節）と「さがす」（書→章→節とたどる）の2つ。
 */
export function CitationPanel({ onInsert }: { onInsert: (mark: string) => void }) {
  const t = useT();
  const [tab, setTab] = useState<"bookmarks" | "search">("search");
  const tabsId = useId();

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        role="tablist"
        aria-label={t.articleTabCitations}
        onKeyDown={handleTabArrowKey}
        className="flex border-b border-border shrink-0"
      >
        <TabButton id={`${tabsId}-search`} panelId={`${tabsId}-search-panel`} active={tab === "search"} onClick={() => setTab("search")}>
          {t.citationSearchTab}
        </TabButton>
        <TabButton id={`${tabsId}-bookmarks`} panelId={`${tabsId}-bookmarks-panel`} active={tab === "bookmarks"} onClick={() => setTab("bookmarks")}>
          {t.citationBookmarksTab}
        </TabButton>
      </div>

      <div
        role="tabpanel"
        id={`${tabsId}-${tab}-panel`}
        aria-labelledby={`${tabsId}-${tab}`}
        className="flex-1 min-h-0 overflow-y-auto py-3"
      >
        {tab === "search" ? <SearchTab onInsert={onInsert} /> : <BookmarkTab onInsert={onInsert} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 印を組み立てる
// ---------------------------------------------------------------------------

/**
 * 引用の印を作る。
 *
 * 既定の訳（口語訳）のときは訳を書かない。ふだんは短い印のままにして、
 * あえて別の訳（ギリシャ語など）を選んだときだけ訳が印に残るようにする。
 */
export function buildMark(params: {
  kind: "inline" | "block";
  slug: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
  translation?: string;
}): string {
  const { kind, slug, chapter, verseStart, verseEnd, translation } = params;
  let reference = `${slug} ${chapter}`;
  if (verseStart) {
    reference += `:${verseStart}`;
    if (verseEnd && verseEnd !== verseStart) reference += `-${verseEnd}`;
  }
  if (translation && translation !== DEFAULT_TRANSLATION) reference += `|${translation}`;
  return kind === "inline" ? `[[${reference}]]` : `{{${reference}}}`;
}

// ---------------------------------------------------------------------------
// さがすタブ（書 → 章 → 節）
// ---------------------------------------------------------------------------

function SearchTab({ onInsert }: { onInsert: (mark: string) => void }) {
  const t = useT();
  const { lang } = useLang();
  const [keyword, setKeyword] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const [translation, setTranslation] = useState(DEFAULT_TRANSLATION);
  const [chapter, setChapter] = useState<number | null>(null);
  const [chapterNumbers, setChapterNumbers] = useState<number[]>([]);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const meta = slug ? getBookBySlug(slug) : null;
  const displayMeta = slug ? bookLabel(slug, lang) : null;
  const normalizedKeyword = keyword.toLocaleLowerCase(lang);
  const matched = BOOKS.filter(
    (book) =>
      !normalizedKeyword ||
      book.name.toLocaleLowerCase(lang).includes(normalizedKeyword) ||
      book.short.toLocaleLowerCase(lang).includes(normalizedKeyword) ||
      book.englishName.toLocaleLowerCase(lang).includes(normalizedKeyword),
  );

  // 書と訳が決まったら章の一覧を引く。章番号は連番とは限らないので、決め打ちせず API から取る。
  useEffect(() => {
    if (!slug) return;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    setLoadingChapters(true);
    fetchBooks(translation)
      .then((books) => {
        const target = books.find((book) => book.name === bookNameFor(slug, translation));
        if (!target) throw new Error(t.citationBookUnavailable);
        return fetchChapters(target.id);
      })
      .then((chapters) => {
        if (!alive) return;
        setChapterNumbers(chapters.map((c) => c.number));
        setLoadingChapters(false);
      })
      .catch((err) => {
        if (!alive) return;
        setChapterNumbers([]);
        setError(err instanceof Error ? err.message : "章を読み込めませんでした。");
        setLoadingChapters(false);
      });
    return () => {
      alive = false;
    };
  }, [slug, translation, reloadToken, t]);

  // 章が決まったら節の一覧を引く。
  useEffect(() => {
    if (!slug || !chapter) return;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetchBooks(translation)
      .then((books) => {
        const target = books.find((book) => book.name === bookNameFor(slug, translation));
        if (!target) throw new Error(t.citationBookUnavailable);
        return fetchChapters(target.id);
      })
      .then((chapters) => {
        const found = chapters.find((c) => c.number === chapter);
        if (!found) throw new Error(t.citationChapterUnavailable);
        return fetchVerses(found.id);
      })
      .then((list) => {
        if (!alive) return;
        setVerses(list);
        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        setVerses([]);
        setError(err instanceof Error ? err.message : "節を読み込めませんでした。");
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [slug, chapter, translation, reloadToken, t]);

  if (!slug) {
    return (
      <div className="px-3">
        <label htmlFor="citation-book-search" className="form-label">引用する書をさがす</label>
        <input
          id="citation-book-search"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder={t.citationBookSearchPlaceholder}
          className="form-control"
        />
        <div className="flex flex-col gap-1 mt-3">
          {matched.map((book) => (
            <button
              key={book.slug}
              type="button"
              onClick={() => setSlug(book.slug)}
              className="row-button"
            >
              {bookLabel(book.slug, lang)?.name ?? book.name}
            </button>
          ))}
          {matched.length === 0 && <p className="text-xs text-muted leading-reading">一致する書はありません。</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="px-3">
      <button type="button" onClick={() => resetTo(null)} className="back-button">
        {t.citationChooseBookAgain}
      </button>

      <div className="flex items-center gap-2 my-3 mx-0">
        <strong className="text-sm">{displayMeta?.short}</strong>
        <label htmlFor="citation-translation" className="sr-only">{t.translationLabel}</label>
        <select
          id="citation-translation"
          value={translation}
          onChange={(event) => {
            setTranslation(event.target.value);
            setVerses([]);
          }}
          className="form-control w-auto flex-1 p-1"
        >
          {/* その書に実際にある訳だけを出す */}
          {(meta?.translations ?? []).map((tr) => (
            <option key={tr.id} value={tr.id}>
              {translationLabel(tr.id, lang)}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div role="alert" className="flex gap-2 items-center flex-wrap mb-2">
          <p className="m-0 text-xs text-danger">{error}</p>
          <button type="button" onClick={() => setReloadToken((value) => value + 1)} className="small-button">再試行</button>
        </div>
      )}

      {chapter === null ? (
        loadingChapters ? <p role="status" className="text-xs text-muted leading-reading">章を読み込んでいます…</p> : <div className="flex flex-wrap gap-2">
          {chapterNumbers.map((number) => (
            <button
              key={number}
              type="button"
              onClick={() => setChapter(number)}
              className="chapter-button"
            >
              <span aria-hidden="true">{number}</span><span className="sr-only">第{number}章</span>
            </button>
          ))}
          {!error && chapterNumbers.length === 0 && <p className="text-xs text-muted leading-reading">この翻訳には章がありません。</p>}
        </div>
      ) : (
        <VerseList
          slug={slug}
          chapter={chapter}
          translation={translation}
          verses={verses}
          loading={loading}
          onBack={() => {
            setChapter(null);
            setVerses([]);
          }}
          onInsert={onInsert}
        />
      )}
    </div>
  );

  function resetTo(next: string | null) {
    setSlug(next);
    setChapter(null);
    setVerses([]);
    setChapterNumbers([]);
    setError(null);
  }
}

function bookNameFor(slug: string, translation: string): string {
  const meta = getBookBySlug(slug);
  return meta?.translations.find((tr) => tr.id === translation)?.name ?? meta?.name ?? "";
}

// ---------------------------------------------------------------------------
// 節の一覧（1タップで挿入。範囲は「範囲で選ぶ」から）
// ---------------------------------------------------------------------------

function VerseList({
  slug,
  chapter,
  translation,
  verses,
  loading,
  onBack,
  onInsert,
}: {
  slug: string;
  chapter: number;
  translation: string;
  verses: Verse[];
  loading: boolean;
  onBack: () => void;
  onInsert: (mark: string) => void;
}) {
  const t = useT();
  // 範囲で選ぶあいだだけ使う。start が決まると「終わりの節」を待つ。
  const [rangeMode, setRangeMode] = useState(false);
  const [rangeStart, setRangeStart] = useState<number | null>(null);
  const [rangeEnd, setRangeEnd] = useState<number | null>(null);

  const insert = (kind: "inline" | "block", verseStart: number, verseEnd?: number) => {
    onInsert(buildMark({ kind, slug, chapter, verseStart, verseEnd, translation }));
  };

  const handleRangePick = (number: number) => {
    if (rangeStart === null) {
      setRangeStart(number);
      setRangeEnd(null);
    } else if (number < rangeStart) {
      // 逆から選ばれたら、そこを始まりにし直す
      setRangeStart(number);
      setRangeEnd(null);
    } else {
      setRangeEnd(number);
    }
  };

  const clearRange = () => {
    setRangeMode(false);
    setRangeStart(null);
    setRangeEnd(null);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <button type="button" onClick={onBack} className="back-button">
          {t.citationBackToChapters}
        </button>
        <span className="text-sm font-bold">{t.chapterFmt(chapter)}</span>
        <button
          type="button"
          onClick={() => (rangeMode ? clearRange() : setRangeMode(true))}
          className={`small-button ml-auto${rangeMode ? " small-button-on" : ""}`}
        >
          {rangeMode ? t.citationStopRange : t.citationStartRange}
        </button>
      </div>

      {rangeMode && (
        <p className="text-xs text-muted mt-0 mx-0 mb-2">
          {rangeStart === null
            ? t.citationPickStart
            : rangeEnd === null
              ? t.citationPickEnd(rangeStart)
              : t.citationRange(rangeStart, rangeEnd)}
        </p>
      )}

      {rangeMode && rangeStart !== null && rangeEnd !== null && (
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => {
              insert("inline", rangeStart, rangeEnd);
              clearRange();
            }}
            className="small-button small-button-strong"
          >
            {t.citationInsertInline}
          </button>
          <button
            type="button"
            onClick={() => {
              insert("block", rangeStart, rangeEnd);
              clearRange();
            }}
            className="small-button small-button-strong small-button-primary"
          >
            {t.citationInsertBlock}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-faint">{t.loading}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {verses.map((verse) => {
            const inRange =
              rangeStart !== null &&
              rangeEnd !== null &&
              verse.number >= rangeStart &&
              verse.number <= rangeEnd;
            const isStart = rangeStart === verse.number;
            return (
              <div
                key={verse.id}
                className={`citation-verse${inRange || isStart ? " citation-verse-picked" : ""}`}
              >
                <div className="flex gap-2 text-sm leading-reading">
                  <span className="text-faint shrink-0">{verse.number}</span>
                  <span>{verse.text}</span>
                </div>
                <div className="flex gap-2 mt-2">
                  {rangeMode ? (
                    <button
                      type="button"
                      onClick={() => handleRangePick(verse.number)}
                      className="small-button"
                    >
                      {rangeStart === null ? t.citationSelectStart : t.citationSelectEnd}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => insert("inline", verse.number)}
                        className="small-button"
                      >
                        {t.citationInsertInline}
                      </button>
                      <button
                        type="button"
                        onClick={() => insert("block", verse.number)}
                        className="small-button"
                      >
                        {t.citationInsertBlock}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// お気に入りタブ
// ---------------------------------------------------------------------------

function BookmarkTab({ onInsert }: { onInsert: (mark: string) => void }) {
  const t = useT();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBookmarks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchVerseBookmarks();
      setBookmarks(list.filter((bm) => bm.target_type === "verse" && bm.reference));
    } catch {
      setError(t.loadErrorDesc);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadBookmarks();
  }, [loadBookmarks]);

  if (loading) {
    return <p role="status" className="px-3 text-xs text-muted">{t.loading}</p>;
  }

  if (error) {
    return (
      <div role="alert" className="px-3">
        <p className="text-xs text-danger leading-reading">{error}</p>
        <button type="button" onClick={() => void loadBookmarks()} className="small-button">{t.retry}</button>
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="px-3 text-xs text-muted leading-reading">
        <p>{t.citationNoVerseBookmarks}</p>
        <Link href="/read" className="text-accent inline-flex tap-target items-center">{t.read}</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-3">
      {bookmarks.map((bookmark) => {
        return <BookmarkCitationCard key={bookmark.id} bookmark={bookmark} onInsert={onInsert} />;
      })}
    </div>
  );
}

function BookmarkCitationCard({ bookmark, onInsert }: { bookmark: Bookmark; onInsert: (mark: string) => void }) {
  const t = useT();
  const { lang } = useLang();
  const reference = bookmark.reference!;
  const book = getBookBySlug(reference.book);
  const displayMeta = bookLabel(reference.book, lang);
  const translations = book?.translations ?? [];
  const initialTranslation = translations.some((item) => item.id === DEFAULT_TRANSLATION)
    ? DEFAULT_TRANSLATION
    : translations[0]?.id ?? DEFAULT_TRANSLATION;
  const [translation, setTranslation] = useState<string>(initialTranslation);
  const selectId = `bookmark-translation-${bookmark.id}`;
  const insert = (kind: "inline" | "block") => onInsert(buildMark({
    kind,
    slug: reference.book,
    chapter: reference.chapter ?? 1,
    verseStart: reference.verse ?? undefined,
    translation,
  }));

  return (
    <div className="border border-border rounded-md p-3">
      <div className="text-xs text-accent font-bold mb-1">
        {displayMeta?.short ?? reference.book} {reference.chapter}:{reference.verse}
      </div>
      {bookmark.verse_text && <p className="mt-0 mx-0 mb-2 text-sm text-muted leading-base">{bookmark.verse_text}</p>}
      <label htmlFor={selectId} className="form-label">{t.translationLabel}</label>
      <select id={selectId} value={translation} onChange={(event) => setTranslation(event.target.value)} className="form-control mb-2">
        {translations.map((item) => <option key={item.id} value={item.id}>{translationLabel(item.id, lang)}</option>)}
      </select>
      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={() => insert("inline")} className="small-button">{t.citationInsertInline}</button>
        <button type="button" onClick={() => insert("block")} className="small-button">{t.citationInsertBlock}</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function TabButton({
  id,
  panelId,
  active,
  onClick,
  children,
}: {
  id: string;
  panelId: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      id={id}
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={panelId}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={`tab-underline flex-1${active ? " tab-underline-active" : ""}`}
    >
      {children}
    </button>
  );
}




function handleTabArrowKey(event: React.KeyboardEvent<HTMLElement>) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
  const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  if (tabs.length === 0) return;
  const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
  let next = current;
  if (event.key === "Home") next = 0;
  else if (event.key === "End") next = tabs.length - 1;
  else if (event.key === "ArrowRight") next = (Math.max(current, 0) + 1) % tabs.length;
  else next = (current <= 0 ? tabs.length : current) - 1;
  event.preventDefault();
  tabs[next]?.focus();
  tabs[next]?.click();
}
