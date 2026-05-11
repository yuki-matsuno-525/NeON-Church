"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { fetchTranslation, fetchTranslationRead, type TranslationProject, type TranslationUnit } from "@/lib/api";

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

  // 章ごとにグループ化
  const chapters = units.reduce<Record<number, TranslationUnit[]>>((acc, u) => {
    const ch = u.chapter_number;
    if (!acc[ch]) acc[ch] = [];
    acc[ch].push(u);
    return acc;
  }, {});

  const chapterNums = Object.keys(chapters).map(Number).sort((a, b) => a - b);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
      <div style={{ marginBottom: 16 }}>
        <Link href={`/translations/${id}`} style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}>
          ← プロジェクト詳細
        </Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>{project?.name}</h1>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 32px" }}>
        {project?.source_book_name} → {project?.target_language}
      </p>

      {units.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>まだ公開された翻訳節がありません。</p>
      ) : (
        chapterNums.map((chNum) => (
          <div key={chNum} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
              第{chNum}章
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {chapters[chNum].map((unit) => (
                <div key={unit.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 12, color: "var(--text-faint)", minWidth: 24, textAlign: "right", paddingTop: 2 }}>
                    {unit.verse_number}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>{unit.body}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-faint)", fontStyle: "italic" }}>
                      原文: {unit.verse_text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
