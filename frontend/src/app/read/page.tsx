"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fetchReadingProgress } from "@/lib/api";
import {
  getLastBookSlug,
  getLocalProgress,
  saveLocalProgress,
} from "@/lib/readingProgress";
import { BOOKS } from "@/lib/books";

export default function ReadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;

    const localSlug = getLastBookSlug();
    const localProgress = localSlug ? getLocalProgress(localSlug) : null;
    if (localSlug && localProgress) {
      done.current = true;
      router.replace(`/${localSlug}/${localProgress.chapterNumber}`);
      return;
    }

    if (loading) return;

    done.current = true;

    if (!user) {
      router.replace("/matthew");
      return;
    }

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
            router.replace(`/${meta.slug}/${latest.chapter_number}`);
            return;
          }
        }
        router.replace("/matthew");
      })
      .catch(() => router.replace("/matthew"));
  }, [loading, user, router]);

  return (
    <div style={{ padding: 32, color: "var(--text-muted)" }}>読み込み中...</div>
  );
}
