"use client";

import { useId, useState } from "react";
import { fetchChapters, fetchVerses, createComment, type Chapter, type Tag, type Verse } from "@/lib/api";
import { useT, bookLabel } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { getBookBySlug } from "@/lib/books";
import { translationLabel } from "@/lib/translations";
import { catalogEntry, groupCatalogByGenre, type BookCatalogEntry } from "@/lib/bookCatalog";

type Props = {
  catalog: BookCatalogEntry[];
  tags: Tag[];
  onSubmitted: () => void;
  onCancel: () => void;
};

const inputStyle: React.CSSProperties = {
  padding: "6px 10px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: 13,
  fontFamily: "inherit",
};

export function QAPostForm({ catalog, tags, onSubmitted, onCancel }: Props) {
  const t = useT();
  const { lang } = useLang();
  const titleId = useId();
  const bodyId = useId();
  const genreSelectId = useId();
  const bookSelectId = useId();
  const versionSelectId = useId();
  const chapterSelectId = useId();
  const verseSelectId = useId();
  const errorId = useId();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [slug, setSlug] = useState("");
  const [version, setVersion] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [verseId, setVerseId] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 選んだ書（slug）＋訳（version）から DB の Book id を引く。
  const resolveBookId = (s: string, v: string): string =>
    catalogEntry(catalog, s)?.translations.find((tr) => tr.id === v)?.bookId ?? "";
  const bookId = resolveBookId(slug, version);

  const loadChaptersFor = (bid: string) => {
    setChapterId("");
    setVerses([]);
    setVerseId("");
    if (bid) fetchChapters(bid).then(setChapters).catch(() => setChapters([]));
    else setChapters([]);
  };

  const selectBook = (newSlug: string) => {
    setSlug(newSlug);
    // その書の最初の訳を既定で選び、章を読み込む（訳が1つでも常に選択状態にする）。
    const firstVersion = getBookBySlug(newSlug)?.translations[0]?.id ?? "";
    setVersion(firstVersion);
    loadChaptersFor(resolveBookId(newSlug, firstVersion));
  };
  const handleSlugChange = (e: React.ChangeEvent<HTMLSelectElement>) => selectBook(e.target.value);

  const handleVersionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVersion = e.target.value;
    setVersion(newVersion);
    loadChaptersFor(resolveBookId(slug, newVersion));
  };

  const handleChapterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newChapterId = e.target.value;
    setChapterId(newChapterId);
    setVerses([]);
    setVerseId("");
    if (newChapterId) {
      fetchVerses(newChapterId).then(setVerses).catch(() => setVerses([]));
    }
  };

  const toggleTag = (id: string) =>
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createComment({
        title: title.trim(),
        body: body.trim(),
        is_qa: true,
        ...(verseId ? { verse: verseId } : chapterId ? { chapter: chapterId } : bookId ? { book: bookId } : {}),
        ...(tagIds.length > 0 ? { tag_ids: tagIds } : {}),
      });
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.postFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "16px 18px",
        marginBottom: 24,
        background: "var(--bg-alt)",
      }}
    >
      <label htmlFor={titleId} className="sr-only">{t.qaInputTitlePlaceholder}</label>
      <input
        id={titleId}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t.qaInputTitlePlaceholder}
        style={{
          width: "100%",
          padding: "8px 10px",
          border: "1px solid var(--border)",
          borderRadius: 8,
          background: "var(--bg)",
          color: "var(--text)",
          fontSize: 14,
          fontFamily: "inherit",
          boxSizing: "border-box",
          marginBottom: 8,
        }}
      />
      <label htmlFor={bodyId} className="sr-only">{t.qaInputPlaceholder}</label>
      <textarea
        id={bodyId}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t.qaInputPlaceholder}
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        style={{
          width: "100%",
          padding: "8px 10px",
          border: "1px solid var(--border)",
          borderRadius: 8,
          background: "var(--bg)",
          color: "var(--text)",
          fontSize: 14,
          resize: "vertical",
          fontFamily: "inherit",
          boxSizing: "border-box",
        }}
      />

      {/* 場所選択 */}
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <label htmlFor={genreSelectId} className="sr-only">{t.allBooks}</label>
        <select
          id={genreSelectId}
          value={genreFilter}
          onChange={(e) => { setGenreFilter(e.target.value); selectBook(""); }}
          style={inputStyle}
        >
          <option value="">{t.allBooks}</option>
          {groupCatalogByGenre(catalog).map(({ genre }) => (
            <option key={genre} value={genre}>{t.genreNames[genre] ?? genre}</option>
          ))}
        </select>
        <label htmlFor={bookSelectId} className="sr-only">{t.qaSelectBookOptional}</label>
        <select id={bookSelectId} value={slug} onChange={handleSlugChange} style={inputStyle}>
          <option value="">{t.qaSelectBookOptional}</option>
          {(genreFilter
            ? groupCatalogByGenre(catalog).find((g) => g.genre === genreFilter)?.entries ?? []
            : catalog
          ).map((e) => (
            <option key={e.slug} value={e.slug}>{bookLabel(e.slug, lang)?.short ?? e.slug}</option>
          ))}
        </select>
        {slug && (
          <>
            <label htmlFor={versionSelectId} className="sr-only">{t.bibleVersion}</label>
            <select id={versionSelectId} value={version} onChange={handleVersionChange} style={inputStyle}>
              {(getBookBySlug(slug)?.translations ?? []).map((tr) => (
                <option key={tr.id} value={tr.id}>{translationLabel(tr.id, lang)}</option>
              ))}
            </select>
          </>
        )}
        {chapters.length > 0 && (
          <>
            <label htmlFor={chapterSelectId} className="sr-only">{t.qaSelectChapterOptional}</label>
            <select id={chapterSelectId} value={chapterId} onChange={handleChapterChange} style={inputStyle}>
              <option value="">{t.qaSelectChapterOptional}</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>{t.chapterOption(c.number)}</option>
              ))}
            </select>
          </>
        )}
        {verses.length > 0 && (
          <>
            <label htmlFor={verseSelectId} className="sr-only">{t.qaSelectVerseOptional}</label>
            <select id={verseSelectId} value={verseId} onChange={(e) => setVerseId(e.target.value)} style={inputStyle}>
              <option value="">{t.qaSelectVerseOptional}</option>
              {verses.map((v) => (
                <option key={v.id} value={v.id}>{t.verseOption(v.number)}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* タグ選択 */}
      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {tags.map((tag) => {
            const active = tagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggleTag(tag.id)}
                style={{
                  fontSize: 12,
                  minHeight: 30,
                  padding: "3px 10px",
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  background: active ? "var(--accent)" : "transparent",
                  color: active ? "var(--accent-text)" : "var(--text-muted)",
                  fontFamily: "inherit",
                }}
              >
                {t.tagNames[tag.name] ?? tag.name}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          style={{ color: "#ef4444", fontSize: 12, margin: "6px 0 0" }}
        >
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "7px 14px",
            border: "1px solid var(--border)",
            borderRadius: 8,
            background: "transparent",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: 13,
            fontFamily: "inherit",
          }}
        >
          {t.cancel}
        </button>
        <button
          type="submit"
          disabled={submitting || !title.trim() || !body.trim()}
          style={{
            padding: "7px 16px",
            border: "none",
            borderRadius: 8,
            background: "var(--accent)",
            color: "var(--accent-text)",
            cursor: submitting || !title.trim() || !body.trim() ? "not-allowed" : "pointer",
            opacity: submitting || !title.trim() || !body.trim() ? 0.6 : 1,
            fontWeight: 700,
            fontSize: 13,
            fontFamily: "inherit",
          }}
        >
          {submitting ? t.posting : t.submitQuestion}
        </button>
      </div>
    </form>
  );
}
