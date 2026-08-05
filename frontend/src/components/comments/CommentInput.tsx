"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fetchTags, type Tag } from "@/lib/api";
import { useT } from "@/lib/i18n";

type Props = {
  onSubmit: (body: string, tagIds?: number[]) => Promise<void>;
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
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
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
          className="text-accent underline"
        >
          {t.login}
        </Link>
        {t.loginToComment}
      </p>
    );
  }

  const toggleTag = (id: number) => {
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
        className="form-control resize-y"
      />
      {showTagOption && tags.length > 0 && (
        <fieldset className="border-0 p-0 mt-2 mx-0 mb-0">
          <legend className="form-label mb-1 text-xs">{t.allTags}</legend>
          <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const active = selectedTags.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                aria-pressed={active}
                className={`pill-toggle${active ? " pill-toggle-on" : ""}`}
              >
                {t.tagNames[tag.name] ?? tag.name}
              </button>
            );
          })}
          </div>
        </fieldset>
      )}
      {showTagOption && tagsError && (
        <div role="alert" className="flex items-center gap-2 mt-2 text-danger text-xs">
          <span>{t.tagsLoadFailed}</span>
          <button type="button" onClick={loadTags} className="tap-target">{t.retry}</button>
        </div>
      )}
      {error && (
        <p id={errorId} role="alert" aria-live="polite" className="text-danger text-xs mt-1 mx-0 mb-0">
          {error}
        </p>
      )}
      <div className="flex items-center justify-end gap-3 mt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="bg-transparent border border-border rounded-md py-2 px-3 tap-target text-muted cursor-pointer text-sm"
          >
            {t.cancel}
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="btn btn-secondary"
        >
          {submitting ? t.posting : effectiveLabel}
        </button>
      </div>
    </form>
  );
}
