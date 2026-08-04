"use client";

import { useCallback, useEffect, useState, use } from "react";
import Link from "next/link";
import { fetchTranslation, fetchTranslationRead, type TranslationProject } from "@/lib/api";
import { languageLabel } from "@/lib/languages";
import { ChapterComments } from "@/components/reader/ChapterComments";
import { findSlugByBookName, resolveVersionBookIds } from "@/lib/versions";
import { useT } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { Button, SkeletonList } from "@/components/ui";
import { translationUiText } from "../../translationUiText";

export default function TranslationReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const { lang } = useLang();
  const ui = translationUiText(lang);
  const [project, setProject] = useState<TranslationProject | null>(null);
  // 目次は章番号だけあればよい。以前は全章の本文を取ってから章を数えていた。
  const [chapterNums, setChapterNums] = useState<number[]>([]);
  const [allVersionBookIds, setAllVersionBookIds] = useState<string[]>([]);
  const [versionCommentsError, setVersionCommentsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [proj, read] = await Promise.all([fetchTranslation(id), fetchTranslationRead(id)]);
      setProject(proj);
      setChapterNums(read.chapters);
      // 全バージョン表示用：元の書名から slug を逆引きし、各訳の書idを集める。
    } catch {
      setError(t.notPublishedOrMissing);
    } finally {
      setLoading(false);
    }
  }, [id, t.notPublishedOrMissing]);

  useEffect(() => {
    let active = true;
    Promise.all([fetchTranslation(id), fetchTranslationRead(id)])
      .then(([proj, read]) => {
        if (!active) return;
        setProject(proj);
        setChapterNums(read.chapters);
      })
      .catch(() => active && setError(t.notPublishedOrMissing))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id, t.notPublishedOrMissing]);

  const loadVersionComments = useCallback(async () => {
    const slug = project ? findSlugByBookName(project.source_book_name) : null;
    if (!slug) {
      setAllVersionBookIds([]);
      setVersionCommentsError(false);
      return;
    }
    setVersionCommentsError(false);
    try {
      setAllVersionBookIds(await resolveVersionBookIds(slug));
    } catch {
      setVersionCommentsError(true);
    }
  }, [project]);

  useEffect(() => {
    let active = true;
    const slug = project ? findSlugByBookName(project.source_book_name) : null;
    const request = slug ? resolveVersionBookIds(slug) : Promise.resolve<string[]>([]);
    request
      .then((ids) => {
        if (!active) return;
        setAllVersionBookIds(ids);
        setVersionCommentsError(false);
      })
      .catch(() => active && setVersionCommentsError(true));
    return () => { active = false; };
  }, [project]);

  if (loading) return <div className="page page-wide"><SkeletonList count={5} /></div>;
  if (error) return (
    <div className="p-8 text-center" role="alert">
      <p className="text-muted">{error}</p>
      <div className="flex justify-center gap-3 flex-wrap">
        <Button variant="secondary" onClick={() => void load()}>{ui.retry}</Button>
        <Link href="/translations" className="text-accent self-center">{t.backToProjectList}</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-page">
      <div className="reader-sticky-header">
        <p className="m-0 text-sm font-normal text-muted">
          <Link href={`/translations/${id}`} className="text-muted no-underline">
            {project?.name ?? t.projectFallback}
          </Link>
          {" › "}
          <span>{t.selectChapterHeading}</span>
        </p>
      </div>
    <div className="page page-wide">

      <h1 className="text-xl font-bold mb-1">{project?.name}</h1>
      <p className="text-sm text-muted mt-0 mx-0 mb-6">
        {project?.source_book_name} → {project ? languageLabel(project.target_language) : ""}
      </p>

      {chapterNums.length === 0 ? (
        <div className="py-6 px-4 border border-border rounded-lg text-center bg-bg-alt">
          <p className="text-sm text-muted">{t.noPublishedVerses}</p>
          <Link href={`/translations/${id}`} className="text-sm text-accent">{ui.noPublishedCta}</Link>
        </div>
      ) : (
        <>
          <h2 className="text-sm font-bold text-muted mb-3">
            {t.selectChapterHeading}
          </h2>
          <div
            className="chapter-board"
          >
            {chapterNums.map((chNum) => (
              <Link
                key={chNum}
                href={`/translations/${id}/read/${chNum}`}
                className="chapter-cell"
              >
                {chNum}
              </Link>
            ))}
          </div>
        </>
      )}

      {project?.source_book && (
        <>
          {versionCommentsError && (
            <div role="alert" className="alert-box mb-3">
              <p className="mt-0 mb-2 text-sm text-muted">{ui.relatedCommentsLoadError}</p>
              <Button variant="secondary" size="sm" onClick={() => void loadVersionComments()}>
                {ui.retryRelatedComments}
              </Button>
            </div>
          )}
          <ChapterComments
            bookId={project.source_book}
            translationProject={id}
            label={ui.publishedCommentsHeading}
            commentBookmarkMap={{}}
            allVersionIds={allVersionBookIds}
          />
        </>
      )}
    </div>
    </div>
  );
}
