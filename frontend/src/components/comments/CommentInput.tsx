"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fetchTags, type Tag } from "@/lib/api";

type Props = {
  onSubmit: (body: string, isQa?: boolean, tagIds?: string[]) => Promise<void>;
  placeholder?: string;
  submitLabel?: string;
  showQaOption?: boolean;
  showTagOption?: boolean;
};

export function CommentInput({
  onSubmit,
  placeholder = "コメントを入力...",
  submitLabel = "投稿する",
  showQaOption = false,
  showTagOption = false,
}: Props) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [body, setBody] = useState("");
  const [isQa, setIsQa] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (showTagOption) {
      fetchTags().then(setTags).catch(() => {});
    }
  }, [showTagOption]);

  if (!user) {
    return (
      <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
        <Link
          href={`/login?from=${encodeURIComponent(pathname)}`}
          style={{ color: "var(--accent)", textDecoration: "underline" }}
        >
          ログイン
        </Link>
        してコメントする
      </p>
    );
  }

  const toggleTag = (id: string) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(
        body.trim(),
        showQaOption ? isQa : undefined,
        showTagOption && selectedTags.length > 0 ? selectedTags : undefined
      );
      setBody("");
      setIsQa(false);
      setSelectedTags([]);
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
      {showTagOption && tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {tags.map((tag) => {
            const active = selectedTags.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                style={{
                  fontSize: 12,
                  padding: "3px 10px",
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  background: active ? "var(--accent)" : "transparent",
                  color: active ? "var(--accent-text)" : "var(--text-muted)",
                  fontFamily: "inherit",
                }}
              >
                {tag.name}
              </button>
            );
          })}
        </div>
      )}
      {error && (
        <p style={{ color: "#ef4444", fontSize: 12, margin: "4px 0 0" }}>
          {error}
        </p>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
        {showQaOption && (
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={isQa}
              onChange={(e) => setIsQa(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            Q&A
          </label>
        )}
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
