"use client";

import { useId, useState } from "react";
import { fetchChapters, fetchVerses, createQuestion, type Chapter, type Tag, type Verse } from "@/lib/api";
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
  /**
   * 箇所をあらかじめ決めておく（読書ページから「この箇所について質問する」で開く場合）。
   * 渡すと書・章・節の選択欄は出さず、その箇所で固定する。
   */
  fixedLocation?: { verse?: string; chapter?: string; book?: string; label?: string };
};


export function QAPostForm({ catalog, tags, onSubmitted, onCancel, fixedLocation }: Props) {
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
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // 選んだ書（slug）＋訳（version）から DB の Book id を引く。
  const resolveBookId = (s: string, v: string): string =>
    catalogEntry(catalog, s)?.translations.find((tr) => tr.id === v)?.bookId ?? "";
  const bookId = resolveBookId(slug, version);

  const loadChaptersFor = (bid: string) => {
    setChapterId("");
    setVerses([]);
    setVerseId("");
    setLocationError(null);
    if (bid) fetchChapters(bid).then(setChapters).catch(() => {
      setChapters([]);
      setLocationError(t.loadErrorDesc);
    });
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
      setLocationError(null);
      fetchVerses(newChapterId).then(setVerses).catch(() => {
        setVerses([]);
        setLocationError(t.loadErrorDesc);
      });
    }
  };

  const toggleTag = (id: number) =>
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 未入力のまま押せたときは、何が足りないのかを名指しする。
    // ボタンを押せなくして黙って止めると、理由が伝わらない。
    const missing: string[] = [];
    if (!title.trim()) missing.push(t.fieldTitle);
    if (!body.trim()) missing.push(t.fieldBody);
    if (missing.length > 0) {
      setError(t.missingFields(missing));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // 箇所は verse / chapter / book のちょうど1つ。細かい方を優先する。
      const location = fixedLocation
        ? { verse: fixedLocation.verse, chapter: fixedLocation.chapter, book: fixedLocation.book }
        : verseId
          ? { verse: verseId }
          : chapterId
            ? { chapter: chapterId }
            : bookId
              ? { book: bookId }
              : {};
      await createQuestion({
        title: title.trim(),
        body: body.trim(),
        ...location,
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
      className="border border-border rounded-md py-4 px-4 mb-6 bg-bg-alt"
    >
      <label htmlFor={titleId} className="form-label">{t.fieldTitle}</label>
      <input
        id={titleId}
        type="text"
        value={title}
        maxLength={200}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t.qaInputTitlePlaceholder}
        aria-invalid={!title.trim() && !!error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="form-control mb-2 text-sm"
      />
      <label htmlFor={bodyId} className="form-label">{t.fieldBody}</label>
      <textarea
        id={bodyId}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t.qaInputPlaceholder}
        rows={4}
        maxLength={5000}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="form-control resize-y text-sm"
      />

      {/* 場所選択。読書ページから開いたときは、その箇所で固定なので選ばせない。 */}
      {fixedLocation ? (
        fixedLocation.label && (
          <p className="mt-3 mx-0 mb-0 text-xs text-muted">
            {fixedLocation.label}
          </p>
        )
      ) : (
      <>
      <div className="flex gap-2 mt-3 flex-wrap">
        <label htmlFor={genreSelectId} className="sr-only">{t.allBooks}</label>
        <select
          id={genreSelectId}
          value={genreFilter}
          onChange={(e) => { setGenreFilter(e.target.value); selectBook(""); }}
          className="form-control"
        >
          <option value="">{t.allBooks}</option>
          {groupCatalogByGenre(catalog).map(({ genre }) => (
            <option key={genre} value={genre}>{t.genreNames[genre] ?? genre}</option>
          ))}
        </select>
        <label htmlFor={bookSelectId} className="sr-only">{t.qaSelectBookOptional}</label>
        <select id={bookSelectId} value={slug} onChange={handleSlugChange} className="form-control">
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
            <select id={versionSelectId} value={version} onChange={handleVersionChange} className="form-control">
              {(getBookBySlug(slug)?.translations ?? []).map((tr) => (
                <option key={tr.id} value={tr.id}>{translationLabel(tr.id, lang)}</option>
              ))}
            </select>
          </>
        )}
        {chapters.length > 0 && (
          <>
            <label htmlFor={chapterSelectId} className="sr-only">{t.qaSelectChapterOptional}</label>
            <select id={chapterSelectId} value={chapterId} onChange={handleChapterChange} className="form-control">
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
            <select id={verseSelectId} value={verseId} onChange={(e) => setVerseId(e.target.value)} className="form-control">
              <option value="">{t.qaSelectVerseOptional}</option>
              {verses.map((v) => (
                <option key={v.id} value={v.id}>{t.verseOption(v.number)}</option>
              ))}
            </select>
          </>
        )}
      </div>
      {locationError && (
        <p role="alert" className="text-danger text-xs mt-2 mx-0 mb-0">
          {locationError}
        </p>
      )}
      </>
      )}

      {/* タグ選択 */}
      {tags.length > 0 && (
        <fieldset className="border-0 p-0 mt-3 mx-0 mb-0">
          <legend className="form-label">{t.allTags}</legend>
          <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const active = tagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggleTag(tag.id)}
                className={`pill-toggle${active ? " pill-toggle-on" : ""}`}
              >
                {t.tagNames[tag.name] ?? tag.name}
              </button>
            );
          })}
          </div>
        </fieldset>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className="mt-2 mb-0 text-xs text-danger"
        >
          {error}
        </p>
      )}

      <div className="flex gap-2 justify-end mt-3">
        <button
          type="button"
          onClick={onCancel}
          className="py-2 px-3 border border-border rounded-md bg-transparent text-muted cursor-pointer text-sm"
        >
          {t.cancel}
        </button>
        <button
          type="submit"
          // 送信中だけ止める。未入力でも押せるようにして、押したら理由を出す。
          disabled={submitting}
          className="btn btn-secondary"
        >
          {submitting ? t.posting : t.submitQuestion}
        </button>
      </div>
    </form>
  );
}

