"use client";

import { useState } from "react";
import { type CommentNode, upvoteComment, removeUpvote, deleteComment, formatRelativeTime } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { CommentInput } from "./CommentInput";

type Props = {
  comment: CommentNode;
  onReply?: (body: string, parentId: string) => Promise<void>;
  onRefresh?: () => void;
  depth?: number;
};

export function CommentItem({
  comment,
  onReply,
  onRefresh,
  depth = 0,
}: Props) {
  const { user } = useAuth();
  const [upvoted, setUpvoted] = useState(false);
  const [voteCount, setVoteCount] = useState(comment.vote_count);
  const [showReplyForm, setShowReplyForm] = useState(false);

  const handleUpvote = async () => {
    if (!user) return;
    try {
      if (upvoted) {
        await removeUpvote(comment.id);
        setVoteCount((n) => n - 1);
        setUpvoted(false);
      } else {
        await upvoteComment(comment.id);
        setVoteCount((n) => n + 1);
        setUpvoted(true);
      }
    } catch {
      // ignore
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    try {
      await deleteComment(comment.id);
      onRefresh?.();
    } catch {
      // ignore
    }
  };

  const handleReply = async (body: string) => {
    if (!onReply) return;
    await onReply(body, comment.id);
    setShowReplyForm(false);
    onRefresh?.();
  };

  return (
    <div style={{ marginLeft: depth > 0 ? 20 : 0 }}>
      <div
        style={{
          padding: "12px 0",
          borderTop: depth === 0 ? "1px solid var(--border)" : "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "var(--accent)",
              color: "var(--accent-text)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            {comment.user.username[0]?.toUpperCase() ?? "?"}
          </span>
          <span style={{ fontWeight: 700, fontSize: 13 }}>
            {comment.user.username}
          </span>
          <span style={{ color: "var(--text-faint)", fontSize: 12 }}>
            {formatRelativeTime(comment.created_at)}
          </span>
        </div>

        <p
          style={{
            margin: "0 0 8px 36px",
            fontSize: 14,
            lineHeight: 1.6,
            color: comment.is_deleted ? "var(--text-faint)" : "var(--text)",
            fontStyle: comment.is_deleted ? "italic" : "normal",
          }}
        >
          {comment.body}
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginLeft: 36,
          }}
        >
          <button
            onClick={handleUpvote}
            disabled={!user}
            style={{
              background: "transparent",
              border: "none",
              cursor: user ? "pointer" : "default",
              color: upvoted ? "var(--accent)" : "var(--text-faint)",
              fontSize: 13,
              padding: 0,
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontFamily: "inherit",
            }}
          >
            ▲ {voteCount}
          </button>

          {onReply && !comment.is_deleted && depth < 2 && (
            <button
              onClick={() => setShowReplyForm((v) => !v)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-faint)",
                fontSize: 13,
                padding: 0,
                fontFamily: "inherit",
              }}
            >
              返信
            </button>
          )}

          {!comment.is_deleted && user?.id === comment.user.id && (
            <button
              onClick={handleDelete}
              data-testid="delete-comment"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-faint)",
                fontSize: 13,
                padding: 0,
                fontFamily: "inherit",
              }}
            >
              削除
            </button>
          )}
        </div>

        {showReplyForm && (
          <div style={{ marginLeft: 36, marginTop: 8 }}>
            <CommentInput onSubmit={handleReply} placeholder="返信を入力..." submitLabel="返信" />
          </div>
        )}
      </div>

      {comment.children.map((child) => (
        <CommentItem
          key={child.id}
          comment={child}
          onReply={onReply}
          onRefresh={onRefresh}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}
