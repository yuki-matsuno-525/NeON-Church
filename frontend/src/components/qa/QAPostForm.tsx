"use client";

import { useState } from "react";
import { fetchChapters, fetchVerses, createComment, type Book, type Chapter, type Tag, type Verse } from "@/lib/api";

type Props = {
  books: Book[];
  tags: Tag[];
  onSubmitted: () => void;
  onCancel: () => void;
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

export function QAPostForm({ books, tags, onSubmitted, onCancel }: Props) {
  const [body, setBody] = useState("");
  const [bookId, setBookId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [verseId, setVerseId] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBookChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBookId = e.target.value;
    setBookId(newBookId);
    setChapterId("");
    setChapters([]);
    setVerses([]);
    setVerseId("");
    if (newBookId) {
      fetchChapters(newBookId).then(setChapters).catch(() => setChapters([]));
    }
  };

  const handleChapterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newChapterId = e.target.value;
    setChapterId(newChapterId);
    setVerses([]);
    setVerseId("");
    if (newChapterId) {
      fetchVerses(newChapterId).then(setVerses).catch(() => setVerses([]));
    }
  };

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
        <select value={bookId} onChange={handleBookChange} style={inputStyle}>
          <option value="">書を選択（任意）</option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        {chapters.length > 0 && (
          <select value={chapterId} onChange={handleChapterChange} style={inputStyle}>
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
