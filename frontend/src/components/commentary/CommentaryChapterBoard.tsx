"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CommentaryChapterBrief } from "@/lib/api";
import { useLang } from "@/contexts/LanguageContext";
import { useT } from "@/lib/i18n";
import { chapterName } from "@/lib/commentary";
import { getCommentaryProgress } from "@/lib/commentaryProgress";
import styles from "./Commentary.module.css";

type Props = {
  work: string;
  chapters: CommentaryChapterBrief[];
  /** 章が聖書の章に合わせてある本（カルヴァン注解など）なら、聖書の書のページと同じ番号の升目で出す */
  numbered: boolean;
};

/**
 * 解釈書の書のページの章の選択。最後に開いた章には、聖書の書のページと同じ印を付ける。
 * どこまで読んだかはこのブラウザの控えを見るので、ここだけ画面側で組み立てる。
 */
export function CommentaryChapterBoard({ work, chapters, numbered }: Props) {
  const t = useT();
  const { lang } = useLang();
  const [current, setCurrent] = useState<number | null>(null);

  useEffect(() => {
    // mount 後に localStorage から復元する意図的な更新（hydration のずれを避ける）。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrent(getCommentaryProgress(work)?.chapter ?? null);
  }, [work]);

  if (numbered) {
    return (
      <div className="chapter-board">
        {chapters.map((chapter) => {
          const isCurrent = chapter.number === current;
          return (
            <Link
              key={chapter.number}
              href={`/commentary/${work}/${chapter.number}`}
              title={chapterName(chapter, lang)}
              className={`chapter-cell${isCurrent ? " chapter-cell-current" : ""}`}
            >
              {chapter.number}
              {isCurrent && <span aria-label={t.currentReadingLabel} className="chapter-cell-dot" />}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <ol className={styles.chapterList}>
      {chapters.map((chapter) => {
        const isCurrent = chapter.number === current;
        return (
          <li key={chapter.number}>
            <Link
              href={`/commentary/${work}/${chapter.number}`}
              className={`${styles.chapterItem}${isCurrent ? ` ${styles.chapterItemCurrent}` : ""}`}
            >
              <span>{chapterName(chapter, lang) || chapter.number}</span>
              {isCurrent && <span className="sr-only">{t.currentReadingLabel}</span>}
              <span className={styles.chapterItemCount}>{t.commentarySectionCount(chapter.section_count)}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
