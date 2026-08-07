"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { fetchReadingProgress } from "@/lib/api";
import { getLastBookSlug, getLocalProgress, saveLocalProgress } from "@/lib/readingProgress";
import { BOOKS, getBookBySlug, slugFromDbName } from "@/lib/books";
import { bookLabel, useT } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";

type ResumeTarget = { slug: string; chapter: number; bookName: string };

/**
 * 「続きから読む」の導線。
 *
 * どこまで読んだかは、まずこのブラウザに残っているものを見る。無ければ
 * サーバーの読書履歴を見る。ブラウザの控えはサーバー側から読めないので、
 * ここだけはどうしても画面が出てからの処理になる。
 */
export function ResumeLink() {
  const { user, loading } = useAuth();
  const t = useT();
  const { lang } = useLang();
  const resolved = useRef(false);
  // 初期値は null 固定。localStorage はブラウザにしか無いため、初期 state で読むと
  // サーバー描画（resume 無し）と食い違って hydration エラーになる。読み取りは effect で行う。
  const [resume, setResume] = useState<ResumeTarget | null>(null);
  const [failed, setFailed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    const localSlug = getLastBookSlug();
    if (localSlug) {
      const localProgress = getLocalProgress(localSlug);
      const meta = BOOKS.find((b) => b.slug === localSlug);
      if (localProgress && meta) {
        // mount 後に localStorage から復元する意図的な更新（hydration 不一致を避けるため）。
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setResume({ slug: localSlug, chapter: localProgress.chapterNumber, bookName: meta.short });
      }
      return; // localStorage があればサーバーの読書履歴は見ない
    }
    if (resolved.current || loading) return;
    resolved.current = true;
    if (!user) return;
    fetchReadingProgress()
      .then((list) => {
        setFailed(false);
        const latest = list[0];
        if (!latest) return;
        const slug = slugFromDbName(latest.book_name);
        const meta = slug ? getBookBySlug(slug) : null;
        if (!meta) return;
        saveLocalProgress(meta.slug, {
          bookId: latest.book,
          chapterId: latest.chapter,
          chapterNumber: latest.chapter_number,
          updatedAt: latest.updated_at,
        });
        setResume({ slug: meta.slug, chapter: latest.chapter_number, bookName: meta.short });
      })
      .catch(() => setFailed(true));
  }, [loading, user, retryToken]);

  if (failed && user) {
    return (
      <div role="alert" className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-sm text-danger">{t.loadErrorDesc}</span>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            resolved.current = false;
            setRetryToken((value) => value + 1);
          }}
        >
          {t.retry}
        </button>
      </div>
    );
  }

  if (!resume) return null;

  return (
    <div className="mb-6">
      <Link
        href={`/${resume.slug}/${resume.chapter}`}
        className="badge bg-accent-tint text-accent text-sm py-1 px-3 tap-target inline-flex items-center no-underline"
      >
        {t.resumeReading(bookLabel(resume.slug, lang)?.name ?? resume.bookName, resume.chapter)}
      </Link>
    </div>
  );
}
