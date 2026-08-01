"use client";

import { useEffect, useState } from "react";
import {
  fetchBookmarks,
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
 * タブは「栞」（読書中に印をつけた節）と「さがす」（書→章→節とたどる）の2つ。
 */
export function CitationPanel({ onInsert }: { onInsert: (mark: string) => void }) {
  const t = useT();
  const [tab, setTab] = useState<"bookmarks" | "search">("search");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <TabButton active={tab === "search"} onClick={() => setTab("search")}>
          {t.citationSearchTab}
        </TabButton>
        <TabButton active={tab === "bookmarks"} onClick={() => setTab("bookmarks")}>
          {t.citationBookmarksTab}
        </TabButton>
      </div>

      <div style={{ overflowY: "auto", flex: 1, minHeight: 0, padding: "12px 0" }}>
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
  const [error, setError] = useState<string | null>(null);

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
    fetchBooks(translation)
      .then((books) => {
        const target = books.find((book) => book.name === bookNameFor(slug, translation));
        if (!target) throw new Error(t.citationBookUnavailable);
        return fetchChapters(target.id);
      })
      .then((chapters) => {
        if (!alive) return;
        setChapterNumbers(chapters.map((c) => c.number));
      })
      .catch((err) => {
        if (!alive) return;
        setChapterNumbers([]);
        setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, [slug, translation, t]);

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
        setError(err.message);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [slug, chapter, translation, t]);

  if (!slug) {
    return (
      <div style={{ padding: "0 12px" }}>
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder={t.citationBookSearchPlaceholder}
          style={inputStyle}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 10 }}>
          {matched.map((book) => (
            <button
              key={book.slug}
              type="button"
              onClick={() => setSlug(book.slug)}
              style={rowButtonStyle}
            >
              {bookLabel(book.slug, lang)?.name ?? book.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 12px" }}>
      <button type="button" onClick={() => resetTo(null)} style={backButtonStyle}>
        {t.citationChooseBookAgain}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0" }}>
        <strong style={{ fontSize: 13 }}>{displayMeta?.short}</strong>
        <select
          value={translation}
          onChange={(event) => {
            setTranslation(event.target.value);
            setVerses([]);
          }}
          style={{ ...inputStyle, width: "auto", flex: 1, padding: "5px 6px" }}
        >
          {/* その書に実際にある訳だけを出す */}
          {(meta?.translations ?? []).map((tr) => (
            <option key={tr.id} value={tr.id}>
              {translationLabel(tr.id, lang)}
            </option>
          ))}
        </select>
      </div>

      {error && <p style={{ fontSize: 12, color: "var(--state-error)" }}>{error}</p>}

      {chapter === null ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {chapterNumbers.map((number) => (
            <button
              key={number}
              type="button"
              onClick={() => setChapter(number)}
              style={chapterButtonStyle}
            >
              {number}
            </button>
          ))}
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
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <button type="button" onClick={onBack} style={backButtonStyle}>
          {t.citationBackToChapters}
        </button>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{t.chapterFmt(chapter)}</span>
        <button
          type="button"
          onClick={() => (rangeMode ? clearRange() : setRangeMode(true))}
          style={{
            ...smallButtonStyle,
            marginLeft: "auto",
            borderColor: rangeMode ? "var(--accent)" : "var(--border)",
            color: rangeMode ? "var(--accent)" : "var(--text-muted)",
          }}
        >
          {rangeMode ? t.citationStopRange : t.citationStartRange}
        </button>
      </div>

      {rangeMode && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 8px" }}>
          {rangeStart === null
            ? t.citationPickStart
            : rangeEnd === null
              ? t.citationPickEnd(rangeStart)
              : t.citationRange(rangeStart, rangeEnd)}
        </p>
      )}

      {rangeMode && rangeStart !== null && rangeEnd !== null && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <button
            type="button"
            onClick={() => {
              insert("inline", rangeStart, rangeEnd);
              clearRange();
            }}
            style={insertButtonStyle}
          >
            {t.citationInsertInline}
          </button>
          <button
            type="button"
            onClick={() => {
              insert("block", rangeStart, rangeEnd);
              clearRange();
            }}
            style={{ ...insertButtonStyle, background: "var(--accent)", color: "var(--accent-text)", border: "none" }}
          >
            {t.citationInsertBlock}
          </button>
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: 12, color: "var(--text-faint)" }}>{t.loading}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
                style={{
                  border: `1px solid ${inRange || isStart ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 8,
                  padding: 10,
                  background: inRange || isStart ? "var(--accent-tint)" : "transparent",
                }}
              >
                <div style={{ display: "flex", gap: 6, fontSize: 13, lineHeight: 1.7 }}>
                  <span style={{ color: "var(--text-faint)", flexShrink: 0 }}>{verse.number}</span>
                  <span>{verse.text}</span>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  {rangeMode ? (
                    <button
                      type="button"
                      onClick={() => handleRangePick(verse.number)}
                      style={smallButtonStyle}
                    >
                      {rangeStart === null ? t.citationSelectStart : t.citationSelectEnd}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => insert("inline", verse.number)}
                        style={smallButtonStyle}
                      >
                        {t.citationInsertInline}
                      </button>
                      <button
                        type="button"
                        onClick={() => insert("block", verse.number)}
                        style={smallButtonStyle}
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
// 栞タブ
// ---------------------------------------------------------------------------

function BookmarkTab({ onInsert }: { onInsert: (mark: string) => void }) {
  const t = useT();
  const { lang } = useLang();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookmarks()
      .then((list) => setBookmarks(list.filter((bm) => bm.target_type === "verse" && bm.reference)))
      .catch(() => setBookmarks([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p style={{ padding: "0 12px", fontSize: 12, color: "var(--text-faint)" }}>{t.loading}</p>;
  }

  if (bookmarks.length === 0) {
    return (
      <p style={{ padding: "0 12px", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>
        {t.citationNoVerseBookmarks}
      </p>
    );
  }

  return (
    <div style={{ padding: "0 12px", display: "flex", flexDirection: "column", gap: 8 }}>
      {bookmarks.map((bookmark) => {
        const reference = bookmark.reference!;
        const meta = bookLabel(reference.book, lang);
        // 栞は訳に依らない箇所なので、印にも訳を付けない（読む人の訳で開く）。
        const insert = (kind: "inline" | "block") =>
          onInsert(
            buildMark({
              kind,
              slug: reference.book,
              chapter: reference.chapter ?? 1,
              verseStart: reference.verse ?? undefined,
            }),
          );
        return (
          <div key={bookmark.id} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700, marginBottom: 4 }}>
              {meta?.short ?? reference.book} {reference.chapter}:{reference.verse}
            </div>
            {bookmark.verse_text && (
              <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                {bookmark.verse_text}
              </p>
            )}
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" onClick={() => insert("inline")} style={smallButtonStyle}>
                {t.citationInsertInline}
              </button>
              <button type="button" onClick={() => insert("block")} style={smallButtonStyle}>
                {t.citationInsertBlock}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "10px 8px",
        minHeight: 40,
        border: "none",
        background: "none",
        borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
        color: active ? "var(--accent)" : "var(--text-muted)",
        fontWeight: active ? 700 : 400,
        fontSize: 13,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
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

const backButtonStyle: React.CSSProperties = {
  border: "none",
  background: "none",
  color: "var(--text-muted)",
  fontSize: 12,
  cursor: "pointer",
  padding: 0,
  fontFamily: "inherit",
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

const smallButtonStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 6,
  background: "transparent",
  color: "var(--text-muted)",
  fontSize: 12,
  padding: "5px 10px",
  minHeight: 32,
  cursor: "pointer",
  fontFamily: "inherit",
};

const insertButtonStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 6,
  background: "transparent",
  color: "var(--text)",
  fontSize: 13,
  padding: "6px 12px",
  minHeight: 34,
  cursor: "pointer",
  fontFamily: "inherit",
};
