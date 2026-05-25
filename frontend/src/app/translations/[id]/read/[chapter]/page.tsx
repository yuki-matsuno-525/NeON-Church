"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { fetchTranslation, fetchTranslationRead, type TranslationProject, type TranslationUnit } from "@/lib/api";
import { languageLabel } from "@/lib/languages";
import { useT } from "@/lib/i18n";

export default function TranslationReadChapterPage({
  params,
}: {
  params: Promise<{ id: string; chapter: string }>;
}) {
  const { id, chapter } = use(params);
  const chapterNum = Number(chapter);
  const t = useT();

  const [project, setProject] = useState<TranslationProject | null>(null);
  const [allUnits, setAllUnits] = useState<TranslationUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchTranslation(id),
      fetchTranslationRead(id),
    ]).then(([proj, u]) => {
      setProject(proj);
      setAllUnits(u);
    }).catch(() => {
      setError(t.notPublishedOrMissing);
    }).finally(() => setLoading(false));
  }, [id, t.notPublishedOrMissing]);

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>{t.loading}</div>;
  if (error) return (
    <div style={{ padding: 32, textAlign: "center" }}>
      <p style={{ color: "var(--text-muted)" }}>{error}</p>
      <Link href="/translations" style={{ color: "var(--accent)" }}>{t.backToProjectList}</Link>
    </div>
  );

  const chapterNums = [...new Set(allUnits.map((u) => u.chapter_number))].sort((a, b) => a - b);
  const units = allUnits.filter((u) => u.chapter_number === chapterNum).sort((a, b) => a.verse_number - b.verse_number);
  const currentIndex = chapterNums.indexOf(chapterNum);
  const prevChapter = currentIndex > 0 ? chapterNums[currentIndex - 1] : null;
  const nextChapter = currentIndex < chapterNums.length - 1 ? chapterNums[currentIndex + 1] : null;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
      {/* Breadcrumb */}
      <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 20px" }}>
        <Link href={`/translations/${id}`} style={{ color: "var(--text-muted)", textDecoration: "none" }}>
          {project?.name ?? t.projectFallback}
        </Link>
        {" › "}
        <Link href={`/translations/${id}/read`} style={{ color: "var(--text-muted)", textDecoration: "none" }}>
          {t.chapterList}
        </Link>
        {" › "}
        <span>{t.chapterFmt(chapterNum)}</span>
      </p>

      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>
        {project?.name} — {t.chapterFmt(chapterNum)}
      </h1>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 28px" }}>
        {project?.source_book_name} → {project ? languageLabel(project.target_language) : ""}
      </p>

      <hr style={{ border: "none", borderTop: "2px solid var(--border)", marginBottom: 24 }} />

      {units.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{t.noPublishedVersesForChapter}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {units.map((unit) => (
            <div key={unit.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: 12, color: "var(--text-faint)", minWidth: 24, textAlign: "right", paddingTop: 2 }}>
                {unit.verse_number}
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>{unit.body}</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-faint)", fontStyle: "italic" }}>
                  {t.originalText} {unit.verse_text}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 章ナビゲーション */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
        {prevChapter != null ? (
          <Link
            href={`/translations/${id}/read/${prevChapter}`}
            style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", padding: "6px 14px", border: "1px solid var(--border)", borderRadius: 8 }}
          >
            {t.prevChapterFmt(prevChapter)}
          </Link>
        ) : <span />}
        {nextChapter != null ? (
          <Link
            href={`/translations/${id}/read/${nextChapter}`}
            style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", padding: "6px 14px", border: "1px solid var(--border)", borderRadius: 8 }}
          >
            {t.nextChapterFmt(nextChapter)}
          </Link>
        ) : <span />}
      </div>
    </div>
  );
}
