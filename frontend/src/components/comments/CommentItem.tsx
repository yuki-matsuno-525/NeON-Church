"use client";

import { useState } from "react";
import { type CommentNode, upvoteComment, removeUpvote, deleteComment, updateComment, formatRelativeTime } from "@/lib/api";
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
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [currentBody, setCurrentBody] = useState(comment.body);

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

  const handleEditSubmit = async () => {
    if (!editBody.trim()) return;
    try {
      await updateComment(comment.id, editBody.trim());
      setCurrentBody(editBody.trim());
      setEditing(false);
    } catch {
      // ignore
    }
  };

  const hasChildren = comment.children.length > 0;

  return (
    <div style={{ marginLeft: depth > 0 ? 20 : 0 }}>
      <div
        style={{
          padding: "12px 0",
          borderTop: depth === 0 ? "1px solid var(--border)" : "none",
        }}
      >
        {/* Header row with collapse toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: collapsed ? 0 : 6,
          }}
        >
          {/* Collapse toggle (vertical line) */}
          {hasChildren && (
            <button
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "展開" : "折り畳む"}
              title={collapsed ? "展開" : "折り畳む"}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "2px 4px",
                color: "var(--text-faint)",
                fontSize: 11,
                flexShrink: 0,
                lineHeight: 1,
              }}
            >
              {collapsed ? "▶" : "▼"}
            </button>
          )}
          {!hasChildren && <span style={{ width: 20, flexShrink: 0 }} />}

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
          {collapsed && hasChildren && (
            <span style={{ color: "var(--text-faint)", fontSize: 12 }}>
              ({comment.children.length}件の返信)
            </span>
          )}
        </div>

        {!collapsed && (
          <>
            {editing ? (
              <div style={{ margin: "0 0 8px 52px" }}>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "8px",
                    fontSize: 13,
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    background: "var(--bg)",
                    color: "var(--text)",
                    resize: "vertical",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button
                    onClick={handleEditSubmit}
                    style={{
                      padding: "4px 12px",
                      fontSize: 12,
                      background: "var(--accent)",
                      color: "var(--accent-text)",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    保存
                  </button>
                  <button
                    onClick={() => { setEditing(false); setEditBody(currentBody); }}
                    style={{
                      padding: "4px 12px",
                      fontSize: 12,
                      background: "transparent",
                      color: "var(--text-faint)",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <p
                style={{
                  margin: "0 0 8px 52px",
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: comment.is_deleted ? "var(--text-faint)" : "var(--text)",
                  fontStyle: comment.is_deleted ? "italic" : "normal",
                }}
              >
                {currentBody}
              </p>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginLeft: 52,
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
                <>
                  <button
                    onClick={() => setEditing(true)}
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
                    編集
                  </button>
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
                </>
              )}
            </div>

            {showReplyForm && (
              <div style={{ marginLeft: 52, marginTop: 8 }}>
                <CommentInput onSubmit={handleReply} placeholder="返信を入力..." submitLabel="返信" />
              </div>
            )}
          </>
        )}
      </div>

      {!collapsed && comment.children.map((child) => (
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
