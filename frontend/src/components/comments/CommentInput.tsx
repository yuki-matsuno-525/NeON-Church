"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fetchTags, type Tag } from "@/lib/api";
import { useT } from "@/lib/i18n";

type Props = {
  onSubmit: (body: string, tagIds?: string[]) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  submitLabel?: string;
  showTagOption?: boolean;
  autoFocus?: boolean;
};

/**
 * コメントの入力欄。
 *
 * 質問はここからは投稿しない（Q&A は別のデータで、専用のフォームがある）。
 * 以前はチェックひとつでコメントが質問に変わる作りだったため、コメント一覧に
 * 質問が混ざっていた。
 */
export function CommentInput({
  onSubmit,
  onCancel,
  placeholder,
  submitLabel,
  showTagOption = false,
  autoFocus = false,
}: Props) {
  const { user } = useAuth();
  const t = useT();
  const pathname = usePathname();
  const bodyId = useId();
  const errorId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagsError, setTagsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectivePlaceholder = placeholder ?? t.commentPlaceholder;
  const effectiveLabel = submitLabel ?? t.submitComment;

  const loadTags = () => {
    setTagsError(false);
    fetchTags().then(setTags).catch(() => setTagsError(true));
  };

  useEffect(() => {
    if (showTagOption) {
      fetchTags().then(setTags).catch(() => setTagsError(true));
    }
  }, [showTagOption]);

  useEffect(() => {
    if (autoFocus) {
      textareaRef.current?.focus();
    }
  }, [autoFocus]);

  if (!user) {
    return (
      <p className="text-sm text-muted">
        <Link
          href={`/login?from=${encodeURIComponent(pathname)}`}
          style={{ color: "var(--accent)", textDecoration: "underline" }}
        >
          {t.login}
        </Link>
        {t.loginToComment}
      </p>
    );
  }

  const toggleTag = (id: string) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((tag) => tag !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 未入力のまま押せたときは、何が足りないのかを名指しする。
    // ボタンを押せなくして黙って止めると、理由が伝わらない。
    const missing: string[] = [];
    if (!body.trim()) missing.push(t.fieldBody);
    if (missing.length > 0) {
      setError(t.missingFields(missing));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(
        body.trim(),
        showTagOption && selectedTags.length > 0 ? selectedTags : undefined,
      );
      setBody("");
      setSelectedTags([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.postFailed);
    } finally {
      setSubmitting(false);
    }
  };

  // 送信中だけ止める。未入力でも押せるようにして、押したら理由を出す。
  const isSubmitDisabled = submitting;

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        id={bodyId}
        ref={textareaRef}
        value={body}
        maxLength={5000}
        onChange={(e) => setBody(e.target.value)}
        placeholder={effectivePlaceholder}
        aria-label={effectivePlaceholder}
        rows={3}
        aria-invalid={!body.trim() && !!error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        style={{
          width: "100%",
          padding: "8px 10px",
          border: "1px solid var(--border)",
          borderRadius: 8,
          background: "var(--bg)",
          color: "var(--text)",
          fontSize: 16,
          resize: "vertical",
          fontFamily: "inherit",
          outline: "none",
        }}
      />
      {showTagOption && tags.length > 0 && (
        <fieldset style={{ border: 0, padding: 0, margin: "8px 0 0" }}>
          <legend style={inputLabelStyle}>{t.allTags}</legend>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {tags.map((tag) => {
            const active = selectedTags.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                aria-pressed={active}
                style={{
                  fontSize: 12,
                  minHeight: 44,
                  padding: "3px 10px",
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  background: active ? "var(--accent)" : "transparent",
                  color: active ? "var(--accent-text)" : "var(--text-muted)",
                  fontFamily: "inherit",
                }}
              >
                {t.tagNames[tag.name] ?? tag.name}
              </button>
            );
          })}
          </div>
        </fieldset>
      )}
      {showTagOption && tagsError && (
        <div role="alert" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, color: "var(--state-danger)", fontSize: 12 }}>
          <span>{t.tagsLoadFailed}</span>
          <button type="button" onClick={loadTags} style={{ minHeight: 44 }}>{t.retry}</button>
        </div>
      )}
      {error && (
        <p id={errorId} role="alert" aria-live="polite" style={{ color: "var(--state-danger)", fontSize: 12, margin: "4px 0 0" }}>
          {error}
        </p>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "6px 14px",
              minHeight: 44,
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "inherit",
            }}
          >
            {t.cancel}
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitDisabled}
          style={{
            background: "var(--accent)",
            color: "var(--accent-text)",
            border: "none",
            borderRadius: 8,
            padding: "7px 16px",
            minHeight: 44,
            cursor: isSubmitDisabled ? "not-allowed" : "pointer",
            opacity: isSubmitDisabled ? 0.6 : 1,
            fontWeight: 700,
            fontSize: 13,
            fontFamily: "inherit",
          }}
        >
          {submitting ? t.posting : effectiveLabel}
        </button>
      </div>
    </form>
  );
}

const inputLabelStyle: React.CSSProperties = {
  display: "block",
  margin: "0 0 4px",
  color: "var(--text-muted)",
  fontSize: 12,
  fontWeight: 700,
};
