"use client";

import { useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { chapterName, workAuthor, workTitle as workTitleIn } from "@/lib/commentary";
import { matchCommentaryWork, useCommentaryWorks } from "@/hooks/useCommentaryWorks";
import { ClearableSearchInput } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { planUiText } from "@/components/plans/planUiText";
import type { PickedChapter, PickedKey } from "./ChapterPicker";
import { readingHref } from "./ReadingChips";

/**
 * プランに解釈書の章（カルヴァン ローマ書注解の8章、内村の第41講など）を足す。
 * 聖書の章を選ぶ ChapterPicker と同じ形: 本を選ぶ → 章が 1 行 1 章で並ぶ → ＋ で足す。
 */
export function CommentaryChapterPicker({
  picked,
  canAdd,
  onPick,
}: {
  picked: PickedKey[];
  canAdd: boolean;
  onPick: (chapter: PickedChapter) => void;
}) {
  const t = useT();
  const { lang } = useLang();
  const text = planUiText(lang);
  const [keyword, setKeyword] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const { works, work, loading, failed, retry } = useCommentaryWorks(slug);

  const errorBox = failed && (
    <div role="alert" className="px-3 text-xs text-danger leading-reading">
      <span>{text.chapterLoadError}</span>{" "}
      <button type="button" onClick={retry} className="link-button">{text.retry}</button>
    </div>
  );

  if (!slug) {
    const matched = works.filter((w) => matchCommentaryWork(w, keyword));
    return (
      <div role="group" aria-label={text.stepAdd}>
        <label className="block mb-2">
          <span className="sr-only">{t.commentaryFindWork}</span>
          <ClearableSearchInput
            value={keyword}
            onChange={setKeyword}
            placeholder={t.commentaryFindWork}
            ariaLabel={t.commentaryFindWork}
            inputClassName="form-control w-full"
          />
        </label>
        {errorBox}
        <div className="scroll-list">
          {matched.map((w) => (
            <div key={w.slug} className="select-row">
              <button type="button" onClick={() => setSlug(w.slug)} className="select-row-main">
                <span className="flex items-center gap-2">
                  <Icon name="book-open" size={18} color="var(--neon-purple)" />
                  <span>{workTitleIn(w, lang)}</span>
                </span>
                <span className="select-row-note">{workAuthor(w, lang)}</span>
              </button>
              <Icon name="chevron-right" size={18} color="var(--accent)" />
            </div>
          ))}
          {!loading && !failed && matched.length === 0 && (
            <p role="status" className="px-3 text-xs text-muted leading-reading">{text.noBooks}</p>
          )}
        </div>
      </div>
    );
  }

  const workTitle = work ? workTitleIn(work, lang) : "";
  return (
    <div role="group" aria-label={text.chooseChapter(workTitle)}>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <button type="button" onClick={() => setSlug(null)} className="back-button text-soft">
          {t.commentaryBackToWorks}
        </button>
        <strong className="text-sm">{workTitle}</strong>
      </div>
      {loading && <p role="status" className="px-3 text-xs text-muted leading-reading">{text.chapterLoading}</p>}
      {errorBox}
      <div className="scroll-list scroll-list-tall">
        {(work?.chapters ?? []).map((chapter) => {
          const label = chapterName(chapter, lang) || String(chapter.number);
          const added = picked.some((item) => item.work === slug && item.chapter_number === chapter.number);
          return (
            <div key={chapter.number} className="select-row">
              <div className="select-row-main">
                <span>{label}</span>
                <span className="select-row-note">{t.commentarySectionCount(chapter.section_count)}</span>
              </div>
              <Link
                href={readingHref({ book: null, work: slug, chapter_number: chapter.number, translation: "" })}
                target="_blank"
                rel="noreferrer"
                aria-label={text.openChapterLabel(label)}
                className="select-row-aside flex items-center gap-1 px-2 text-xs text-muted no-underline"
              >
                {text.openChapter}
                <Icon name="external-link" size={14} />
              </Link>
              <button
                type="button"
                onClick={() => onPick({
                  book: null,
                  work: slug,
                  book_name: workTitle,
                  chapter_number: chapter.number,
                  chapter_title: chapterName(chapter, lang),
                  translation: "",
                })}
                disabled={added || !canAdd}
                aria-label={added ? text.alreadyAdded(label) : text.addChapterLabel(label)}
                className="circle-button select-row-add"
              >
                <Icon name="plus" size={18} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
