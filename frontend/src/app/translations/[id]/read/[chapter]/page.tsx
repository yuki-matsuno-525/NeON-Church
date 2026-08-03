"use client";

import { useCallback, useEffect, useState, use } from "react";
import Link from "next/link";
import { fetchTranslation, fetchTranslationRead, type TranslationProject, type TranslationUnit } from "@/lib/api";
import { languageLabel } from "@/lib/languages";
import { CommentPanel } from "@/components/reader/CommentPanel";
import { ChapterComments } from "@/components/reader/ChapterComments";
import { findSlugByBookName, resolveVersionChapterIds, resolveVersionVerseIds } from "@/lib/versions";
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
    <div style={{ padding: 32, textAlign: "center" }} role="alert">
      <p className="text-muted">{error}</p>
      <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
        <Button variant="secondary" onClick={() => void load()}>{ui.retry}</Button>
        <Link href="/translations" style={{ color: "var(--accent)", alignSelf: "center" }}>{t.backToProjectList}</Link>
      </div>
    </div>
  );

  const currentIndex = chapterNums.indexOf(chapterNum);
  const prevChapter = currentIndex > 0 ? chapterNums[currentIndex - 1] : null;
  const nextChapter = currentIndex < chapterNums.length - 1 ? chapterNums[currentIndex + 1] : null;

  return (
    <div className="min-h-page">
      <div className="reader-sticky-header" style={{
        position: "sticky",
        top: "var(--navbar-height)",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        padding: "8px 32px",
        background: "var(--glass-nav)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}>
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
        style={{ display: "flex" }}
      >
        <div className="reader-main" style={{ flex: 1, minWidth: 0, padding: "32px 32px", overflowY: "auto" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, marginBottom: 4 }}>
              {project?.name} {t.chapterFmt(chapterNum)}
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 24px" }}>
              {project?.source_book_name} → {project ? languageLabel(project.target_language) : ""}
            </p>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
              <span className="text-xs text-faint">{ui.sourceComparisonHelp}</span>
              <Button variant="secondary" size="sm" aria-pressed={showSourceText} onClick={() => setShowSourceText((shown) => !shown)}>
                {showSourceText ? ui.hideSource : ui.compareSource}
              </Button>
            </div>

            <hr style={{ border: "none", borderTop: "2px solid var(--border)", marginBottom: 24 }} />

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
                      className="verse-row"
                      style={{
                        padding: "12px 16px",
                        borderRadius: 5,
                        color: "var(--text)",
                        marginBottom: 2,
                        cursor: "pointer",
                        background: isSelected ? "var(--accent-tint)" : "transparent",
                        scrollMarginTop: "calc(var(--navbar-height) + 56px)",
                      }}
                    >
                      <span
                        style={{
                          lineHeight: 1.9,
                          fontSize: 17,
                          fontFamily: "var(--font-serif)",
                          whiteSpace: "pre-line",
                        }}
                      >
                        <sup
                          style={{
                            fontSize: 11,
                            color: "var(--text-faint)",
                            marginRight: 4,
                            verticalAlign: "super",
                            fontWeight: 700,
                          }}
                        >
                          {unit.verse_number}
                        </sup>
                        {unit.body}
                      </span>
                      {showSourceText && (
                        <p style={{ margin: "4px 0 0 18px", fontSize: 12, color: "var(--text-faint)", fontStyle: "italic" }}>
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
                  <div role="alert" style={{ padding: 12, margin: "16px 0 12px", border: "1px solid var(--state-warning)", borderRadius: 8 }}>
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
              <div role="alert" style={{ padding: 12, margin: 12, border: "1px solid var(--state-warning)", borderRadius: 8 }}>
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
          className="chapter-nav-prev"
          style={{
            position: "fixed",
            left: "var(--sidebar-width)",
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "18px 10px",
            background: "var(--bg-alt)",
            border: "1px solid var(--border)",
            borderLeft: "none",
            borderRadius: "0 8px 8px 0",
            color: "var(--text)",
            textDecoration: "none",
            fontSize: 20,
            opacity: 0.75,
            zIndex: 20,
            transition: "opacity 0.15s",
            lineHeight: 1,
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.75")}
        >
          ‹
        </Link>
      )}

      {!selectedUnit && nextChapter != null && (
        <Link
          href={`/translations/${id}/read/${nextChapter}`}
          title={t.chapterFmt(nextChapter)}
          aria-label={`${t.nextChapter} (${nextChapter})`}
          className="chapter-nav-next"
          style={{
            position: "fixed",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "18px 10px",
            background: "var(--bg-alt)",
            border: "1px solid var(--border)",
            borderRight: "none",
            borderRadius: "8px 0 0 8px",
            color: "var(--text)",
            textDecoration: "none",
            fontSize: 20,
            opacity: 0.75,
            zIndex: 20,
            transition: "opacity 0.15s",
            lineHeight: 1,
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.75")}
        >
          ›
        </Link>
      )}
    </div>
  );
}
