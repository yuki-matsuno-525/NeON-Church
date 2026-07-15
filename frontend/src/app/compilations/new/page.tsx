"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCompiledBook } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function NewCompilationPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [annotation, setAnnotation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login?from=/compilations/new");
  }, [loading, user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const book = await createCompiledBook({
        title: title.trim(),
        description,
        annotation,
        visibility: "private",
      });
      router.push(`/compilations/${book.id}/edit`);
    } catch {
      setError("編纂書を作成できませんでした。");
      setSaving(false);
    }
  };

  if (loading || !user) return <main style={{ padding: 32, color: "var(--text-muted)" }}>読み込み中...</main>;

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px" }}>
      <Link href="/compilations" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 13 }}>← 編纂書一覧</Link>
      <h1 style={{ margin: "18px 0 20px", fontSize: 24, fontWeight: 800 }}>新しい編纂書</h1>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Field label="書名">
          <input data-testid="compilation-title-input" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} style={inputStyle} autoFocus />
        </Field>
        <Field label="説明">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} style={textareaStyle} />
        </Field>
        <Field label="書への注釈">
          <textarea value={annotation} onChange={(e) => setAnnotation(e.target.value)} rows={4} style={textareaStyle} />
        </Field>
        {error && <p style={{ color: "var(--state-danger)", fontSize: 13 }}>{error}</p>}
        <button data-testid="create-compilation-button" className="btn btn-primary" disabled={saving || !title.trim()} style={{ alignSelf: "flex-start" }}>
          {saving ? "作成中..." : "下書きを作成"}
        </button>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 700 }}>
      {label}
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  fontFamily: "inherit",
  fontSize: 14,
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  lineHeight: 1.6,
};
