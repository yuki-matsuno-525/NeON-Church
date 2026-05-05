"use client";

import { useEffect, useState } from "react";
import {
  fetchComments,
  createComment,
  buildCommentTree,
  type Comment,
  type Verse,
} from "@/lib/api";
import { CommentInput } from "@/components/comments/CommentInput";
import { CommentItem } from "@/components/comments/CommentItem";

type Props = {
  verse: Verse;
  onClose: () => void;
  chapterNumber: number;
};

export function CommentPanel({ verse, onClose, chapterNumber }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadComments = () => {
    setLoading(true);
    fetchComments({ verse_id: verse.id })
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setLoading inside loadComments is intentional
    loadComments();
  }, [verse.id]);

  const handleSubmit = async (body: string) => {
    const comment = await createComment({ verse: verse.id, body });
    setComments((prev) => [comment, ...prev]);
  };

  const handleReply = async (body: string, parentId: string) => {
    const comment = await createComment({ verse: verse.id, body, parent: parentId });
    setComments((prev) => [...prev, comment]);
  };

  const tree = buildCommentTree(comments);

  return (
    <div
      className="comment-panel"
      style={{
        width: "var(--panel-width)",
        minWidth: "var(--panel-width)",
        background: "var(--bg-alt)",
        borderLeft: "1px solid var(--border)",
        height: "calc(100vh - var(--navbar-height))",
        position: "sticky",
        top: "var(--navbar-height)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>
            第{chapterNumber}章 {verse.number}節
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 13,
              color: "var(--text-muted)",
              lineHeight: 1.5,
            }}
          >
            「{verse.text.slice(0, 60)}{verse.text.length > 60 ? "…" : ""}」
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="閉じる"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-faint)",
            fontSize: 18,
            lineHeight: 1,
            padding: 0,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      {/* Comment input */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
        <CommentInput onSubmit={handleSubmit} placeholder="この節へのコメント..." submitLabel="投稿" />
      </div>

      {/* Comment list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
        {loading ? (
          <p style={{ color: "var(--text-faint)", fontSize: 13, padding: "16px 0" }}>
            読み込み中...
          </p>
        ) : tree.length === 0 ? (
          <p style={{ color: "var(--text-faint)", fontSize: 13, padding: "16px 0" }}>
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
      </div>
    </div>
  );
}
