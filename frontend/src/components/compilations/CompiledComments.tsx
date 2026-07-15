"use client";

import { useEffect, useState } from "react";
import {
  createCompiledComment,
  fetchCompiledComments,
  type CompiledComment,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Icon } from "@/components/ui/Icon";

type Target =
  | { kind: "book"; id: string }
  | { kind: "chapter"; id: string }
  | { kind: "verse"; id: string };

type Props = {
  target: Target;
  title: string;
};

export function CompiledComments({ target, title }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CompiledComment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  const query = target.kind === "book"
    ? { book: target.id }
    : target.kind === "chapter"
      ? { chapter: target.id }
      : { verse: target.id };

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetchCompiledComments(query)
      .then((items) => alive && setComments(items))
      .catch(() => alive && setComments([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.kind, target.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || posting) return;
    setPosting(true);
    setError("");
    try {
      const comment = await createCompiledComment({ ...query, body: text });
      setComments((prev) => [comment, ...prev]);
      setBody("");
    } catch {
      setError("コメントを投稿できませんでした。");
    } finally {
      setPosting(false);
    }
  };

  return (
    <section data-testid={`${target.kind}-comments`} style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
      <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name="message-square" size={14} />
        {title}
      </h4>

      {user ? (
        <form onSubmit={submit} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 12 }}>
          <textarea
            data-testid={`${target.kind}-comment-input`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            placeholder="コメントを書く..."
            style={{
              flex: 1,
              minWidth: 0,
              padding: "8px 10px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
              fontFamily: "inherit",
              fontSize: 13,
              resize: "vertical",
            }}
          />
          <button
            data-testid={`${target.kind}-comment-submit`}
            type="submit"
            disabled={posting || !body.trim()}
            style={{
              border: "none",
              borderRadius: 6,
              background: "var(--accent)",
              color: "var(--accent-text)",
              padding: "8px 12px",
              fontSize: 13,
              fontWeight: 700,
              cursor: posting ? "default" : "pointer",
              opacity: posting ? 0.7 : 1,
              fontFamily: "inherit",
            }}
          >
            投稿
          </button>
        </form>
      ) : (
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-faint)" }}>
          ログインするとコメントできます。
        </p>
      )}

      {error && <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--state-danger)" }}>{error}</p>}

      {loading ? (
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-faint)" }}>読み込み中...</p>
      ) : comments.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-faint)" }}>まだコメントはありません。</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {comments.map((comment) => (
            <article
              key={comment.id}
              style={{
                padding: "9px 10px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--accent)", fontWeight: 700 }}>
                {comment.user.username}
              </p>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--text-muted)", whiteSpace: "pre-wrap" }}>
                {comment.is_deleted ? "削除されました。" : comment.body}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
