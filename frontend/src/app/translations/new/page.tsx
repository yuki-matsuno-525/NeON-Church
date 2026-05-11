"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createTranslation, fetchBooks, type Book } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function NewTranslationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceBook, setSourceBook] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBooks("口語訳").then(setBooks).catch(() => {});
  }, []);

  if (!authLoading && !user) {
    router.replace("/login");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sourceBook || !targetLanguage.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const project = await createTranslation({
        name: name.trim(),
        description: description.trim(),
        source_book: sourceBook,
        target_language: targetLanguage.trim(),
      });
      router.push(`/translations/${project.id}`);
    } catch {
      setError("作成に失敗しました。もう一度お試しください。");
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid var(--border)",
    borderRadius: 8,
    background: "var(--bg-alt)",
    color: "var(--text)",
    fontSize: 14,
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
    color: "var(--text-muted)",
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px" }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/translations" style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}>
          ← 翻訳プロジェクト一覧
        </Link>
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>新規翻訳プロジェクト</h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <label style={labelStyle}>プロジェクト名 *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: マタイ英語翻訳"
            style={inputStyle}
            required
          />
        </div>

        <div>
          <label style={labelStyle}>説明</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="プロジェクトの目的や方針を記述（任意）"
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        <div>
          <label style={labelStyle}>翻訳元の書 *</label>
          <select
            value={sourceBook}
            onChange={(e) => setSourceBook(e.target.value)}
            style={inputStyle}
            required
          >
            <option value="">書を選択...</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>翻訳先言語 *</label>
          <input
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            placeholder="例: 英語, English, en"
            style={inputStyle}
            required
          />
        </div>

        {error && (
          <p style={{ color: "#ef4444", fontSize: 13, margin: 0 }}>{error}</p>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              flex: 1,
              background: "var(--accent)",
              color: "var(--accent-text)",
              border: "none",
              borderRadius: 8,
              padding: "10px",
              fontWeight: 700,
              fontSize: 14,
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "作成中..." : "プロジェクトを作成"}
          </button>
          <Link
            href="/translations"
            style={{
              padding: "10px 20px",
              border: "1px solid var(--border)",
              borderRadius: 8,
              textDecoration: "none",
              color: "var(--text-muted)",
              fontSize: 14,
              textAlign: "center",
            }}
          >
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
