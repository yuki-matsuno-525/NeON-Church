"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  onSubmit: (body: string) => Promise<void>;
  placeholder?: string;
  submitLabel?: string;
};

export function CommentInput({
  onSubmit,
  placeholder = "コメントを入力...",
  submitLabel = "投稿する",
}: Props) {
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
        <Link
          href="/login"
          style={{ color: "var(--accent)", textDecoration: "underline" }}
        >
          ログイン
        </Link>
        してコメントする
      </p>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(body.trim());
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "投稿に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={3}
        style={{
          width: "100%",
          padding: "8px 10px",
          border: "1px solid var(--border)",
          borderRadius: 8,
          background: "var(--bg)",
          color: "var(--text)",
          fontSize: 14,
          resize: "vertical",
          fontFamily: "inherit",
          outline: "none",
        }}
      />
      {error && (
        <p style={{ color: "#ef4444", fontSize: 12, margin: "4px 0 0" }}>
          {error}
        </p>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          style={{
            background: "var(--accent)",
            color: "var(--accent-text)",
            border: "none",
            borderRadius: 8,
            padding: "7px 16px",
            cursor: submitting || !body.trim() ? "not-allowed" : "pointer",
            opacity: submitting || !body.trim() ? 0.6 : 1,
            fontWeight: 700,
            fontSize: 13,
            fontFamily: "inherit",
          }}
        >
          {submitting ? "投稿中..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
