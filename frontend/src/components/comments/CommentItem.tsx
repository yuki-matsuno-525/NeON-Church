"use client";

import { useState } from "react";
import Link from "next/link";
import { type Comment, fetchCommentReplies, upvoteComment, removeUpvote, deleteComment, updateComment, createCommentBookmark, removeBookmark, type Tag, reportComment } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { CommentInput } from "./CommentInput";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useT, useRelativeTime } from "@/lib/i18n";
import styles from "./CommentItem.module.css";

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
  const [repliesError, setRepliesError] = useState(false);
  const [replyCount, setReplyCount] = useState(comment.reply_count);
  // 削除は取り消せないので、押しただけでは消さずに一度確認する。
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [reportStatus, setReportStatus] = useState<"idle" | "done" | "dup">("idle");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busyAction, setBusyAction] = useState<"vote" | "bookmark" | "edit" | "delete" | "report" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // 投票・削除・お気に入り・編集は一番よく押される操作なのに、失敗しても何も出ていなかった。
  // 押した結果が分からないと同じ操作を繰り返してしまうので、失敗はその場で伝える。
  const handleUpvote = async () => {
    if (!user) return;
    setBusyAction("vote");
    setActionError(null);
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
      setActionError(t.actionFailed);
    } finally {
      setBusyAction(null);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setBusyAction("delete");
    setActionError(null);
    try {
      await deleteComment(comment.id);
      onRefresh?.();
    } catch {
      setActionError(t.actionFailed);
    } finally {
      setBusyAction(null);
      setConfirmDelete(false);
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
    setBusyAction("bookmark");
    setActionError(null);
    try {
      if (bookmarkId) {
        await removeBookmark(bookmarkId);
        setBookmarkId(null);
      } else {
        const bm = await createCommentBookmark(comment.id);
        setBookmarkId(bm.id);
      }
    } catch {
      setActionError(t.bookmarkFailed);
    } finally {
      setBusyAction(null);
    }
  };

  const handleReport = async () => {
    setBusyAction("report");
    setActionError(null);
    try {
      await reportComment(comment.id, reportReason);
      setReportStatus("done");
      setShowReportForm(false);
    } catch (e) {
      const err = e as { status?: number };
      setReportStatus(err.status === 409 ? "dup" : "idle");
      setShowReportForm(false);
      if (err.status !== 409) setActionError(t.actionFailed);
    } finally {
      setBusyAction(null);
    }
  };

  const handleEditSubmit = async () => {
    if (!editBody.trim()) return;
    setBusyAction("edit");
    setActionError(null);
    try {
      await updateComment(comment.id, editBody.trim());
      setCurrentBody(editBody.trim());
      setEditing(false);
    } catch {
      setActionError(t.errorSaveFailed);
    } finally {
      setBusyAction(null);
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
      setRepliesError(false);
      try {
        const data = await fetchCommentReplies(comment.id);
        setReplies(data);
        setReplyCount(data.length);
      } catch {
        // 取れなかったときは開かない（件数はそのまま残す）
        setRepliesError(true);
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
    setRepliesError(false);
    try {
      const data = await fetchCommentReplies(comment.id);
      setReplies(data);
      setReplyCount(data.length);
      setRepliesShown(true);
    } catch {
      setRepliesError(true);
    }
  };

  return (
    <div className={depth > 0 ? "ml-4" : undefined}>
      <ConfirmDialog
        open={confirmDelete}
        title={t.confirmDeleteCommentTitle}
        description={t.confirmDeleteCommentDesc}
        confirmText={t.delete}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
      <div className={`py-3 ${depth === 0 ? "border-t border-border" : ""}`}>
        {/* 投稿者と時刻の行。左端は折りたたみボタン。 */}
        <div className={`flex items-center gap-2 ${collapsed ? "mb-0" : "mb-2"}`}>
          {hasChildren && (
            <button
              type="button"
              onClick={() => { setCollapsed((v) => !v); void loadReplies(); }}
              aria-label={collapsed ? t.expand : t.collapse}
              aria-expanded={!collapsed}
              title={collapsed ? t.expand : t.collapse}
              className="tap-target-square inline-flex shrink-0 cursor-pointer items-center border-0 bg-transparent p-0 text-faint"
            >
              <Icon name={collapsed ? "chevron-right" : "chevron-down"} size={14} />
            </button>
          )}
          {!hasChildren && <span className={styles.togglePlaceholder} />}

          <span className="avatar-circle">
            {comment.user.username[0]?.toUpperCase() ?? "?"}
          </span>
          <Link
            href={`/profile/${comment.user.username}`}
            className="text-sm font-bold text-body no-underline"
          >
            {comment.user.username}
          </Link>
          {showVersionBadge && comment.version_label && (
            <span className="badge bg-accent-tint text-accent">
              {comment.version_label}
            </span>
          )}
          <span className="text-xs text-faint">
            {relTime(comment.created_at)}
          </span>
          {collapsed && hasChildren && (
            <span className="text-xs text-faint">
              ({t.numReplies(replyCount)})
            </span>
          )}
        </div>

        {!collapsed && (
          <>
            {editing ? (
              <div className={`mb-2 ${styles.indent}`}>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={3}
                  className="form-control resize-y"
                />
                <div className="mt-1 flex gap-2">
                  <button type="button" onClick={handleEditSubmit} className="btn btn-sm btn-secondary">
                    {t.save}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditing(false); setEditBody(currentBody); }}
                    className="btn btn-sm btn-ghost"
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <p
                className={`mt-0 mb-2 text-sm leading-base ${styles.indent} ${
                  comment.is_deleted ? "text-faint italic" : "text-body"
                }`}
              >
                <span className="whitespace-pre-wrap">{comment.is_deleted ? t.deletedComment : currentBody}</span>
              </p>
            )}

            {comment.tags && comment.tags.length > 0 && (
              <div className={`mb-2 flex flex-wrap gap-1 ${styles.indent}`}>
                {comment.tags.map((tag: Tag) => (
                  <span key={tag.id} className="badge border border-border font-normal text-muted">
                    {t.tagNames[tag.name] ?? tag.name}
                  </span>
                ))}
              </div>
            )}

            <div className={`flex flex-wrap items-center gap-3 ${styles.indent}`}>
              <button
                type="button"
                onClick={handleUpvote}
                disabled={!user || busyAction === "vote"}
                aria-pressed={upvoted}
                aria-label={`${t.approve}: ${voteCount}`}
                className={`btn-text ${upvoted ? "btn-text-on" : ""}`}
              >
                ▲ {voteCount}
              </button>

              {onReply && !comment.is_deleted && depth < 2 && (
                <button
                  type="button"
                  onClick={() => setShowReplyForm((v) => !v)}
                  aria-expanded={showReplyForm}
                  className="btn-text"
                >
                  {t.replyShort}
                </button>
              )}

              {user && !comment.is_deleted && (
                <button
                  type="button"
                  onClick={handleBookmark}
                  disabled={busyAction === "bookmark"}
                  aria-pressed={!!bookmarkId}
                  aria-label={bookmarkId ? t.bookmarkRemove : t.bookmarkAdd}
                  title={bookmarkId ? t.bookmarkRemove : t.bookmarkAdd}
                  className={`btn-text ${bookmarkId ? `btn-text-on ${styles.bookmarked}` : ""}`}
                >
                  <Icon name="bookmark" size={15} fill={bookmarkId ? "currentColor" : "none"} />
                </button>
              )}

              {!comment.is_deleted && user?.id === comment.user.id && (
                <>
                  <button
                    type="button"
                    onClick={() => { setActionError(null); setEditing(true); }}
                    className="btn-text"
                  >
                    {t.edit}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    disabled={busyAction === "delete"}
                    data-testid="delete-comment"
                    className="btn-text"
                  >
                    {t.delete}
                  </button>
                </>
              )}

              {user && user.id !== comment.user.id && !comment.is_deleted && reportStatus === "idle" && (
                <button
                  type="button"
                  onClick={() => setShowReportForm((v) => !v)}
                  aria-expanded={showReportForm}
                  className="btn-text"
                >
                  {t.report}
                </button>
              )}
              {reportStatus === "done" && (
                <span role="status" aria-live="polite" className="text-xs text-faint">{t.reported}</span>
              )}
              {reportStatus === "dup" && (
                <span role="status" aria-live="polite" className="text-xs text-faint">{t.reportedDup}</span>
              )}
            </div>

            {actionError && (
              <p role="alert" aria-live="polite" className={`mt-2 mb-0 text-xs text-danger ${styles.indent}`}>
                {actionError}
              </p>
            )}

            {showReplyForm && (
              <div className={`mt-2 ${styles.indent}`}>
                <CommentInput onSubmit={handleReply} placeholder={t.replyPlaceholder} submitLabel={t.replyBtn} />
              </div>
            )}

            {showReportForm && (
              <div className={`mt-2 flex flex-wrap items-center gap-2 ${styles.indent}`}>
                <label className="sr-only" htmlFor={`report-reason-${comment.id}`}>{t.reportReasonLabel}</label>
                <select
                  id={`report-reason-${comment.id}`}
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="tap-target rounded-md border border-border bg-bg px-2 text-sm text-body"
                >
                  <option value="spam">{t.reportReasonSpam}</option>
                  <option value="offensive">{t.reportReasonOffensive}</option>
                  <option value="misinformation">{t.reportReasonMisinformation}</option>
                  <option value="other">{t.reportReasonOther}</option>
                </select>
                <button
                  type="button"
                  onClick={handleReport}
                  disabled={busyAction === "report"}
                  className="btn btn-sm btn-secondary"
                >
                  {t.submit}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReportForm(false)}
                  className="btn btn-sm btn-ghost"
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
        <div className={`pb-3 ${depth > 0 ? "ml-4" : ""}`}>
          {repliesError && (
            <span role="alert" className="mr-2 text-xs text-danger">
              {t.answersLoadFailed}
            </span>
          )}
          <button
            type="button"
            onClick={loadReplies}
            disabled={repliesLoading}
            className="btn-text btn-text-on font-bold"
          >
            {repliesLoading ? t.loading : repliesError ? t.retry : t.showReplies(replyCount)}
          </button>
        </div>
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

    </div>
  );
}
