"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { fetchReadingProgress } from "@/lib/api";
import {
  getLastBookSlug,
  getLocalProgress,
  saveLocalProgress,
} from "@/lib/readingProgress";
import { BOOKS, CATEGORY_ORDER } from "@/lib/books";
import { useT } from "@/lib/i18n";

type ResumeTarget = { slug: string; chapter: number; bookName: string } | null;

export default function ReadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const t = useT();
  const resolved = useRef(false);
  const [resume, setResume] = useState<ResumeTarget>(() => {
    const localSlug = getLastBookSlug();
    const localProgress = localSlug ? getLocalProgress(localSlug) : null;
    if (localSlug && localProgress) {
      const meta = BOOKS.find((b) => b.slug === localSlug);
      if (meta) {
        return { slug: localSlug, chapter: localProgress.chapterNumber, bookName: meta.short };
      }
    }
    return null;
  });

  useEffect(() => {
    if (getLastBookSlug()) return;
    if (resolved.current || loading) return;
    resolved.current = true;
    if (!user) return;
    fetchReadingProgress()
      .then((list) => {
        const latest = list[0];
        if (latest) {
          const meta = BOOKS.find((b) => b.name === latest.book_name);
          if (meta) {
            saveLocalProgress(meta.slug, {
              bookId: latest.book,
              chapterId: latest.chapter,
              chapterNumber: latest.chapter_number,
              updatedAt: latest.updated_at,
            });
            setResume({ slug: meta.slug, chapter: latest.chapter_number, bookName: meta.short });
          }
        }
      })
      .catch(() => {});
  }, [loading, user, router]);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
      <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, marginBottom: "var(--space-5)" }}>{t.readTitle}</h1>

      {resume && (
        <Link
          href={`/${resume.slug}/${resume.chapter}`}
          className="card card-hover"
          style={{
            display: "block",
            textDecoration: "none",
            color: "inherit",
            marginBottom: "var(--space-6)",
            boxShadow: "var(--shadow-card-hover)",
            borderLeft: "3px solid var(--accent)",
          }}
        >
          <h2 style={{ fontSize: "var(--font-size-xl)", margin: 0 }}>
            {t.resumeReading(resume.bookName, resume.chapter)}
          </h2>
        </Link>
      )}

      {CATEGORY_ORDER
        .map((cat) => ({ cat, books: BOOKS.filter((b) => b.category === cat) }))
        .filter(({ books }) => books.length > 0)
        .map(({ cat, books }) => (
          <div key={cat} style={{ marginBottom: "var(--space-6)" }}>
            <div style={{ marginBottom: "var(--space-3)" }}>
              <span
                className="badge"
                style={{ background: "var(--accent-tint)", color: "var(--accent)", fontSize: "var(--font-size-sm)", padding: "3px 10px" }}
              >
                {cat}
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 14,
              }}
            >
              {books.map((book) => (
                <Link
                  key={book.slug}
                  href={`/${book.slug}?list=1`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: "20px 18px",
                    border: "1px solid var(--border)",
                    borderLeft: "3px solid var(--accent)",
                    borderRadius: "var(--radius-lg)",
                    textDecoration: "none",
                    color: "var(--text)",
                    background: "var(--bg-alt)",
                    transition: "border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out), background var(--duration-fast) var(--ease-out)",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = "var(--bg-hover)";
                    el.style.borderColor = "var(--accent)";
                    el.style.boxShadow = "var(--shadow-card)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = "var(--bg-alt)";
                    el.style.borderColor = "var(--border)";
                    el.style.boxShadow = "none";
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: "var(--font-size-md)" }}>{book.short}</span>
                  <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
                    {book.name}
                  </span>
                  <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-faint)", marginTop: "var(--space-2)" }}>
                    {t.totalChapters(book.totalChapters)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
