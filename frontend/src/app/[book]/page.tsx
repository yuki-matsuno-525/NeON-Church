"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchBooks, fetchChapters, fetchComments, createComment, buildCommentTree, type Chapter, type Comment } from "@/lib/api";
import { getLocalProgress } from "@/lib/readingProgress";
import { getBookBySlug } from "@/lib/books";
import { CommentInput } from "@/components/comments/CommentInput";
import { CommentItem } from "@/components/comments/CommentItem";
import { useT, useBookLabel } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { defaultTranslationForLang } from "@/lib/translations";

function BookContent() {
  const t = useT();
  const { lang } = useLang();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = typeof params.book === "string" ? params.book : "";
  const meta = getBookBySlug(slug);
  const label = useBookLabel(slug);

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

    fetchBooks(defaultTranslationForLang(lang))
      .then((books) => {
        const book = books.find((b) => b.name === meta.name);
        if (!book) throw new Error(t.bookNotFound);
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
  }, [slug, meta, router, searchParams, lang, t.bookNotFound]);

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
      <div style={{ padding: 32, color: "var(--text-muted)" }}>{t.loading}</div>
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
      <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 16px" }}>
        <Link href="/read" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
          {t.bookList}
        </Link>
        {" › "}
        <span>{label?.short ?? meta.short}</span>
      </p>

      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
        {label?.name ?? meta.name}
      </h1>

      <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12 }}>
        {t.selectChapterHeading}
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
              border: "1px solid rgba(140, 75, 235, 0.30)",
              borderRadius: 8,
              textDecoration: "none",
              color: "var(--text-muted)",
              fontWeight: 700,
              fontSize: 14,
              background: "var(--bg-alt)",
              transition: "border-color 0.18s, background 0.18s, color 0.18s, box-shadow 0.18s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "var(--accent-tint)";
              el.style.color = "var(--accent)";
              el.style.borderColor = "rgba(192, 64, 240, 0.60)";
              el.style.boxShadow = "0 0 10px rgba(192, 64, 240, 0.20)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "var(--bg-alt)";
              el.style.color = "var(--text-muted)";
              el.style.borderColor = "rgba(140, 75, 235, 0.30)";
              el.style.boxShadow = "none";
            }}
          >
            {ch.number}
          </Link>
        ))}
      </div>

      <hr style={{ border: "none", borderTop: "2px solid var(--border)", marginBottom: 24 }} />

      <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>
        {t.bookCommentsHeading}{" "}
        <span style={{ color: "var(--text-faint)", fontWeight: 400, fontSize: 14 }}>
          ({comments.length})
        </span>
      </h2>

      <div style={{ marginBottom: 24 }}>
        <CommentInput onSubmit={handleCommentSubmit} />
      </div>

      {tree.length === 0 ? (
        <p style={{ color: "var(--text-faint)", fontSize: 13 }}>{t.noCommentsYet}</p>
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

function LoadingFallback() {
  const t = useT();
  return <div style={{ padding: 32, color: "var(--text-muted)" }}>{t.loading}</div>;
}

export default function BookPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BookContent />
    </Suspense>
  );
}
