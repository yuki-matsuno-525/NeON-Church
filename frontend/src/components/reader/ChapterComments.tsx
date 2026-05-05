"use client";

import { useEffect, useState } from "react";
import { fetchComments, createComment, buildCommentTree, type Comment } from "@/lib/api";
import { CommentInput } from "@/components/comments/CommentInput";
import { CommentItem } from "@/components/comments/CommentItem";

type Props = {
  chapterId: string;
  label?: string;
};

export function ChapterComments({ chapterId, label = "章へのコメント" }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadComments = () => {
    fetchComments({ chapter_id: chapterId })
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadComments();
  }, [chapterId]);

  const handleSubmit = async (body: string) => {
    const comment = await createComment({ chapter: chapterId, body });
    setComments((prev) => [comment, ...prev]);
  };

  const handleReply = async (body: string, parentId: string) => {
    const comment = await createComment({ chapter: chapterId, body, parent: parentId });
    setComments((prev) => [...prev, comment]);
  };

  const tree = buildCommentTree(comments);

  return (
    <section style={{ marginTop: 40 }}>
      <hr style={{ border: "none", borderTop: "2px solid var(--border)", marginBottom: 24 }} />

      <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>
        {label}{" "}
        <span style={{ color: "var(--text-faint)", fontWeight: 400, fontSize: 14 }}>
          ({comments.length})
        </span>
      </h2>

      <div style={{ marginBottom: 24 }}>
        <CommentInput onSubmit={handleSubmit} />
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
            onRefresh={loadComments}
          />
        ))
      )}
    </section>
  );
}
