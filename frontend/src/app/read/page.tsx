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
import { useT, bookLabel } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";

type ResumeTarget = { slug: string; chapter: number; bookName: string } | null;

export default function ReadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();
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
        <div style={{ marginBottom: "var(--space-5)" }}>
          <Link
            href={`/${resume.slug}/${resume.chapter}`}
            className="badge"
            style={{
              background: "var(--accent-tint)",
              color: "var(--accent)",
              fontSize: "var(--font-size-sm)",
              padding: "3px 10px",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            {t.resumeReading(bookLabel(resume.slug, lang)?.name ?? resume.bookName, resume.chapter)}
          </Link>
        </div>
      )}

      {CATEGORY_ORDER
        .map((cat) => ({ cat, books: BOOKS.filter((b) => b.category === cat) }))
        .filter(({ books }) => books.length > 0)
        .map(({ cat, books }) => (
          <div key={cat} style={{ marginBottom: "var(--space-6)" }}>
            <h2 style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, margin: "0 0 var(--space-3)", color: "var(--text)" }}>
              {t.categoryNames[cat] ?? cat}
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 14,
              }}
            >
              {books.map((book) => {
                const lb = bookLabel(book.slug, lang);
                return (
                  <Link
                    key={book.slug}
                    href={`/${book.slug}?list=1`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      padding: "20px 18px",
                      border: "1px solid rgba(190, 95, 255, 0.70)",
                      borderRadius: "var(--radius-lg)",
                      textDecoration: "none",
                      color: "var(--text)",
                      background: "linear-gradient(160deg, rgba(110, 40, 200, 0.38) 0%, rgba(70, 15, 150, 0.50) 100%)",
                      boxShadow: "0 0 6px rgba(210, 110, 255, 0.40), 0 0 16px rgba(185, 80, 255, 0.20)",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = "rgba(225, 135, 255, 1.0)";
                      el.style.boxShadow = "0 0 8px rgba(230, 130, 255, 0.80), 0 0 22px rgba(185, 80, 255, 0.45)";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = "rgba(190, 95, 255, 0.70)";
                      el.style.boxShadow = "0 0 6px rgba(210, 110, 255, 0.40), 0 0 16px rgba(185, 80, 255, 0.20)";
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: "var(--font-size-md)" }}>{lb?.short ?? book.short}</span>
                    {lb?.name !== lb?.short && (
                      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
                        {lb?.name ?? book.name}
                      </span>
                    )}
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-faint)", marginTop: "var(--space-2)" }}>
                      {t.totalChapters(book.totalChapters)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
}
