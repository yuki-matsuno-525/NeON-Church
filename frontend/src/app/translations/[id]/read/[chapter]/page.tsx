"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { fetchTranslation, fetchTranslationRead, type TranslationProject, type TranslationUnit } from "@/lib/api";
import { languageLabel } from "@/lib/languages";
import { CommentPanel } from "@/components/reader/CommentPanel";
import { ChapterComments } from "@/components/reader/ChapterComments";
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
  // コメントパネルを開いている節（翻訳ユニット）。null なら閉じている。
  const [selectedUnit, setSelectedUnit] = useState<TranslationUnit | null>(null);

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
          <Link href={`/translations/${id}/read`} style={{ color: "var(--text-muted)", textDecoration: "none" }}>
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

            <hr style={{ border: "none", borderTop: "2px solid var(--border)", marginBottom: 24 }} />

            {units.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{t.noPublishedVersesForChapter}</p>
            ) : (
              <div>
                {units.map((unit) => {
                  const isSelected = selectedUnit?.id === unit.id;
                  return (
                    <div
                      key={unit.id}
                      onClick={() => setSelectedUnit(isSelected ? null : unit)}
                      role="button"
                      tabIndex={0}
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
                      }}
                    >
                      <span
                        style={{
                          lineHeight: 1.9,
                          fontSize: 17,
                          fontFamily: '"Noto Serif JP", serif',
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
                      <p style={{ margin: "4px 0 0 18px", fontSize: 12, color: "var(--text-faint)", fontStyle: "italic" }}>
                        {t.originalText} {unit.verse_text}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {units.length > 0 && units[0]?.chapter && (
              <ChapterComments
                chapterId={units[0].chapter}
                translationProject={id}
                label={`${project?.name ?? ""} ${t.chapterFmt(chapterNum)}`}
                commentBookmarkMap={{}}
              />
            )}
          </div>
        </div>

        {selectedUnit && (
          <div className="reader-panel">
            <CommentPanel
              verse={{
                id: selectedUnit.verse,
                chapter: selectedUnit.chapter,
                number: selectedUnit.verse_number,
                text: selectedUnit.body,
              }}
              chapterNumber={chapterNum}
              translationProject={id}
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
