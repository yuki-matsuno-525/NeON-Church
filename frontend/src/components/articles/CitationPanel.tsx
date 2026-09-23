"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import {
  fetchVerseBookmarks,
  fetchCommentarySectionBookmarks,
  fetchCommentarySections,
  fetchBookRead,
  fetchVerses,
  type Bookmark,
  type CommentarySection,
  type Verse,
} from "@/lib/api";
import { matchCommentaryWork, useCommentaryWorks } from "@/hooks/useCommentaryWorks";
import { SECTION_PAGE_SIZE } from "@/lib/commentary";
import { BOOKS, getBookBySlug } from "@/lib/books";
import { DEFAULT_TRANSLATION, translationLabel } from "@/lib/translations";
import { bookLabel, useT } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { ClearableSearchInput } from "@/components/ui";

/**
 * 引用パネル。記事を書きながら、引く節をここから選んで本文に入れる。
 *
 * 印は書く人が手で打つものではないので、選んでボタンを押すだけで入るようにする。
 * タブは「さがす」（書→章→節とたどる）、「解釈書」（解釈書→章→区切りとたどる）、
 * 「お気に入り」（読書中に印をつけた節・区切り）の3つ。
 */
export function CitationPanel({ onInsert }: { onInsert: (mark: string) => void }) {
  const t = useT();
  const [tab, setTab] = useState<"bookmarks" | "search" | "commentary">("search");
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
        <TabButton id={`${tabsId}-commentary`} panelId={`${tabsId}-commentary-panel`} active={tab === "commentary"} onClick={() => setTab("commentary")}>
          {t.citationCommentaryTab}
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
        {tab === "search" ? (
          <SearchTab onInsert={onInsert} />
        ) : tab === "commentary" ? (
          <CommentaryTab onInsert={onInsert} />
        ) : (
          <BookmarkTab onInsert={onInsert} />
        )}
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
    fetchBookRead(slug, translation)
      .then(({ chapters }) => {
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
    fetchBookRead(slug, translation)
      .then(({ chapters }) => {
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
        <label htmlFor="citation-book-search" className="form-label">
          {t.citationBookSearchPlaceholder}
        </label>
        <ClearableSearchInput
          id="citation-book-search"
          value={keyword}
          onChange={setKeyword}
          placeholder={t.citationBookSearchPlaceholder}
          ariaLabel={t.citationBookSearchPlaceholder}
          inputClassName="form-control"
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
          {matched.length === 0 && (
            <p className="text-xs text-muted leading-reading">{t.listSearchEmpty}</p>
          )}
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
  title,
  backLabel,
}: {
  slug: string;
  chapter: number;
  translation: string;
  verses: Verse[];
  loading: boolean;
  onBack: () => void;
  onInsert: (mark: string) => void;
  /** 見出しに出す章の名前。省くと「8章」。解釈書では章の題（「第41講」など）を渡す。 */
  title?: string;
  backLabel?: string;
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
          {backLabel ?? t.citationBackToChapters}
        </button>
        <span className="text-sm font-bold">{title ?? t.chapterFmt(chapter)}</span>
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
      const [verses, sections] = await Promise.all([fetchVerseBookmarks(), fetchCommentarySectionBookmarks()]);
      setBookmarks([
        ...verses.filter((bm) => bm.target_type === "verse" && bm.reference),
        ...sections,
      ]);
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
      {bookmarks.map((bookmark) =>
        bookmark.commentary_reference ? (
          <CommentaryBookmarkCard key={bookmark.id} bookmark={bookmark} onInsert={onInsert} />
        ) : (
          <BookmarkCitationCard key={bookmark.id} bookmark={bookmark} onInsert={onInsert} />
        ),
      )}
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

/** 解釈書の区切りのお気に入り。解釈書には訳が無いので、訳の選択は出さない。 */
function CommentaryBookmarkCard({ bookmark, onInsert }: { bookmark: Bookmark; onInsert: (mark: string) => void }) {
  const t = useT();
  const ref = bookmark.commentary_reference!;
  const insert = (kind: "inline" | "block") =>
    onInsert(buildMark({ kind, slug: `@${ref.work}`, chapter: ref.chapter ?? 0, verseStart: ref.number ?? undefined }));
  return (
    <div className="border border-border rounded-md p-3">
      <div className="text-xs text-accent font-bold mb-2">{ref.label}</div>
      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={() => insert("inline")} className="small-button">{t.citationInsertInline}</button>
        <button type="button" onClick={() => insert("block")} className="small-button">{t.citationInsertBlock}</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 解釈書タブ（解釈書 → 章 → 区切り）
// ---------------------------------------------------------------------------

/**
 * 解釈書から引く。聖書の「さがす」タブと同じ流れで、解釈書 → 章 → 区切りとたどる。
 * 印は [[@calvin-romans 8:3]] のように @ で始まる（訳の指定は無い）。
 * 区切りの一覧は聖書と同じ VerseList を使うので、範囲で選ぶこともできる。
 */
function CommentaryTab({ onInsert }: { onInsert: (mark: string) => void }) {
  const t = useT();
  const [keyword, setKeyword] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const [chapter, setChapter] = useState<{ number: number; title: string } | null>(null);
  const [sections, setSections] = useState<CommentarySection[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [sectionsFailed, setSectionsFailed] = useState(false);
  const { works, work, loading, failed, retry } = useCommentaryWorks(slug);

  const loadSections = async (chapterNumber: number, nextPage: number) => {
    if (!slug) return;
    setLoadingSections(true);
    setSectionsFailed(false);
    try {
      const result = await fetchCommentarySections(slug, chapterNumber, nextPage, SECTION_PAGE_SIZE);
      setSections((prev) => (nextPage === 1 ? result.results : [...prev, ...result.results]));
      setPage(nextPage);
      setHasMore(result.hasMore);
    } catch {
      setSectionsFailed(true);
    } finally {
      setLoadingSections(false);
    }
  };

  const errorBox = (onRetry: () => void) => (
    <div role="alert" className="flex gap-2 items-center flex-wrap mb-2">
      <p className="m-0 text-xs text-danger">{t.loadErrorDesc}</p>
      <button type="button" onClick={onRetry} className="small-button">{t.retry}</button>
    </div>
  );

  if (!slug) {
    const matched = works.filter((w) => matchCommentaryWork(w, keyword));
    return (
      <div className="px-3">
        <label htmlFor="citation-commentary-search" className="form-label">{t.commentaryFindWork}</label>
        <ClearableSearchInput
          id="citation-commentary-search"
          value={keyword}
          onChange={setKeyword}
          placeholder={t.commentaryFindWork}
          ariaLabel={t.commentaryFindWork}
          inputClassName="form-control"
        />
        {failed && errorBox(retry)}
        <div className="flex flex-col gap-1 mt-3">
          {matched.map((w) => (
            <button key={w.slug} type="button" onClick={() => setSlug(w.slug)} className="row-button">
              {w.title_ja || w.title}
              <span className="text-xs text-muted">　{w.author_ja || w.author}</span>
            </button>
          ))}
          {!loading && !failed && matched.length === 0 && (
            <p className="text-xs text-muted leading-reading">{t.listSearchEmpty}</p>
          )}
        </div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="px-3">
        <button type="button" onClick={() => setSlug(null)} className="back-button">
          {t.commentaryBackToWorks}
        </button>
        <strong className="block text-sm my-3">{work ? work.title_ja || work.title : ""}</strong>
        {failed && errorBox(retry)}
        {loading && <p role="status" className="text-xs text-muted">{t.loading}</p>}
        <div className="flex flex-col gap-1">
          {(work?.chapters ?? []).map((c) => (
            <div key={c.number} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setChapter({ number: c.number, title: c.title });
                  setSections([]);
                  void loadSections(c.number, 1);
                }}
                className="row-button flex-1"
              >
                {c.title || c.number}
              </button>
              {/* 章まるごとへの参照（講全体を指すときなど） */}
              <button
                type="button"
                onClick={() => onInsert(buildMark({ kind: "inline", slug: `@${slug}`, chapter: c.number }))}
                aria-label={`${c.title || c.number} ${t.citationInsertInline}`}
                className="small-button"
              >
                {t.citationInsertInline}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const verses: Verse[] = sections.map((section) => ({
    id: section.id,
    chapter: String(chapter.number),
    number: section.number,
    text: section.heading ? `${section.heading}　${section.text}` : section.text,
  }));
  return (
    <div className="px-3">
      {sectionsFailed && errorBox(() => void loadSections(chapter.number, page === 1 ? 1 : page + 1))}
      <VerseList
        slug={`@${slug}`}
        chapter={chapter.number}
        translation={DEFAULT_TRANSLATION}
        verses={verses}
        loading={loadingSections && sections.length === 0}
        onBack={() => {
          setChapter(null);
          setSections([]);
        }}
        onInsert={onInsert}
        title={chapter.title || String(chapter.number)}
      />
      {hasMore && (
        <button
          type="button"
          onClick={() => void loadSections(chapter.number, page + 1)}
          disabled={loadingSections}
          className="small-button mt-3"
        >
          {t.loadMore}
        </button>
      )}
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
