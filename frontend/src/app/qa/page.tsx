"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchQAComments,
  fetchBooks,
  fetchChapters,
  fetchVerses,
  fetchTags,
  fetchCommentReplies,
  createComment,
  setBestAnswer,
  formatRelativeTime,
  type QAComment,
  type Book,
  type Chapter,
  type Verse,
  type Tag,
  type Comment,
} from "@/lib/api";
import { BOOKS } from "@/lib/books";

function getSlugByName(name: string): string | null {
  return BOOKS.find((b) => b.name === name)?.slug ?? null;
}

function buildVerseUrl(comment: QAComment): string | null {
  const slug = getSlugByName(comment.book_name);
  if (!slug) return null;
  if (comment.chapter_number) return `/${slug}/${comment.chapter_number}`;
  return `/${slug}`;
}

// ---------------------------------------------------------------------------
// 投稿フォーム
// ---------------------------------------------------------------------------
function QAPostForm({
  books,
  tags,
  onSubmitted,
  onCancel,
}: {
  books: Book[];
  tags: Tag[];
  onSubmitted: () => void;
  onCancel: () => void;
}) {
  const [body, setBody] = useState("");
  const [bookId, setBookId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [verseId, setVerseId] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId) {
      setChapters([]);
      setChapterId("");
      setVerses([]);
      setVerseId("");
      return;
    }
    fetchChapters(bookId).then(setChapters).catch(() => setChapters([]));
    setChapterId("");
    setVerses([]);
    setVerseId("");
  }, [bookId]);

  useEffect(() => {
    if (!chapterId) {
      setVerses([]);
      setVerseId("");
      return;
    }
    fetchVerses(chapterId).then(setVerses).catch(() => setVerses([]));
    setVerseId("");
  }, [chapterId]);

  const toggleTag = (id: string) =>
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createComment({
        body: body.trim(),
        is_qa: true,
        ...(verseId ? { verse: verseId } : chapterId ? { chapter: chapterId } : bookId ? { book: bookId } : {}),
        ...(tagIds.length > 0 ? { tag_ids: tagIds } : {}),
      });
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "投稿に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: "6px 10px",
    border: "1px solid var(--border)",
    borderRadius: 8,
    background: "var(--bg)",
    color: "var(--text)",
    fontSize: 13,
    fontFamily: "inherit",
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "16px 18px",
        marginBottom: 24,
        background: "var(--bg-alt)",
      }}
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="質問を入力..."
        rows={4}
        style={{
          width: "100%",
          padding: "8px 10px",
          border: "1px solid var(--border)",
          borderRadius: 8,
          background: "var(--bg)",
          color: "var(--text)",
          fontSize: 14,
          resize: "vertical",
          fontFamily: "inherit",
          outline: "none",
          boxSizing: "border-box",
        }}
      />

      {/* 場所選択 */}
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <select value={bookId} onChange={(e) => setBookId(e.target.value)} style={inputStyle}>
          <option value="">書を選択（任意）</option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        {chapters.length > 0 && (
          <select value={chapterId} onChange={(e) => setChapterId(e.target.value)} style={inputStyle}>
            <option value="">章を選択（任意）</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>{c.number}章</option>
            ))}
          </select>
        )}
        {verses.length > 0 && (
          <select value={verseId} onChange={(e) => setVerseId(e.target.value)} style={inputStyle}>
            <option value="">節を選択（任意）</option>
            {verses.map((v) => (
              <option key={v.id} value={v.id}>{v.number}節</option>
            ))}
          </select>
        )}
      </div>

      {/* タグ選択 */}
      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {tags.map((tag) => {
            const active = tagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                style={{
                  fontSize: 12,
                  padding: "3px 10px",
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  background: active ? "var(--accent)" : "transparent",
                  color: active ? "var(--accent-text)" : "var(--text-muted)",
                  fontFamily: "inherit",
                }}
              >
                {tag.name}
              </button>
            );
          })}
        </div>
      )}

      {error && <p style={{ color: "#ef4444", fontSize: 12, margin: "6px 0 0" }}>{error}</p>}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "7px 14px",
            border: "1px solid var(--border)",
            borderRadius: 8,
            background: "transparent",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: 13,
            fontFamily: "inherit",
          }}
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          style={{
            padding: "7px 16px",
            border: "none",
            borderRadius: 8,
            background: "var(--accent)",
            color: "var(--accent-text)",
            cursor: submitting || !body.trim() ? "not-allowed" : "pointer",
            opacity: submitting || !body.trim() ? 0.6 : 1,
            fontWeight: 700,
            fontSize: 13,
            fontFamily: "inherit",
          }}
        >
          {submitting ? "投稿中..." : "質問を投稿する"}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Q&A カード
