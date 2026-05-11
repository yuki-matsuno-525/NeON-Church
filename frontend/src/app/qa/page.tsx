"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchQAComments, fetchBooks, fetchTags, type QAComment, type Book, type Tag } from "@/lib/api";
import { BOOKS } from "@/lib/books";
import { formatRelativeTime } from "@/lib/api";

function getSlugByName(name: string): string | null {
  return BOOKS.find((b) => b.name === name)?.slug ?? null;
}

function buildVerseUrl(comment: QAComment): string | null {
  const slug = getSlugByName(comment.book_name);
  if (!slug) return null;
  if (comment.chapter_number) return `/${slug}/${comment.chapter_number}`;
  return `/${slug}`;
}

export default function QAPage() {
  const [comments, setComments] = useState<QAComment[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [selectedTagId, setSelectedTagId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchBooks("口語訳"),
      fetchTags(),
    ]).then(([bks, tgs]) => {
      setBooks(bks);
      setTags(tgs);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchQAComments({
      book_id: selectedBookId || undefined,
      tag_id: selectedTagId || undefined,
    })
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [selectedBookId, selectedTagId]);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Q&A</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24 }}>
        聖書に関する質問・疑問のコメント一覧です。
      </p>

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
          {comments.map((c) => {
            const url = buildVerseUrl(c);
            return (
              <div
                key={c.id}
                style={{
                  padding: "14px 16px",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  background: "var(--bg-alt)",
                }}
              >
                {/* ヘッダー */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{c.user.username}</span>
                  <span style={{ color: "var(--text-faint)", fontSize: 12 }}>
                    {formatRelativeTime(c.created_at)}
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
                      {c.location_label} →
                    </Link>
                  )}
                </div>

                {/* 本文 */}
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{c.body}</p>

                {/* タグ・vote */}
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {c.tags.map((t) => (
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
                    ▲ {c.vote_count}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
