"use client";

import { useState } from "react";
import Link from "next/link";
import { type Comment, fetchCommentReplies, upvoteComment, removeUpvote, deleteComment, updateComment, createCommentBookmark, removeBookmark, type Tag, reportComment } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { CommentInput } from "./CommentInput";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useT, useRelativeTime } from "@/lib/i18n";

type Props = {
  // 返信はここに含まれない。件数（reply_count）だけ持っていて、開いたときに取りに行く。
  comment: Comment;
  onReply?: (body: string, parentId: string) => Promise<void>;
  onRefresh?: () => void;
  initialBookmarkId?: string;
  depth?: number;
  // 全バージョン表示のとき、どの版のコメントかをバッジで示す。
  showVersionBadge?: boolean;
};

export function CommentItem({
  comment,
  onReply,
  onRefresh,
  initialBookmarkId,
  depth = 0,
  showVersionBadge = false,
}: Props) {
  const t = useT();
  const relTime = useRelativeTime();
  const { user } = useAuth();
  const toast = useToast();
  const [upvoted, setUpvoted] = useState(false);
  const [voteCount, setVoteCount] = useState(comment.vote_count);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [currentBody, setCurrentBody] = useState(comment.body);
  const [bookmarkId, setBookmarkId] = useState<string | null>(initialBookmarkId ?? null);
  // 返信は親を開いたときに取る。全部まとめて受け取って組み直していた頃は、
  // ページで区切ると親と返信が別ページに分かれて返信が消えていた。
  const [replies, setReplies] = useState<Comment[]>([]);
  const [repliesShown, setRepliesShown] = useState(false);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replyCount, setReplyCount] = useState(comment.reply_count);
  // 削除は取り消せないので、押しただけでは消さずに一度確認する。
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [reportStatus, setReportStatus] = useState<"idle" | "done" | "dup">("idle");

  // 投票・削除・栞・編集は一番よく押される操作なのに、失敗しても何も出ていなかった。
  // 押した結果が分からないと同じ操作を繰り返してしまうので、失敗はその場で伝える。
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
      toast.show(t.errorActionFailed, { type: "error" });
    }
  };

  const handleDelete = async () => {
    setConfirmingDelete(false);
    if (!user) return;
    try {
      await deleteComment(comment.id);
      onRefresh?.();
    } catch {
      toast.show(t.errorActionFailed, { type: "error" });
    }
  };

  const handleReply = async (body: string) => {
    if (!onReply) return;
    await onReply(body, comment.id);
    setShowReplyForm(false);
    // 一覧全体ではなく、この親の返信だけを取り直す
    await refreshReplies();
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
      toast.show(t.errorActionFailed, { type: "error" });
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
      toast.show(t.errorSaveFailed, { type: "error" });
    }
  };

  const hasChildren = replyCount > 0;

  /** 返信を取って開く。2回目以降は取り直さず開閉だけ切り替える。 */
  const loadReplies = async () => {
    if (repliesShown) {
      setRepliesShown(false);
      return;
    }
    if (replies.length === 0 && replyCount > 0) {
      setRepliesLoading(true);
      try {
        const data = await fetchCommentReplies(comment.id);
        setReplies(data);
        setReplyCount(data.length);
      } catch {
        // 取れなかったときは開かない（件数はそのまま残す）
        setRepliesLoading(false);
        return;
      } finally {
        setRepliesLoading(false);
      }
    }
    setRepliesShown(true);
  };

  /** 返信を投稿したあとに、この親の返信を取り直す。 */
  const refreshReplies = async () => {
    const data = await fetchCommentReplies(comment.id).catch(() => null);
    if (!data) return;
    setReplies(data);
    setReplyCount(data.length);
    setRepliesShown(true);
  };

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
              onClick={() => { setCollapsed((v) => !v); void loadReplies(); }}
              aria-label={collapsed ? t.expand : t.collapse}
              aria-expanded={!collapsed}
              title={collapsed ? t.expand : t.collapse}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "2px 4px",
                color: "var(--text-faint)",
                display: "inline-flex",
                alignItems: "center",
                flexShrink: 0,
                lineHeight: 1,
              }}
            >
              <Icon name={collapsed ? "chevron-right" : "chevron-down"} size={14} />
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
          {showVersionBadge && comment.version_label && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                background: "var(--accent-tint)",
                color: "var(--accent)",
                padding: "1px 7px",
                borderRadius: 999,
              }}
            >
              {comment.version_label}
            </span>
          )}
          <span style={{ color: "var(--text-faint)", fontSize: 12 }}>
            {relTime(comment.created_at)}
          </span>
          {collapsed && hasChildren && (
            <span style={{ color: "var(--text-faint)", fontSize: 12 }}>
              ({t.numReplies(replyCount)})
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
                    fontSize: 16,
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
                    {t.tagNames[tag.name] ?? tag.name}
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
                  padding: "4px 6px",
                  minHeight: 32,
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
                    padding: "4px 6px",
                    minHeight: 32,
                    fontFamily: "inherit",
                  }}
                >
                  {t.replyShort}
                </button>
              )}

              {user && !comment.is_deleted && (
                <button
                  onClick={handleBookmark}
                  aria-pressed={!!bookmarkId}
                  aria-label={bookmarkId ? t.bookmarkRemove : t.bookmarkAdd}
                  title={bookmarkId ? t.bookmarkRemove : t.bookmarkAdd}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: bookmarkId ? "var(--accent)" : "var(--text-faint)",
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "4px 6px",
                    minHeight: 32,
                    fontFamily: "inherit",
                    filter: bookmarkId ? "drop-shadow(0 0 4px var(--accent))" : undefined,
                  }}
                >
                  <Icon name="bookmark" size={15} fill={bookmarkId ? "currentColor" : "none"} />
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
                      padding: "4px 6px",
                      minHeight: 32,
                      fontFamily: "inherit",
                    }}
                  >
                    {t.edit}
                  </button>
                  <button
                    onClick={() => setConfirmingDelete(true)}
                    data-testid="delete-comment"
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-faint)",
                      fontSize: 13,
                      padding: "4px 6px",
                      minHeight: 32,
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
                    padding: "4px 6px",
                    minHeight: 32,
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

      {/* 返信は件数だけ先に出し、押したときに取りに行く（Q&A のカードと同じ作り） */}
      {!collapsed && hasChildren && !repliesShown && (
        <button
          type="button"
          onClick={loadReplies}
          disabled={repliesLoading}
          style={{
            marginLeft: depth > 0 ? 20 : 0,
            background: "transparent",
            border: "none",
            cursor: repliesLoading ? "default" : "pointer",
            color: "var(--accent)",
            fontSize: 13,
            fontWeight: 700,
            padding: "4px 0 10px",
            fontFamily: "inherit",
          }}
        >
          {repliesLoading ? t.loading : t.showReplies(replyCount)}
        </button>
      )}

      {!collapsed && repliesShown && replies.map((child) => (
        <CommentItem
          key={child.id}
          comment={child}
          onReply={onReply}
          onRefresh={onRefresh}
          depth={depth + 1}
          showVersionBadge={showVersionBadge}
        />
      ))}

      <ConfirmDialog
        open={confirmingDelete}
        title={t.confirmDeleteCommentTitle}
        description={t.confirmDeleteCommentDesc}
        confirmText={t.delete}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}
