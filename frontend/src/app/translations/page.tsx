"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchTranslations, type TranslationProject } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_LABEL: Record<string, string> = {
  active: "進行中",
  published: "公開済み",
};

const STATUS_COLOR: Record<string, string> = {
  active: "var(--accent)",
  published: "#22c55e",
};

export default function TranslationsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<TranslationProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTranslations()
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>翻訳プロジェクト</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "4px 0 0" }}>
            聖書の共同翻訳プロジェクト一覧
          </p>
        </div>
        {user && (
          <Link
            href="/translations/new"
            style={{
              background: "var(--accent)",
              color: "var(--accent-text)",
              borderRadius: 8,
              padding: "8px 18px",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            ＋ 新規作成
          </Link>
        )}
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", padding: 16 }}>読み込み中...</div>
      ) : projects.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 16px",
            color: "var(--text-muted)",
            border: "1px dashed var(--border)",
            borderRadius: 12,
          }}
        >
          <p style={{ fontSize: 15, margin: 0 }}>まだ公開されたプロジェクトはありません。</p>
          {user && (
            <Link href="/translations/new" style={{ color: "var(--accent)", fontSize: 14 }}>
              最初のプロジェクトを作成する →
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/translations/${p.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  padding: "18px 20px",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  background: "var(--bg-alt)",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>{p.name}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: STATUS_COLOR[p.status] ?? "var(--border)",
                      color: p.status === "published" ? "#fff" : "var(--accent-text)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </div>

                {p.description && (
                  <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                    {p.description}
                  </p>
                )}

                <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-faint)", flexWrap: "wrap" }}>
                  <span>📖 {p.source_book_name}</span>
                  <span>🌐 {p.target_language}</span>
                  <span>作成: {p.owner_username}</span>
                  <span>
                    進捗: {p.done_count}/{p.unit_count} 節
                    {p.unit_count > 0 && (
                      <span style={{ marginLeft: 6 }}>
                        ({Math.round((p.done_count / p.unit_count) * 100)}%)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
