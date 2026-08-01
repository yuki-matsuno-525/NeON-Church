"use client";

import { useEffect, useState } from "react";
import {
  fetchArticleComments,
  createArticleComment,
  deleteArticleComment,
  formatRelativeTime,
  type ArticleComment,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { ConfirmDialog } from "@/components/ui";

/**
 * 記事へのコメント。記事全体に対してのみ付く（記事の中の節には付かない）。
 * 節への反応は読む画面のコメント欄、記事への反応はここ、と場所を分けている。
 */
export function ArticleComments({ articleId }: { articleId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchArticleComments(articleId).then(setComments).catch(() => {});
  }, [articleId]);

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
      setError("コメントを投稿できませんでした。");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    setDeleting(null);
    try {
      await deleteArticleComment(commentId);
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? { ...comment, is_deleted: true, body: "このコメントは削除されました。" }
            : comment,
        ),
      );
    } catch {
      setError("コメントを削除できませんでした。");
    }
  };

  return (
    <section style={{ marginTop: 40 }}>
      <ConfirmDialog
        open={deleting !== null}
        title="コメントを削除しますか？"
        description="削除すると、他の人からは「削除されました」と見えるようになります。"
        confirmText="削除する"
        destructive
        onConfirm={() => deleting && handleDelete(deleting)}
        onCancel={() => setDeleting(null)}
      />

      <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>
        コメント <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>{comments.length}</span>
      </h2>

      {comments.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-faint)" }}>まだコメントはありません。</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          {comments.map((comment) => (
            <div key={comment.id} className="card-glow" style={{ padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{comment.username}</span>
                <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
                  {formatRelativeTime(comment.created_at)}
                </span>
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
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    削除
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
                {comment.body}
              </p>
            </div>
          ))}
        </div>
      )}

      {user ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            placeholder="この記事へのコメント"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: 10,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
              fontFamily: "inherit",
              fontSize: 14,
              resize: "vertical",
            }}
          />
          {error && <p style={{ margin: 0, fontSize: 12, color: "var(--state-error)" }}>{error}</p>}
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
              cursor: !body.trim() || busy ? "default" : "pointer",
              opacity: !body.trim() || busy ? 0.6 : 1,
              fontFamily: "inherit",
            }}
          >
            {busy ? "投稿中..." : "コメントする"}
          </button>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "var(--text-faint)" }}>
          コメントするにはログインが必要です。
        </p>
      )}
    </section>
  );
}
