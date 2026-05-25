"use client";

import { useState } from "react";
import Link from "next/link";
import { type CommentNode, upvoteComment, removeUpvote, deleteComment, updateComment, createCommentBookmark, removeBookmark, type Tag, reportComment } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { CommentInput } from "./CommentInput";
import { useT, useRelativeTime } from "@/lib/i18n";

type Props = {
  comment: CommentNode;
  onReply?: (body: string, parentId: string) => Promise<void>;
  onRefresh?: () => void;
  initialBookmarkId?: string;
  depth?: number;
};

export function CommentItem({
  comment,
  onReply,
  onRefresh,
  initialBookmarkId,
  depth = 0,
}: Props) {
  const t = useT();
  const relTime = useRelativeTime();
  const { user } = useAuth();
  const [upvoted, setUpvoted] = useState(false);
  const [voteCount, setVoteCount] = useState(comment.vote_count);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [currentBody, setCurrentBody] = useState(comment.body);
  const [bookmarkId, setBookmarkId] = useState<string | null>(initialBookmarkId ?? null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [reportStatus, setReportStatus] = useState<"idle" | "done" | "dup">("idle");

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

  const handleBookmark = async () => {
    if (!user) return;
    try {
      if (bookmarkId) {
        await removeBookmark(bookmarkId);
        setBookmarkId(null);
      } else {
        const bm = await createCommentBookmark(comment.id);
        setBookmarkId(bm.id);
      }
    } catch {
      // ignore
    }
  };

  const handleReport = async () => {
    try {
      await reportComment(comment.id, reportReason);
      setReportStatus("done");
      setShowReportForm(false);
    } catch (e) {
      const err = e as { status?: number };
      setReportStatus(err.status === 409 ? "dup" : "idle");
      setShowReportForm(false);
    }
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
              aria-label={collapsed ? t.expand : t.collapse}
              aria-expanded={!collapsed}
              title={collapsed ? t.expand : t.collapse}
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
          <Link
            href={`/profile/${comment.user.username}`}
            style={{ fontWeight: 700, fontSize: 13, color: "inherit", textDecoration: "none" }}
          >
            {comment.user.username}
          </Link>
          {comment.is_qa && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                background: "var(--accent)",
                color: "var(--accent-text)",
                padding: "1px 6px",
                borderRadius: 999,
                letterSpacing: "0.04em",
              }}
            >
              Q&A
            </span>
          )}
          <span style={{ color: "var(--text-faint)", fontSize: 12 }}>
            {relTime(comment.created_at)}
          </span>
          {collapsed && hasChildren && (
            <span style={{ color: "var(--text-faint)", fontSize: 12 }}>
              ({t.numReplies(comment.children.length)})
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
                    {t.save}
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
                    {t.cancel}
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
                {comment.is_deleted ? t.deletedComment : currentBody}
              </p>
            )}

            {comment.tags && comment.tags.length > 0 && (
              <div style={{ display: "flex", gap: 4, marginLeft: 52, marginBottom: 6, flexWrap: "wrap" }}>
                {comment.tags.map((tag: Tag) => (
                  <span
                    key={tag.id}
                    style={{
                      fontSize: 10,
                      padding: "1px 7px",
                      borderRadius: 999,
                      border: "1px solid var(--border)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
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
                  {t.replyShort}
                </button>
              )}

              {user && !comment.is_deleted && (
                <button
                  onClick={handleBookmark}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: bookmarkId ? "var(--accent)" : "var(--text-faint)",
                    fontSize: 13,
                    padding: 0,
                    fontFamily: "inherit",
                  }}
                >
                  {bookmarkId ? "★" : "☆"}
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
                    {t.edit}
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
                    {t.delete}
                  </button>
                </>
              )}

              {user && user.id !== comment.user.id && !comment.is_deleted && reportStatus === "idle" && (
                <button
                  onClick={() => setShowReportForm((v) => !v)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-faint)",
                    fontSize: 12,
                    padding: 0,
                    fontFamily: "inherit",
                  }}
                >
                  {t.report}
                </button>
              )}
              {reportStatus === "done" && (
                <span style={{ color: "var(--text-faint)", fontSize: 12 }}>{t.reported}</span>
              )}
              {reportStatus === "dup" && (
                <span style={{ color: "var(--text-faint)", fontSize: 12 }}>{t.reportedDup}</span>
              )}
            </div>

            {showReplyForm && (
              <div style={{ marginLeft: 52, marginTop: 8 }}>
                <CommentInput onSubmit={handleReply} placeholder={t.replyPlaceholder} submitLabel={t.replyBtn} />
              </div>
            )}

            {showReportForm && (
              <div style={{ marginLeft: 52, marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  style={{ fontSize: 12, padding: "3px 8px", border: "1px solid var(--border)", borderRadius: 4, background: "var(--bg)", color: "var(--text)", fontFamily: "inherit" }}
                >
                  <option value="spam">{t.reportReasonSpam}</option>
                  <option value="offensive">{t.reportReasonOffensive}</option>
                  <option value="misinformation">{t.reportReasonMisinformation}</option>
                  <option value="other">{t.reportReasonOther}</option>
                </select>
                <button
                  onClick={handleReport}
                  style={{ fontSize: 12, padding: "3px 10px", background: "var(--accent)", color: "var(--accent-text)", border: "none", borderRadius: 4, cursor: "pointer", fontFamily: "inherit" }}
                >
                  {t.submit}
                </button>
                <button
                  onClick={() => setShowReportForm(false)}
                  style={{ fontSize: 12, padding: "3px 10px", background: "transparent", color: "var(--text-faint)", border: "1px solid var(--border)", borderRadius: 4, cursor: "pointer", fontFamily: "inherit" }}
                >
                  {t.cancel}
                </button>
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
