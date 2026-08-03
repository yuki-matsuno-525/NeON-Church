"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchArticleComments,
  createArticleComment,
  deleteArticleComment,
  type ArticleComment,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { ConfirmDialog } from "@/components/ui";
import { useRelativeTime, useT } from "@/lib/i18n";

/**
 * 記事へのコメント。記事全体に対してのみ付く（記事の中の節には付かない）。
 * 節への反応は読む画面のコメント欄、記事への反応はここ、と場所を分けている。
 */
export function ArticleComments({ articleId }: { articleId: string }) {
  const t = useT();
  const formatRelativeTime = useRelativeTime();
  const { user } = useAuth();
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setComments(await fetchArticleComments(articleId));
    } catch {
      setError("コメントを読み込めませんでした。");
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadComments();
  }, [loadComments]);

  const handleSubmit = async () => {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createArticleComment(articleId, { body: text });
      setComments((prev) => [...prev, created]);
      setBody("");
    } catch {
      setError(t.articleCommentPostFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (deleteBusy) return;
    setDeleteBusy(true);
    setError(null);
    try {
      await deleteArticleComment(commentId);
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? { ...comment, is_deleted: true, body: "" }
            : comment,
        ),
      );
      setDeleting(null);
    } catch {
      setError(t.articleCommentDeleteFailed);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <section className="mt-8">
      <ConfirmDialog
        open={deleting !== null}
        title={t.articleCommentDeleteConfirmTitle}
        description={t.articleCommentDeleteConfirmDesc}
        confirmText={t.articleDeleteAction}
        destructive
        onConfirm={() => deleting && handleDelete(deleting)}
        onCancel={() => !deleteBusy && setDeleting(null)}
      />

      <h2 className="text-md font-bold mt-0 mx-0 mb-4">
        {t.articleCommentsTitle} <span className="text-faint font-normal">{comments.length}</span>
      </h2>

      {loading ? (
        <p role="status" className="text-sm text-muted">{t.loading}</p>
      ) : error && comments.length === 0 ? (
        <div role="alert" className="flex items-center flex-wrap gap-3">
          <p className="m-0 text-sm text-danger">{error}</p>
          <button type="button" onClick={() => void loadComments()} style={secondaryButtonStyle}>{t.retry}</button>
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-faint">{t.articleCommentsEmpty}</p>
      ) : (
        <div className="flex flex-col gap-3 mb-4">
          {comments.map((comment) => (
            <div key={comment.id} className="card-glow p-3" >
              <div className="flex items-center gap-2 mb-2">
                <Link href={`/profile/${comment.username}`} className="text-sm font-bold text-inherit no-underline">{comment.username}</Link>
                <time dateTime={comment.created_at} className="text-xs text-muted">
                  {formatRelativeTime(comment.created_at)}
                </time>
                {user?.username === comment.username && !comment.is_deleted && (
                  <button
                    type="button"
                    onClick={() => setDeleting(comment.id)}
                    style={{
                      marginLeft: "auto",
                      border: "none",
                      background: "none",
                      color: "var(--text-faint)",
                      fontSize: 12,
                      minHeight: 44,
                      padding: "8px 10px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {t.delete}
                  </button>
                )}
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                  color: comment.is_deleted ? "var(--text-faint)" : "var(--text)",
                }}
              >
                {comment.is_deleted ? t.deletedComment : comment.body}
              </p>
            </div>
          ))}
        </div>
      )}

      {user ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={`article-comment-${articleId}`} className="text-sm text-muted font-bold">
            この記事へのコメント
          </label>
          <textarea
            id={`article-comment-${articleId}`}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            placeholder={t.articleCommentPlaceholder}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: 10,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
              fontFamily: "inherit",
              fontSize: 16,
              resize: "vertical",
            }}
          />
          {error && <p role="alert" className="m-0 text-xs text-danger">{error}</p>}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!body.trim() || busy}
            style={{
              alignSelf: "flex-start",
              border: "none",
              borderRadius: 8,
              background: "var(--accent)",
              color: "var(--accent-text)",
              fontWeight: 700,
              fontSize: 14,
              padding: "8px 18px",
              minHeight: 44,
              cursor: !body.trim() || busy ? "default" : "pointer",
              opacity: !body.trim() || busy ? 0.6 : 1,
              fontFamily: "inherit",
            }}
          >
            {busy ? t.posting : t.articleCommentAction}
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted">
          {t.articleCommentLoginRequired}{" "}
          <Link href={`/login?from=${encodeURIComponent(`/articles/${articleId}`)}`} className="text-accent">{t.login}</Link>
        </p>
      )}
    </section>
  );
}

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: 44,
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text)",
  cursor: "pointer",
  fontFamily: "inherit",
};
