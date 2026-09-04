"use client";

import { useCallback, useEffect, useState, use } from "react";
import Link from "next/link";
import { fetchTranslation, fetchTranslationRead, type TranslationProject, type TranslationUnit } from "@/lib/api";
import { languageLabel } from "@/lib/languages";
import { CommentPanel } from "@/components/reader/CommentPanel";
import { ChapterComments } from "@/components/reader/ChapterComments";
import { findSlugByBookName, resolveVersionChapterIds, resolveVersionVerseIds } from "@/lib/versions";
import { useReaderHeaderHeight } from "@/hooks/useReaderHeaderHeight";
import { useT } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { Button, SkeletonList } from "@/components/ui";
import { translationUiText } from "../../../translationUiText";

export default function TranslationReadChapterPage({
  params,
}: {
  params: Promise<{ id: string; chapter: string }>;
}) {
  const { id, chapter } = use(params);
  const chapterNum = Number(chapter);
  const t = useT();
  const { lang } = useLang();
  const ui = translationUiText(lang);
  // 上に貼り付く帯の高さを測って、コメント欄がその下から始まるようにする。
  const headerRef = useReaderHeaderHeight();

  const [project, setProject] = useState<TranslationProject | null>(null);
  // この章の節だけ。以前は全章取ってから1章分を抜き出し、残りを捨てていた。
  const [units, setUnits] = useState<TranslationUnit[]>([]);
  // 前後の章へのリンクを出すための章番号一覧（本文は含まない）。
  const [chapterNums, setChapterNums] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // コメントパネルを開いている節（翻訳ユニット）。null なら閉じている。
  const [selectedUnit, setSelectedUnit] = useState<TranslationUnit | null>(null);
  // 全バージョン表示用：この章・選択中の節の、各訳のid。
  const [allVersionChapterIds, setAllVersionChapterIds] = useState<string[]>([]);
  const [allVersionVerseIds, setAllVersionVerseIds] = useState<string[]>([]);
  const [chapterVersionCommentsError, setChapterVersionCommentsError] = useState(false);
  const [verseVersionCommentsError, setVerseVersionCommentsError] = useState(false);
  const [showSourceText, setShowSourceText] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [proj, read] = await Promise.all([fetchTranslation(id), fetchTranslationRead(id, chapterNum)]);
      setProject(proj);
      setChapterNums(read.chapters);
      setUnits(read.units);
    } catch {
      setError(t.notPublishedOrMissing);
    } finally {
      setLoading(false);
    }
  }, [id, chapterNum, t.notPublishedOrMissing]);

  useEffect(() => {
    let active = true;
    Promise.all([fetchTranslation(id), fetchTranslationRead(id, chapterNum)])
      .then(([proj, read]) => {
        if (!active) return;
        setProject(proj);
        setChapterNums(read.chapters);
        setUnits(read.units);
      })
      .catch(() => active && setError(t.notPublishedOrMissing))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id, chapterNum, t.notPublishedOrMissing]);

  // 全バージョン表示用：元の書名から slug を逆引きし、この章の各訳の章idを集める。
  const loadChapterVersionComments = useCallback(async () => {
    const slug = project ? findSlugByBookName(project.source_book_name) : null;
    if (!slug) {
      setAllVersionChapterIds([]);
      setChapterVersionCommentsError(false);
      return;
    }
    setChapterVersionCommentsError(false);
    try {
      setAllVersionChapterIds(await resolveVersionChapterIds(slug, chapterNum));
    } catch {
      setChapterVersionCommentsError(true);
    }
  }, [project, chapterNum]);

  useEffect(() => {
    let active = true;
    const slug = project ? findSlugByBookName(project.source_book_name) : null;
    const request = slug ? resolveVersionChapterIds(slug, chapterNum) : Promise.resolve<string[]>([]);
    request
      .then((ids) => {
        if (!active) return;
        setAllVersionChapterIds(ids);
        setChapterVersionCommentsError(false);
      })
      .catch(() => active && setChapterVersionCommentsError(true));
    return () => { active = false; };
  }, [project, chapterNum]);

  // 選択中の節の、各訳の節idを集める（節を選び直すたびに更新）。
  const loadVerseVersionComments = useCallback(async () => {
    const slug = project && selectedUnit ? findSlugByBookName(project.source_book_name) : null;
    if (!slug || !selectedUnit) {
      setAllVersionVerseIds([]);
      setVerseVersionCommentsError(false);
      return;
    }
    setVerseVersionCommentsError(false);
    try {
      setAllVersionVerseIds(await resolveVersionVerseIds(slug, chapterNum, selectedUnit.verse_number));
    } catch {
      setVerseVersionCommentsError(true);
    }
  }, [project, chapterNum, selectedUnit]);

  useEffect(() => {
    let active = true;
    const slug = project && selectedUnit ? findSlugByBookName(project.source_book_name) : null;
    const request = slug && selectedUnit
      ? resolveVersionVerseIds(slug, chapterNum, selectedUnit.verse_number)
      : Promise.resolve<string[]>([]);
    request
      .then((ids) => {
        if (!active) return;
        setAllVersionVerseIds(ids);
        setVerseVersionCommentsError(false);
      })
      .catch(() => active && setVerseVersionCommentsError(true));
    return () => { active = false; };
  }, [project, chapterNum, selectedUnit]);

  if (loading) return <div className="page page-wide"><SkeletonList count={6} /></div>;
  if (error) return (
    <div className="p-8 text-center" role="alert">
      <p className="text-muted">{error}</p>
      <div className="flex justify-center gap-3 flex-wrap">
        <Button variant="secondary" onClick={() => void load()}>{ui.retry}</Button>
        <Link href="/translations" className="text-accent self-center">{t.backToProjectList}</Link>
      </div>
    </div>
  );

  const currentIndex = chapterNums.indexOf(chapterNum);
  const prevChapter = currentIndex > 0 ? chapterNums[currentIndex - 1] : null;
  const nextChapter = currentIndex < chapterNums.length - 1 ? chapterNums[currentIndex + 1] : null;

  return (
    <div className="min-h-page">
      <div ref={headerRef} className="reader-sticky-header">
        <p className="m-0 text-sm font-normal text-muted">
          <Link href={`/translations/${id}`} className="text-muted no-underline">
            {project?.name ?? t.projectFallback}
          </Link>
          {" › "}
          <Link href={`/translations/${id}/read`} className="text-muted no-underline">
            {t.chapterList}
          </Link>
          {" › "}
          <span>{t.chapterFmt(chapterNum)}</span>
        </p>
      </div>

      <div
        className={`reader-wrapper${selectedUnit ? " has-verse" : ""}`}
      >
        <div className="reader-main" >
          <div className="mx-auto max-w-180">
            <h1 className="text-xl font-bold mb-1">
              {project?.name} {t.chapterFmt(chapterNum)}
            </h1>
            <p className="text-sm text-muted mt-0 mx-0 mb-6">
              {project?.source_book_name} → {project ? languageLabel(project.target_language) : ""}
            </p>

            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <span className="text-xs text-faint">{ui.sourceComparisonHelp}</span>
              <Button variant="secondary" size="sm" aria-pressed={showSourceText} onClick={() => setShowSourceText((shown) => !shown)}>
                {showSourceText ? ui.hideSource : ui.compareSource}
              </Button>
            </div>

            <hr className="section-divider" />

            {units.length === 0 ? (
              <p className="text-sm text-muted">{t.noPublishedVersesForChapter}</p>
            ) : (
              <div>
                {units.map((unit) => {
                  const isSelected = selectedUnit?.id === unit.id;
                  return (
                    <div
                      key={unit.id}
                      id={`verse-${unit.verse_number}`}
                      onClick={() => setSelectedUnit(isSelected ? null : unit)}
                      role="button"
                      tabIndex={0}
                      aria-label={`${chapterNum}:${unit.verse_number} ${isSelected ? ui.closeComments : ui.openComments}`}
                      aria-expanded={isSelected}
                      aria-controls={isSelected ? "translation-comment-panel" : undefined}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedUnit(isSelected ? null : unit);
                        }
                      }}
                      className={`verse-row${isSelected ? " verse-row-selected" : ""}`}
                    >
                      <span
                        className="verse-text"
                      >
                        <sup
                          className="verse-number"
                        >
                          {unit.verse_number}
                        </sup>
                        {unit.body}
                      </span>
                      {showSourceText && (
                        <p className="mt-1 mb-0 ml-5 text-xs text-faint italic">
                          {t.originalText} {unit.verse_text}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {units.length > 0 && units[0]?.chapter && (
              <>
                {chapterVersionCommentsError && (
                  <div role="alert" className="alert-box mt-4 mx-0 mb-3">
                    <p className="mt-0 mb-2 text-sm text-muted">{ui.relatedCommentsLoadError}</p>
                    <Button variant="secondary" size="sm" onClick={() => void loadChapterVersionComments()}>
                      {ui.retryRelatedComments}
                    </Button>
                  </div>
                )}
                <ChapterComments
                  chapterId={units[0].chapter}
                  translationProject={id}
                  label={`${project?.name ?? ""} ${t.chapterFmt(chapterNum)}`}
                  commentBookmarkMap={{}}
                  allVersionIds={allVersionChapterIds}
                />
              </>
            )}
          </div>
        </div>

        {selectedUnit && (
          <div id="translation-comment-panel" className="reader-panel">
            {verseVersionCommentsError && (
              <div role="alert" className="alert-box m-3">
                <p className="mt-0 mb-2 text-sm text-muted">{ui.relatedCommentsLoadError}</p>
                <Button variant="secondary" size="sm" onClick={() => void loadVerseVersionComments()}>
                  {ui.retryRelatedComments}
                </Button>
              </div>
            )}
            <CommentPanel
              verse={{
                id: selectedUnit.verse,
                chapter: selectedUnit.chapter,
                number: selectedUnit.verse_number,
                text: selectedUnit.body,
              }}
              chapterNumber={chapterNum}
              translationProject={id}
              allVersionVerseIds={allVersionVerseIds}
              onClose={() => setSelectedUnit(null)}
            />
          </div>
        )}
      </div>

      {!selectedUnit && prevChapter != null && (
        <Link
          href={`/translations/${id}/read/${prevChapter}`}
          title={t.chapterFmt(prevChapter)}
          aria-label={`${t.prevChapter} (${prevChapter})`}
          className="chapter-nav chapter-nav-prev"
        >
          ‹
        </Link>
      )}

      {!selectedUnit && nextChapter != null && (
        <Link
          href={`/translations/${id}/read/${nextChapter}`}
          title={t.chapterFmt(nextChapter)}
          aria-label={`${t.nextChapter} (${nextChapter})`}
          className="chapter-nav chapter-nav-next"
        >
          ›
        </Link>
      )}
    </div>
  );
}
