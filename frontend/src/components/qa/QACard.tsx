"use client";

import { useState } from "react";
import Link from "next/link";
import {
  fetchCommentReplies,
  createComment,
  setBestAnswer,
  formatRelativeTime,
  type QAComment,
  type Comment,
} from "@/lib/api";
import { BOOKS } from "@/lib/books";
import { useT } from "@/lib/i18n";

function getSlugByName(name: string): string | null {
  return BOOKS.find((b) => b.name === name)?.slug ?? null;
}

function buildVerseUrl(comment: QAComment): string | null {
  const slug = getSlugByName(comment.book_name);
  if (!slug) return null;
  if (comment.chapter_number) {
    const hash = comment.verse_number ? `#verse-${comment.verse_number}` : "";
    return `/${slug}/${comment.chapter_number}${hash}`;
  }
  return `/${slug}`;
}

type Props = {
  comment: QAComment;
  currentUserId: string | null;
  onBestAnswerChange: () => void;
};

export function QACard({ comment, currentUserId, onBestAnswerChange }: Props) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const url = buildVerseUrl(comment);
  const isOwner = currentUserId === comment.user.id;

  const loadReplies = () => {
    setLoadingReplies(true);
    fetchCommentReplies(comment.id)
      .then((data) => setReplies(data.slice().reverse()))
      .catch(() => setReplies([]))
      .finally(() => setLoadingReplies(false));
  };

  const handleExpand = () => {
    if (!expanded) loadReplies();
    setExpanded((v) => !v);
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setSubmittingReply(true);
    setReplyError(null);
    try {
      await createComment({ parent: comment.id, body: replyBody.trim() });
      setReplyBody("");
      loadReplies();
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : t.postFailed);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleSetBestAnswer = async (answerId: string) => {
    const next = comment.best_answer?.id === answerId ? null : answerId;
    try {
      await setBestAnswer(comment.id, next);
      onBestAnswerChange();
    } catch {
      // ignore
    }
  };

  return (
    <div
      style={{
        padding: "14px 16px",
        border: "1px solid var(--border)",
        borderRadius: 10,
        background: "var(--bg-alt)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{comment.user.username}</span>
        <span style={{ color: "var(--text-faint)", fontSize: 12 }}>
          {formatRelativeTime(comment.created_at)}
        </span>
        {url && (
          <Link
            href={url}
            style={{
              marginLeft: "auto",
              fontSize: 12,
              color: "var(--accent)",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            {comment.location_label} →
          </Link>
        )}
      </div>

      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{comment.body}</p>

      {comment.best_answer && (
        <div
          style={{
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 8,
            background: "var(--accent-tint)",
            borderLeft: "3px solid var(--accent)",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>
            {t.bestAnswer}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>
            {comment.best_answer.user.username} · {formatRelativeTime(comment.best_answer.created_at)}
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{comment.best_answer.body}</p>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
        {comment.tags.map((tag) => (
          <span
            key={tag.id}
            style={{
              fontSize: 11,
              padding: "2px 7px",
              borderRadius: 999,
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            {tag.name}
          </span>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-faint)" }}>
          ▲ {comment.vote_count}
        </span>
        <button
          onClick={handleExpand}
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            fontFamily: "inherit",
          }}
        >
          {t.repliesCount(comment.reply_count)} {expanded ? "▲" : "▼"}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          {loadingReplies ? (
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{t.loading}</div>
          ) : replies.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{t.noReplies}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {replies.map((r) => {
                const isBest = comment.best_answer?.id === r.id;
                return (
                  <div
                    key={r.id}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: `1px solid ${isBest ? "var(--accent)" : "var(--border)"}`,
                      background: isBest ? "var(--accent-tint)" : "var(--bg)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                      {isBest && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>
                          {t.bestAnswer}
                        </span>
                      )}
                      <span style={{ fontWeight: 600, fontSize: 12 }}>{r.user.username}</span>
                      <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
                        {formatRelativeTime(r.created_at)}
                      </span>
                      {isOwner && !r.is_deleted && (
                        <button
                          onClick={() => handleSetBestAnswer(r.id)}
                          style={{
                            marginLeft: "auto",
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 999,
                            border: `1px solid ${isBest ? "var(--accent)" : "var(--border)"}`,
                            background: isBest ? "var(--accent)" : "transparent",
                            color: isBest ? "var(--accent-text)" : "var(--text-muted)",
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          {isBest ? t.unsetBestAnswer : t.setBestAnswer}
                        </button>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
                      {r.is_deleted ? t.deletedComment : r.body}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {currentUserId && (
            <form onSubmit={handleReplySubmit} style={{ marginTop: 10 }}>
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder={t.replyPlaceholder}
                rows={2}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  background: "var(--bg)",
                  color: "var(--text)",
                  fontSize: 13,
                  resize: "vertical",
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {replyError && (
                <p style={{ color: "#ef4444", fontSize: 12, margin: "2px 0" }}>{replyError}</p>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                <button
                  type="submit"
                  disabled={submittingReply || !replyBody.trim()}
                  style={{
                    padding: "5px 14px",
                    border: "none",
                    borderRadius: 8,
                    background: "var(--accent)",
                    color: "var(--accent-text)",
                    cursor: submittingReply || !replyBody.trim() ? "not-allowed" : "pointer",
                    opacity: submittingReply || !replyBody.trim() ? 0.6 : 1,
                    fontWeight: 700,
                    fontSize: 12,
                    fontFamily: "inherit",
                  }}
                >
                  {submittingReply ? t.posting : t.replyBtn}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
