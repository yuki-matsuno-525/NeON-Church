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
import { BOOKS } from "@/lib/books";
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

      <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>
        {t.selectBook}
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 14,
        }}
      >
        {BOOKS.map((book) => (
          <Link
            key={book.slug}
            href={`/${book.slug}?list=1`}
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "20px 18px",
              border: "1px solid rgba(140, 75, 235, 0.30)",
              borderLeft: "3px solid rgba(192, 64, 240, 0.55)",
              borderRadius: 10,
              textDecoration: "none",
              color: "var(--text)",
              background: "var(--bg-alt)",
              transition: "border-color 0.18s, box-shadow 0.18s, background 0.18s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "var(--bg-hover)";
              el.style.borderColor = "rgba(192, 64, 240, 0.65)";
              el.style.boxShadow = "0 4px 20px rgba(0,0,0,0.35)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "var(--bg-alt)";
              el.style.borderColor = "rgba(140, 75, 235, 0.30)";
              el.style.boxShadow = "none";
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 16 }}>{book.short}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 5 }}>
              {book.name}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 8 }}>
              {t.totalChapters(book.totalChapters)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