// ---------------------------------------------------------------------------
function QACard({
  comment,
  currentUserId,
  onBestAnswerChange,
}: {
  comment: QAComment;
  currentUserId: string | null;
  onBestAnswerChange: () => void;
}) {
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
      setReplyError(err instanceof Error ? err.message : "投稿に失敗しました");
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
      {/* ヘッダー */}
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

      {/* 本文 */}
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{comment.body}</p>

      {/* ベストアンサー（設定済みの場合） */}
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
            ✓ ベストアンサー
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>
            {comment.best_answer.user.username} · {formatRelativeTime(comment.best_answer.created_at)}
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{comment.best_answer.body}</p>
        </div>
      )}

      {/* タグ・vote・返信ボタン */}
      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
        {comment.tags.map((t) => (
          <span
            key={t.id}
            style={{
              fontSize: 11,
              padding: "2px 7px",
              borderRadius: 999,
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            {t.name}
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
          返信 {comment.reply_count}件 {expanded ? "▲" : "▼"}
        </button>
      </div>

      {/* 返信一覧 */}
      {expanded && (
        <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          {loadingReplies ? (
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>読み込み中...</div>
          ) : replies.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>返信はまだありません。</div>
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
                          ✓ ベストアンサー
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
                          {isBest ? "解除" : "ベストアンサー"}
                        </button>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
                      {r.is_deleted ? "このコメントは削除されました" : r.body}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* 返信フォーム */}
          {currentUserId && (
            <form onSubmit={handleReplySubmit} style={{ marginTop: 10 }}>
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="返信を入力..."
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
                  {submittingReply ? "投稿中..." : "返信する"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ページ本体
// ---------------------------------------------------------------------------
export default function QAPage() {
  const { user } = useAuth();
  const [comments, setComments] = useState<QAComment[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [selectedTagId, setSelectedTagId] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    Promise.all([fetchBooks("口語訳"), fetchTags()])
      .then(([bks, tgs]) => {
        setBooks(bks);
        setTags(tgs);
      })
      .catch(() => {});
  }, []);

  const loadComments = () => {
    setLoading(true);
    fetchQAComments({
      book_id: selectedBookId || undefined,
      tag_id: selectedTagId || undefined,
    })
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetchQAComments({
      book_id: selectedBookId || undefined,
      tag_id: selectedTagId || undefined,
    })
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [selectedBookId, selectedTagId]);

  const handleBestAnswerChange = () => {
    loadComments();
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Q&A</h1>
        {user && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: "7px 16px",
              border: "none",
              borderRadius: 8,
              background: "var(--accent)",
              color: "var(--accent-text)",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            質問する
          </button>
        )}
        {!user && (
          <Link
            href="/login"
            style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}
          >
            ログインして質問する
          </Link>
        )}
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24 }}>
        聖書に関する質問・疑問のコメント一覧です。
      </p>

      {showForm && (
        <QAPostForm
          books={books}
          tags={tags}
          onSubmitted={() => {
            setShowForm(false);
            loadComments();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* フィルター */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <select
          value={selectedBookId}
          onChange={(e) => setSelectedBookId(e.target.value)}
          style={{
            padding: "6px 10px",
            border: "1px solid var(--border)",
            borderRadius: 8,
            background: "var(--bg-alt)",
            color: "var(--text)",
            fontSize: 13,
          }}
        >
          <option value="">すべての書</option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <select
          value={selectedTagId}
          onChange={(e) => setSelectedTagId(e.target.value)}
          style={{
            padding: "6px 10px",
            border: "1px solid var(--border)",
            borderRadius: 8,
            background: "var(--bg-alt)",
            color: "var(--text)",
            fontSize: 13,
          }}
        >
          <option value="">すべてのタグ</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", padding: 16 }}>読み込み中...</div>
      ) : comments.length === 0 ? (
        <div style={{ color: "var(--text-muted)", padding: 16 }}>Q&Aコメントはまだありません。</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {comments.map((c) => (
            <QACard
              key={c.id}
              comment={c}
              currentUserId={user?.id ?? null}
              onBestAnswerChange={handleBestAnswerChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
