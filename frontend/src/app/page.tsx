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

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;

    // 高速パス: localStorage に進捗があればすぐリダイレクト
    const localSlug = getLastBookSlug();
    const localProgress = localSlug ? getLocalProgress(localSlug) : null;
    if (localSlug && localProgress) {
      done.current = true;
      router.replace(`/${localSlug}/${localProgress.chapterNumber}`);
      return;
    }

    // 低速パス: 認証完了を待ってサーバー進捗を確認
    if (loading) return;

    done.current = true;

    if (!user) {
      router.replace("/matthew");
      return;
    }

    // ログイン済みかつ localStorage が空 → サーバー進捗を参照
    fetchReadingProgress()
      .then((list) => {
        const latest = list[0]; // updated_at の降順で返ってくる
        if (latest) {
          const meta = BOOKS.find((b) => b.name === latest.book_name);
          if (meta) {
            // localStorage に同期しておく（次回の高速パスに使う）
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
