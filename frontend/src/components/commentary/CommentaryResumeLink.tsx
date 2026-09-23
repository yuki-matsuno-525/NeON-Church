"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/contexts/LanguageContext";
import { useT } from "@/lib/i18n";
import { commentaryPlaceHref } from "@/lib/commentary";
import { getLastCommentary, type CommentaryResume } from "@/lib/commentaryProgress";

/**
 * 解釈書の「続きから読む」。聖書の ResumeLink と同じ見た目で、「読む」の解釈書タブの上に出す。
 * どこまで読んだかはこのブラウザの控え（lib/commentaryProgress.ts）だけを見る。
 */
export function CommentaryResumeLink() {
  const t = useT();
  const { lang } = useLang();
  // 初期値は null 固定。localStorage はブラウザにしか無いので、effect で読む（hydration のずれを避ける）。
  const [resume, setResume] = useState<CommentaryResume | null>(null);

  useEffect(() => {
    // mount 後に localStorage から復元する意図的な更新。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResume(getLastCommentary());
  }, []);

  if (!resume) return null;
  const pick = (names: { ja: string; en: string }) => (lang === "en" ? names.en || names.ja : names.ja || names.en);

  return (
    <div className="mb-6">
      <Link
        href={commentaryPlaceHref({ work: resume.work, chapter: resume.chapter, number: resume.number ?? undefined })}
        className="badge bg-accent-tint text-accent text-sm py-1 px-3 tap-target inline-flex items-center no-underline"
      >
        {t.resumeCommentary(pick(resume.title), pick(resume.chapterTitle) || String(resume.chapter))}
      </Link>
    </div>
  );
}
