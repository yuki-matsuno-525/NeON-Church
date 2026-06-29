"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { fetchTranslation, fetchTranslationRead, type TranslationProject, type TranslationUnit } from "@/lib/api";
import { languageLabel } from "@/lib/languages";
import { ChapterComments } from "@/components/reader/ChapterComments";
import { useT } from "@/lib/i18n";

export default function TranslationReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const [project, setProject] = useState<TranslationProject | null>(null);
  const [units, setUnits] = useState<TranslationUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchTranslation(id),
      fetchTranslationRead(id),
    ]).then(([proj, u]) => {
      setProject(proj);
      setUnits(u);
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

  const chapterNums = [...new Set(units.map((u) => u.chapter_number))].sort((a, b) => a - b);

  return (
    <div style={{ minHeight: "calc(100vh - var(--navbar-height))" }}>
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
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0, fontWeight: 500 }}>
          <Link href={`/translations/${id}`} style={{ color: "var(--text-muted)", textDecoration: "none" }}>
            {project?.name ?? t.projectFallback}
          </Link>
          {" › "}
          <span>{t.selectChapterHeading}</span>
        </p>
      </div>
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>

      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{project?.name}</h1>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 24px" }}>
        {project?.source_book_name} → {project ? languageLabel(project.target_language) : ""}
      </p>

      {chapterNums.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{t.noPublishedVerses}</p>
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
        <ChapterComments
          bookId={project.source_book}
          translationProject={id}
          label={project.name}
          commentBookmarkMap={{}}
        />
      )}
    </div>
    </div>
  );
}
