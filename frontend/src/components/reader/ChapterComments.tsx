"use client";

import { useEffect, useState } from "react";
import { fetchComments, createComment, buildCommentTree, type Comment } from "@/lib/api";
import { CommentInput } from "@/components/comments/CommentInput";
import { CommentItem } from "@/components/comments/CommentItem";

type Props = {
  chapterId: string;
  label?: string;
  commentBookmarkMap?: Record<string, string>;
};

export function ChapterComments({ chapterId, label = "章へのコメント", commentBookmarkMap = {} }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState<"new" | "votes">("new");

  const loadComments = (ord = ordering) => {
    fetchComments({ chapter_id: chapterId, ordering: ord })
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadComments(ordering);
  }, [chapterId, ordering]);

  const handleSubmit = async (body: string, isQa?: boolean) => {
    const comment = await createComment({ chapter: chapterId, body, is_qa: isQa });
    setComments((prev) => [comment, ...prev]);
  };

  const handleReply = async (body: string, parentId: string) => {
    const comment = await createComment({ chapter: chapterId, body, parent: parentId });
    setComments((prev) => [...prev, comment]);
  };

  const tree = buildCommentTree(comments);

  return (
    <section id="chapter-comments" style={{ marginTop: 40 }}>
      <hr style={{ border: "none", borderTop: "2px solid var(--border)", marginBottom: 24 }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
          {label}{" "}
          <span style={{ color: "var(--text-faint)", fontWeight: 400, fontSize: 14 }}>
            ({comments.length})
          </span>
        </h2>

        <div style={{ display: "flex", gap: 8 }}>
          {(["new", "votes"] as const).map((ord) => (
            <button
              key={ord}
              onClick={() => setOrdering(ord)}
              style={{
                fontSize: 12,
                padding: "3px 10px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                cursor: "pointer",
                background: ordering === ord ? "var(--accent)" : "transparent",
                color: ordering === ord ? "var(--accent-text)" : "var(--text-faint)",
                fontFamily: "inherit",
              }}
            >
              {ord === "new" ? "新しい順" : "人気順"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <CommentInput onSubmit={handleSubmit} showQaOption />
      </div>

      {loading ? (
        <p style={{ color: "var(--text-faint)", fontSize: 13 }}>読み込み中...</p>
      ) : tree.length === 0 ? (
        <p style={{ color: "var(--text-faint)", fontSize: 13 }}>
          コメントはまだありません
        </p>
      ) : (
        tree.map((node) => (
          <CommentItem
            key={node.id}
            comment={node}
            onReply={handleReply}
            onRefresh={() => loadComments(ordering)}
            initialBookmarkId={commentBookmarkMap[node.id]}
          />
        ))
      )}
    </section>
  );
}
