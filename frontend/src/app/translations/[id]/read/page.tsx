"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { fetchTranslation, fetchTranslationRead, type TranslationProject, type TranslationUnit } from "@/lib/api";
import { languageLabel } from "@/lib/languages";

export default function TranslationReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
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
      setError("公開されていないプロジェクトか、存在しないプロジェクトです。");
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>読み込み中...</div>;
  if (error) return (
    <div style={{ padding: 32, textAlign: "center" }}>
      <p style={{ color: "var(--text-muted)" }}>{error}</p>
      <Link href="/translations" style={{ color: "var(--accent)" }}>← プロジェクト一覧に戻る</Link>
    </div>
  );

  const chapterNums = [...new Set(units.map((u) => u.chapter_number))].sort((a, b) => a - b);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
      <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 8px" }}>
        <Link href={`/translations/${id}`} style={{ color: "var(--text-muted)", textDecoration: "none" }}>
          {project?.name ?? "プロジェクト"}
        </Link>
        {" › "}
        <span>章を選択</span>
      </p>

      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>{project?.name}</h1>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 32px" }}>
        {project?.source_book_name} → {project ? languageLabel(project.target_language) : ""}
      </p>

      {chapterNums.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>まだ公開された翻訳節がありません。</p>
      ) : (
        <>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12 }}>
            章を選択
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(56px, 1fr))",
              gap: 8,
            }}
          >
            {chapterNums.map((chNum) => (
              <Link
                key={chNum}
                href={`/translations/${id}/read/${chNum}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 48,
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  textDecoration: "none",
                  color: "var(--text)",
                  fontWeight: 700,
                  fontSize: 14,
                  background: "var(--bg-alt)",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--accent-tint)";
                  (e.currentTarget as HTMLElement).style.color = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--bg-alt)";
                  (e.currentTarget as HTMLElement).style.color = "var(--text)";
                }}
              >
                第{chNum}章
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
