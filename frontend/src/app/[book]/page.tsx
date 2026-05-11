"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchBooks, fetchChapters, fetchComments, createComment, buildCommentTree, type Chapter, type Comment } from "@/lib/api";
import { getLocalProgress } from "@/lib/readingProgress";
import { getBookBySlug } from "@/lib/books";
import { CommentInput } from "@/components/comments/CommentInput";
import { CommentItem } from "@/components/comments/CommentItem";

export default function BookPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = typeof params.book === "string" ? params.book : "";
  const meta = getBookBySlug(slug);

  const [bookId, setBookId] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!meta) {
      router.push("/matthew");
      return;
    }

    const localProgress = getLocalProgress(slug);
    if (localProgress && searchParams.get("list") !== "1") {
      router.replace(`/${slug}/${localProgress.chapterNumber}`);
      return;
    }

    fetchBooks()
      .then((books) => {
        const book = books.find((b) => b.name === meta.name);
        if (!book) throw new Error("書が見つかりません");
        setBookId(book.id);
        return Promise.all([
          fetchChapters(book.id),
          fetchComments({ book_id: book.id }),
        ]).then(([chs, cms]) => {
          setChapters(chs);
          setComments(cms);
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleCommentSubmit = async (body: string) => {
    if (!bookId) return;
    const comment = await createComment({ book: bookId, body });
    setComments((prev) => [comment, ...prev]);
  };

  const handleReply = async (body: string, parentId: string) => {
    if (!bookId) return;
    const comment = await createComment({ book: bookId, body, parent: parentId });
    setComments((prev) => [...prev, comment]);
  };

  if (!meta) return null;

  if (loading) {
    return (
      <div style={{ padding: 32, color: "var(--text-muted)" }}>読み込み中...</div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 32, color: "#ef4444" }}>{error}</div>
    );
  }

  const tree = buildCommentTree(comments);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
        {meta.name}
      </h1>

      <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12 }}>
        章を選択
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(48px, 1fr))",
          gap: 8,
          marginBottom: 40,
        }}
      >
        {chapters.map((ch) => (
          <Link
            key={ch.id}
            href={`/${slug}/${ch.number}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 48,
              border: "1px solid var(--border)",
              borderRadius: 8,
              textDecoration: "none",
              color: "var(--text)",
              fontWeight: 700,
              fontSize: 14,
              background: "var(--bg-alt)",
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--accent-tint)";
              (e.currentTarget as HTMLElement).style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--bg-alt)";
              (e.currentTarget as HTMLElement).style.color = "var(--text)";
            }}
          >
            {ch.number}
          </Link>
        ))}
      </div>

      <hr style={{ border: "none", borderTop: "2px solid var(--border)", marginBottom: 24 }} />

      <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>
        この書へのコメント{" "}
        <span style={{ color: "var(--text-faint)", fontWeight: 400, fontSize: 14 }}>
          ({comments.length})
        </span>
      </h2>

      <div style={{ marginBottom: 24 }}>
        <CommentInput onSubmit={handleCommentSubmit} />
      </div>

      {tree.length === 0 ? (
        <p style={{ color: "var(--text-faint)", fontSize: 13 }}>コメントはまだありません</p>
      ) : (
        tree.map((node) => (
          <CommentItem
            key={node.id}
            comment={node}
            onReply={handleReply}
            onRefresh={() => {
              if (bookId) {
                fetchComments({ book_id: bookId }).then(setComments).catch(() => {});
              }
            }}
          />
        ))
      )}
    </div>
  );
}
