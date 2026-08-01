"use client";

import { useId, useState } from "react";
import Link from "next/link";
import {
  fetchCommentReplies,
  createComment,
  setBestAnswer,
  type QAComment,
  type Comment,
} from "@/lib/api";
import { slugFromDbName } from "@/lib/books";
import { Icon } from "@/components/ui/Icon";
import { formatBookLocation, useRelativeTime, useT } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";

function buildVerseUrl(comment: QAComment): string | null {
  // book_name はコメント対象の本の DB 名（訳ごとに日本語/英語が異なる）。
  // どの訳の名前からでも slug を逆引きできる slugFromDbName を使う。
  const slug = slugFromDbName(comment.book_name);
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
  onAnswerPosted?: () => void;
  onLoginRequired?: () => void;
};

export function QACard({ comment, currentUserId, onBestAnswerChange, onAnswerPosted, onLoginRequired }: Props) {
  const t = useT();
  const replyId = useId();
  const { lang } = useLang();
  const formatRelativeTime = useRelativeTime();
  const [expanded, setExpanded] = useState(false);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [answering, setAnswering] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [repliesError, setRepliesError] = useState(false);
  const [bestAnswerError, setBestAnswerError] = useState<string | null>(null);
  const [updatingBestAnswer, setUpdatingBestAnswer] = useState<string | null>(null);

  const url = buildVerseUrl(comment);
  const locationSlug = slugFromDbName(comment.book_name);
  const location = locationSlug
    ? formatBookLocation(locationSlug, comment.chapter_number, comment.verse_number, lang)
    : comment.location_label;
  const isOwner = currentUserId === comment.user.id;

  const loadReplies = () => {
    setLoadingReplies(true);
    setRepliesError(false);
    fetchCommentReplies(comment.id)
      .then((data) => setReplies(data.slice().reverse()))
      .catch(() => {
        setReplies([]);
        setRepliesError(true);
      })
      .finally(() => setLoadingReplies(false));
  };

  const handleExpand = () => {
    if (!expanded) loadReplies();
    else setAnswering(false);
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
      setAnswering(false);
      loadReplies();
      onAnswerPosted?.();
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : t.postFailed);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleAnswerClick = () => {
    if (!currentUserId) {
      onLoginRequired?.();
      return;
    }
    if (!expanded) {
      loadReplies();
      setExpanded(true);
    }
    setAnswering(true);
  };

  const handleSetBestAnswer = async (answerId: string) => {
    const next = comment.best_answer?.id === answerId ? null : answerId;
    setUpdatingBestAnswer(answerId);
    setBestAnswerError(null);
    try {
      await setBestAnswer(comment.id, next);
      onBestAnswerChange();
    } catch {
      setBestAnswerError(t.bestAnswerFailed);
    } finally {
      setUpdatingBestAnswer(null);
    }
  };

  return (
    <div
      id={`question-${comment.id}`}
      className="card-glow"
      style={{
        padding: "16px",
      }}
    >
      {/* ヘッダーは翻訳カードに合わせ、ステータスバッジと箇所リンクを右寄せで並べる。 */}
      <div style={qaCardHeaderStyle}>
        {comment.best_answer ? (
          <span
            className="badge"
            style={{ background: "rgba(34,197,94,0.15)", color: "var(--state-success)", display: "inline-flex", alignItems: "center", gap: 3, flexShrink: 0 }}
            aria-label={t.filterAnswered}
          >
            <Icon name="check-circle" size={11} />
            {t.filterAnswered}
          </span>
        ) : (
          <span
            className="badge"
            style={{ background: "rgba(245,158,11,0.15)", color: "var(--state-warning)", display: "inline-flex", alignItems: "center", gap: 3, flexShrink: 0 }}
            aria-label={t.filterUnanswered}
          >
            <Icon name="help-circle" size={11} />
            {t.filterUnanswered}
          </span>
        )}
        {url && (
          <Link href={url} style={qaLocationLinkStyle}>
            {location}
            <Icon name="chevron-right" size={12} />
          </Link>
        )}
      </div>

      {comment.title && (
        <h3 style={qaTitleStyle}>{comment.title}</h3>
      )}
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--text-muted)", whiteSpace: "pre-wrap" }}>{comment.body}</p>

      {/* 投稿者・日時・タグは翻訳カードの meta ピルと同じ見た目に揃える。 */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
        <Link href={`/profile/${comment.user.username}`} style={{ ...metaPillStyle, textDecoration: "none" }}>
          {comment.user.username}
        </Link>
        <span style={metaPillStyle}>{formatRelativeTime(comment.created_at)}</span>
        {comment.tags.map((tag) => (
          <span key={tag.id} style={metaPillStyle}>
            {t.tagNames[tag.name] ?? tag.name}
          </span>
        ))}
      </div>

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
              <Link href={`/profile/${comment.best_answer.user.username}`} style={{ color: "inherit" }}>
                {comment.best_answer.user.username}
              </Link>{" "}· {formatRelativeTime(comment.best_answer.created_at)}
            </div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{comment.best_answer.body}</p>
        </div>
      )}

      <div style={qaCardFooterStyle}>
        <span style={qaCountPillStyle}>
          <Icon name="chevron-up" size={12} />
          {comment.vote_count}
        </span>
        <button
          type="button"
          onClick={handleExpand}
          aria-expanded={expanded}
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: 999,
            cursor: "pointer",
            padding: "3px 8px",
            minHeight: 44,
            fontFamily: "inherit",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span>{t.repliesCount(comment.reply_count)}</span>
          <Icon name={expanded ? "chevron-up" : "chevron-down"} size={12} />
        </button>
        <button
          type="button"
          onClick={handleAnswerClick}
          style={{
            fontSize: 12,
            color: "var(--accent)",
            background: "var(--accent-tint)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 999,
            cursor: "pointer",
            padding: "3px 8px",
            minHeight: 44,
            fontFamily: "inherit",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Icon name="message-square" size={12} />
          {t.answerQuestion}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          {loadingReplies ? (
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{t.loading}</div>
          ) : repliesError ? (
            <div role="alert" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "var(--state-danger)" }}>{t.answersLoadFailed}</span>
              <button type="button" onClick={loadReplies} className="btn btn-ghost">{t.retry}</button>
            </div>
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
                      <Link href={`/profile/${r.user.username}`} style={{ fontWeight: 600, fontSize: 12, color: "inherit" }}>
                        {r.user.username}
                      </Link>
                      <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
                        {formatRelativeTime(r.created_at)}
                      </span>
                      {isOwner && !r.is_deleted && (
                        <button
                          type="button"
                          onClick={() => handleSetBestAnswer(r.id)}
                          disabled={updatingBestAnswer !== null}
                          aria-pressed={isBest}
                          style={{
                            marginLeft: "auto",
                            fontSize: 11,
                            padding: "2px 8px",
                            minHeight: 44,
                            borderRadius: 999,
                            border: `1px solid ${isBest ? "var(--accent)" : "var(--border)"}`,
                            background: isBest ? "var(--accent)" : "transparent",
                            color: isBest ? "var(--accent-text)" : "var(--text-muted)",
                            cursor: updatingBestAnswer ? "wait" : "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          {isBest ? t.unsetBestAnswer : t.setBestAnswer}
                        </button>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {r.is_deleted ? t.deletedComment : r.body}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {bestAnswerError && (
            <p role="alert" style={{ color: "var(--state-danger)", fontSize: 12, margin: "8px 0 0" }}>
              {bestAnswerError}
            </p>
          )}

          {currentUserId && answering && (
            <form onSubmit={handleReplySubmit} style={{ marginTop: 10 }}>
              <label htmlFor={replyId} className="sr-only">{t.replyPlaceholder}</label>
              <textarea
                id={replyId}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder={t.replyPlaceholder}
                aria-label={t.replyPlaceholder}
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
                <p role="alert" aria-live="polite" style={{ color: "var(--state-danger)", fontSize: 12, margin: "2px 0" }}>{replyError}</p>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setAnswering(false)} className="btn btn-ghost">
                  {t.cancel}
                </button>
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

const qaCardHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 6,
  marginBottom: 12,
  flexWrap: "wrap",
};

const qaTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: "var(--font-size-md)",
  fontWeight: 700,
  lineHeight: 1.45,
  margin: "0 0 var(--space-2)",
};

const qaLocationLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
  maxWidth: "100%",
  fontSize: 12,
  color: "var(--accent)",
  textDecoration: "none",
  whiteSpace: "nowrap",
};

const qaCardFooterStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  marginTop: 10,
  flexWrap: "wrap",
  alignItems: "center",
};

// 翻訳カードの metaPill と揃えた投稿者・日時・タグ用のピル。
const metaPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 44,
  padding: "2px 8px",
  borderRadius: 6,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "var(--text-muted)",
  fontSize: "var(--font-size-xs)",
};

const qaCountPillStyle: React.CSSProperties = {
  marginLeft: "auto",
  minHeight: 24,
  padding: "2px 8px",
  borderRadius: 999,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  fontSize: 12,
  color: "var(--text-muted)",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
};
