"use client";

import Link from "next/link";
import type { CommentaryEntry } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { chapterName, commentarySectionHref, workAuthor, workTitle } from "@/lib/commentary";
import styles from "./Commentary.module.css";

type Props = {
  entry: CommentaryEntry;
};

/**
 * 節のパネルの「解釈」タブに並べる1件。
 * 誰が・いつ・どの立場で書いたかを先に見せ、本文は抜粋だけ。全文は解釈書のページで読む。
 * 本文は英語のことが多いので lang を付ける（読み上げと改行のため）。
 */
export function CommentaryEntryCard({ entry }: Props) {
  const t = useT();
  const { lang } = useLang();
  const { work } = entry;
  const chapterTitle = chapterName({ title: entry.chapter_title, title_en: entry.chapter_title_en }, lang);
  const isAi = entry.method === "ai";

  return (
    <article className={`card-glow ${styles.entry}`} data-testid="commentary-entry">
      <div className={styles.meta}>
        <span className="badge m-0">{t.commentaryTraditions[work.tradition] ?? work.tradition}</span>
        {work.year != null && <span>{t.commentaryYear(work.year)}</span>}
        {work.language !== "ja" && <span>{t.commentaryLanguages[work.language] ?? work.language}</span>}
        {entry.method !== "structure" && (
          <span className={`badge m-0 ${isAi ? styles.aiBadge : "badge-muted"}`}>
            {t.commentaryMethods[entry.method]}
          </span>
        )}
      </div>
      <div className={styles.author}>{workAuthor(work, lang)}</div>
      <div className={styles.workTitle}>
        {workTitle(work, lang)}
        {/* 区切りなら「章の題 › 見出し」、章（講）そのものなら章の題だけ */}
        {chapterTitle && ` — ${chapterTitle}`}
        {entry.number != null && entry.heading && ` › ${entry.heading}`}
      </div>
      <p className={styles.excerpt} lang={work.language}>
        {entry.excerpt}
        {entry.truncated && "…"}
      </p>
      {isAi && entry.confidence != null && (
        <p className={styles.aiNote}>{t.commentaryAiNote(Math.round(entry.confidence * 100))}</p>
      )}
      <div className={styles.footer}>
        <Link href={commentarySectionHref(work.slug, entry.chapter_number, entry.number)} className={styles.readLink}>
          {t.commentaryReadFull} →
        </Link>
      </div>
    </article>
  );
}
