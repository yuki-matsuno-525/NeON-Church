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
    <div style={{ padding: 32, textAlign: "center" }} role="alert">
      <p className="text-muted">{error}</p>
      <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
        <Button variant="secondary" onClick={() => void load()}>{ui.retry}</Button>
        <Link href="/translations" style={{ color: "var(--accent)", alignSelf: "center" }}>{t.backToProjectList}</Link>
      </div>
    </div>
  );

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
          <span>{t.selectChapterHeading}</span>
        </p>
      </div>
    <div className="page page-wide">

      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{project?.name}</h1>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 24px" }}>
        {project?.source_book_name} → {project ? languageLabel(project.target_language) : ""}
      </p>

      {chapterNums.length === 0 ? (
        <div style={{ padding: "24px 20px", border: "1px solid var(--border)", borderRadius: 12, textAlign: "center", background: "var(--bg-alt)" }}>
          <p className="text-sm text-muted">{t.noPublishedVerses}</p>
          <Link href={`/translations/${id}`} className="text-sm text-accent">{ui.noPublishedCta}</Link>
        </div>
      ) : (
        <>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12 }}>
            {t.selectChapterHeading}
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(44px, 1fr))",
              gap: "var(--space-2)",
              marginBottom: 40,
            }}
          >
            {chapterNums.map((chNum) => (
              <Link
                key={chNum}
                href={`/translations/${id}/read/${chNum}`}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 44,
                  minWidth: 44,
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  textDecoration: "none",
                  color: "var(--text-muted)",
                  fontWeight: 700,
                  fontSize: "var(--font-size-sm)",
                  background: "var(--bg-alt)",
                  transition: "border-color var(--duration-fast) var(--ease-out), background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = "var(--accent-tint)";
                  el.style.color = "var(--accent)";
                  el.style.borderColor = "var(--accent)";
                  el.style.boxShadow = "var(--shadow-glow)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = "var(--bg-alt)";
                  el.style.color = "var(--text-muted)";
                  el.style.borderColor = "var(--border)";
                  el.style.boxShadow = "none";
                }}
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
            <div role="alert" style={{ padding: 12, marginBottom: 12, border: "1px solid var(--state-warning)", borderRadius: 8 }}>
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
